#!/usr/bin/env bash
# Volume benchmark for GET /api/admin/orders/archive/export:
# times the export, probes /api/healthz concurrently (server responsiveness),
# and samples api-server RSS (memory pressure while zipping).
set -u
cd /home/runner/workspace
OUT=.e2e-delete-flow
mkdir -p "$OUT"
TODAY=$(date +%F)

TOKEN=$(curl -s -X POST http://localhost:80/api/admin/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token||''))")
[ -n "$TOKEN" ] || { echo "LOGIN FAILED"; exit 1; }

PID=$(pgrep -f 'enable-source-maps ./dist/index.mjs' | head -1)
RSS0=$(ps -o rss= -p "$PID" | tr -d ' ')
echo "api-server pid=$PID rss_before=${RSS0}KB"

rm -f "$OUT/probe.log" "$OUT/rss.log"
(
  while true; do
    curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://localhost:80/api/healthz >> "$OUT/probe.log" 2>/dev/null
    ps -o rss= -p "$PID" >> "$OUT/rss.log" 2>/dev/null
    sleep 0.4
  done
) &
PROBE=$!
sleep 1

T0=$(date +%s%N)
HTTP=$(curl -s -w "%{http_code}" -D "$OUT/api-headers.txt" -o "$OUT/api-archive.zip" \
  "http://localhost:80/api/admin/orders/archive/export?fromDate=$TODAY&toDate=$TODAY" \
  -H "Authorization: Bearer $TOKEN")
T1=$(date +%s%N)
sleep 1
kill "$PROBE" 2>/dev/null
wait "$PROBE" 2>/dev/null

echo "export http=$HTTP wall=$(( (T1 - T0) / 1000000 ))ms zip_bytes=$(stat -c %s "$OUT/api-archive.zip")"
echo "--- headers:"
grep -i "^HTTP/\|x-archive-deletable\|content-type" "$OUT/api-headers.txt"
RECEIPT_LEN=$(grep -i "^x-archive-receipt" "$OUT/api-headers.txt" | wc -c)
echo "receipt header length: $RECEIPT_LEN"
echo "--- responsiveness during export:"
TOTAL=$(wc -l < "$OUT/probe.log")
NON200=$(awk '$1 != 200' "$OUT/probe.log" | wc -l)
MAX=$(awk '{print $2}' "$OUT/probe.log" | sort -g | tail -1)
P50=$(awk '{print $2}' "$OUT/probe.log" | sort -g | awk '{a[NR]=$1} END{print a[int((NR+1)/2)]}')
echo "probes=$TOTAL non200=$NON200 latency_p50=${P50}s max=${MAX}s"
echo "rss_after=$(ps -o rss= -p "$PID" | tr -d ' ')KB peak_during=$(sort -g "$OUT/rss.log" | tail -1 | tr -d ' ')KB"
