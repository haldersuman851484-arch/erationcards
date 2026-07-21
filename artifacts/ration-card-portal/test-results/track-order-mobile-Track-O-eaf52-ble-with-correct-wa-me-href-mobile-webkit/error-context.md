# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: track-order-mobile.spec.ts >> Track Order page — mobile layout >> WhatsApp notify button is visible with correct wa.me href
- Location: tests/track-order-mobile.spec.ts:72:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=4292
[pid=4292][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=4292
  - [pid=4292][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=4292] <gracefully close start>
  - [pid=4292] <kill>
  - [pid=4292] <will force kill>
  - [pid=4292] exception while trying to kill process: Error: kill ESRCH
  - [pid=4292] <process did exit: exitCode=127, signal=null>
  - [pid=4292] starting temporary directories cleanup
  - [pid=4292] finished temporary directories cleanup
  - [pid=4292] <gracefully close end>

```