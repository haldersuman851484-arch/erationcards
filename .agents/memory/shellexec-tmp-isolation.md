---
name: ShellExec /tmp isolation
description: Files written to /tmp in one ShellExec call are not visible in later calls.
---

# ShellExec /tmp isolation

**Rule:** In this workspace, files created under `/tmp` by one ShellExec command are gone in the next ShellExec call (only `/tmp/logs` from the log system persists). Multi-step shell tests that need fixture files (test PDFs, images) must create them inside the same command that uses them, or write them under the workspace instead.

**Why:** A curl multipart upload silently failed (`curl exit 26`, http_code 000) because the fixture PDF written by an earlier ShellExec call no longer existed; the failure looked like a server bug and cost a debugging round.

**How to apply:** When scripting curl/e2e checks across multiple ShellExec calls, regenerate fixtures per call or use a workspace path (e.g. `/home/runner/workspace/.cache/`).

**Background processes die too:** a `nohup node … &` launched in one ShellExec call is killed before the next call (a Playwright run waiting for an input file died silently mid-wait). Long-running scripted browser/e2e runs must complete inside a single foreground ShellExec command — pre-stage every input they need (e.g. OTP codes pulled from logs) *before* launching, instead of pausing the script mid-run.

**`&` binds the whole `&&` chain:** `cd x && npm i && node server & PID=$!` backgrounds EVERYTHING including the install — foreground curls then hit nothing. Run setup as its own foreground command; start the server with `&` only as the first token's own simple command on a fresh line.
