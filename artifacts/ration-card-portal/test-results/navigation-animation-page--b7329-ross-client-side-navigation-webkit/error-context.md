# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation-animation.spec.ts >> page-enter animation wrapper >> .page-enter wrapper persists across client-side navigation
- Location: tests/navigation-animation.spec.ts:23:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=4250
[pid=4250][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/workspace/.cache/ms-playwright/webkit-2311/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=4250
  - [pid=4250][err] /home/runner/workspace/.cache/ms-playwright/webkit-2311/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=4250] <gracefully close start>
  - [pid=4250] <kill>
  - [pid=4250] <will force kill>
  - [pid=4250] exception while trying to kill process: Error: kill ESRCH
  - [pid=4250] <process did exit: exitCode=127, signal=null>
  - [pid=4250] starting temporary directories cleanup
  - [pid=4250] finished temporary directories cleanup
  - [pid=4250] <gracefully close end>

```