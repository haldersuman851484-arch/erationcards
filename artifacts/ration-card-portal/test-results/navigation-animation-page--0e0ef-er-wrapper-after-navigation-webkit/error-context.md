# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation-animation.spec.ts >> page-enter animation wrapper >> Track page has .page-enter wrapper after navigation
- Location: tests/navigation-animation.spec.ts:16:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=4229
[pid=4229][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=4229
  - [pid=4229][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=4229] <gracefully close start>
  - [pid=4229] <kill>
  - [pid=4229] <will force kill>
  - [pid=4229] <process did exit: exitCode=127, signal=null>
  - [pid=4229] starting temporary directories cleanup
  - [pid=4229] finished temporary directories cleanup
  - [pid=4229] <gracefully close end>

```