# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: track-order-mobile.spec.ts >> Track Order page — mobile layout >> search form submits and result card renders without horizontal scroll
- Location: tests/track-order-mobile.spec.ts:42:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=4271
[pid=4271][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=4271
  - [pid=4271][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=4271] <gracefully close start>
  - [pid=4271] <kill>
  - [pid=4271] <will force kill>
  - [pid=4271] <process did exit: exitCode=127, signal=null>
  - [pid=4271] starting temporary directories cleanup
  - [pid=4271] finished temporary directories cleanup
  - [pid=4271] <gracefully close end>

```