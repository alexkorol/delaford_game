# Development Setup

Delaford targets the archived 2020-era runtime stack. The steps below capture everything you need to reproduce that environment on any machine without guesswork.

## Prerequisites

- **Node.js 10.24.1** and **npm 6.14.4**  
  The repository publishes the version in multiple formats (`.nvmrc`, `.node-version`, `.tool-versions`, and the `volta` block in `package.json`) so whichever tool you use can pick it up automatically.
  - **nvm**: `nvm install` then `nvm use`
  - **nvm-windows**: `nvm install 10.24.1` then `nvm use 10.24.1`
  - **Volta**: `volta install` inside the project folder
  - **asdf**: `asdf install`
- Git, and a working C compiler toolchain if you are on Windows (needed for `node-sass`).

## First-time setup

1. Clone your fork and enter the directory.
   ```bash
   git clone git@github.com:YOUR_USERNAME/game.git
   cd game
   ```
2. Install the pinned runtime (`nvm use`, `volta install`, etc.).
3. Install dependencies.
   ```bash
   npm ci
   ```
   The local install skips heavy production builds automatically. When you need them (for releases or manual verification) run:
   ```bash
   npm run build-server && npm run build
   ```
   or reinstall with `DELAFORD_RUN_BUILD=1 npm install`.

## Daily workflow

- Start everything with one command:
  ```bash
  npm run dev
  ```
  This runs the client (`npm run serve`) and the websocket server (`npm run dev:node`) in parallel. Both processes hot-reload on file changes.
- Visit `http://localhost:8080` to interact with the game. The websocket server binds to port `9000`, and the Express wrapper serves on port `6500`.
- Want to debug the backend only? Use `npm run dev:node`. For client-only work use `npm run serve`.

## Optional environment variables

| Variable | Purpose | Default |
|---|---|---|
| `SITE_URL` | Points the authentication layer at your API backend. | `http://website.test` |
| `DELAFORD_SKIP_BUILD` | Force-skip postinstall builds even in CI. Accepts `1`, `true`, `yes`, `on`. | `false` |
| `DELAFORD_RUN_BUILD` | Force the postinstall script to run `build-server` and `build`. | `false` |

## Useful commands

- `npm run test:unit` - Vue unit tests via Jest.
- `npm run lint` / `npm run lint:css` - JS and Vue style checks.
- `npm run server:prod` - Run the already-built server bundle.
- `npm run build-server && npm run build` - Manual production build.
- `npm run ndb` - Launch the Node debugger experience powered by Chrome DevTools.

## Troubleshooting Tips

- If `node-sass` fails to build on Windows, confirm you are using Node 10.24.1 and install the Windows Build Tools (`npm install --global --production windows-build-tools`), then rerun `npm rebuild node-sass --force`.
- Authentication relies on `SITE_URL`. Update `.env` if you host the API elsewhere.
- Clearing `node_modules` (`rimraf node_modules`) and reinstalling often resolves residual dependency issues after switching Node versions.
