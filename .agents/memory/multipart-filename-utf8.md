---
name: Multipart filename encoding
description: multer/busboy delivers UTF-8 upload filenames as latin1 mojibake; how to recover them safely.
---

# Multipart filename encoding

**Rule:** `req.file.originalname` from multer is latin1-decoded while browsers/curl send UTF-8 bytes, so any non-ASCII filename (Bengali names are a core case for this user base) arrives as mojibake (`রেশন` → `à¦°à§‡...`). Recover it with a guarded re-decode before using the name:

```ts
const utf8 = Buffer.from(originalname, "latin1").toString("utf8");
if (!utf8.includes("\uFFFD")) originalname = utf8; // identity for ASCII; guard keeps original if bytes aren't valid UTF-8
```

**Why:** Hit while preserving customers' original PDF filenames — the stored/displayed name was garbage for Bengali filenames until re-decoded. Verified: after the fix the exact name survives storage, DB, URL (percent-encoded), and Content-Disposition (`filename*=UTF-8''...` per RFC 5987, with an ASCII-underscore fallback `filename=`).

**How to apply:** Any future feature reading `originalname` from a multipart upload (multer/busboy) in this project must apply the same re-decode, and any download endpoint sending non-ASCII names needs the RFC 5987 `filename*` form.
