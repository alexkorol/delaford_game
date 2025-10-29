# Agent Notes for `delaford_game`

- Avoid running watch-mode or long-lived processes (`npm run dev`, `npm run dev:server`, `npm run dev:client`) without a short timeout. If you must probe them, wrap commands with `timeout`/`--timeout` so the session doesn’t hang.
- Prefer lightweight checks (e.g. `npm run test:unit`, linting with `--max-warnings`, or `node --check`) when verifying changes.
- Never leave `powershell` processes running nodemon/Express; always stop them promptly or rely on the user to launch the dev servers.
- When surfacing run commands to the user, provide instructions rather than executing the long-running server yourself.*** End Patch
