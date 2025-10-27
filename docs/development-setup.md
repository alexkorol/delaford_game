# Development Setup

Delaford historically targeted the archived 2020-era runtime stack, but the project now runs (and is tested) on current Node LTS releases. The steps below capture everything you need to get the modern toolchain working without guesswork.

## Prerequisites

- **Node.js 22.x** (current LTS) and the bundled npm 10.x.
  The repository publishes the version in multiple formats (`.nvmrc`, `.node-version`, `.tool-versions`, and the `volta` block in `package.json`) so whichever tool you use can pick it up automatically.
  - **nvm**: `nvm install` then `nvm use`
  - **nvm-windows**: `nvm install 22` then `nvm use 22`
  - **Volta**: `volta install` inside the project folder
  - **asdf**: `asdf install`
- Git, and a working C compiler toolchain if you are on Windows (needed for native node-gyp modules).

## First-time setup

1. Clone your fork and enter the directory.
   ```bash
   git clone git@github.com:YOUR_USERNAME/delaford_fork.git
   cd delaford_fork
   ```
2. Install **and select** a runtime that matches `.nvmrc` / `.tool-versions`. The fork is tested on Node.js 22 / npm 10. Examples:
   ```bash
   nvm install
   nvm use
   node -v   # v22.x
   npm -v    # 10.x
   ```
3. Install dependencies.
   ```bash
   npm install
   ```
   The install pulls both the Vite-powered client dependencies and the Express/WebSocket server dependencies. No additional post-install build is required for local development.

## Daily workflow

- Start everything with one command:
  ```bash
  npm run dev
  ```
  This runs the Vite dev server and the Express/WebSocket backend in parallel via `concurrently`. Both processes hot-reload on file changes.
- Visit `http://localhost:5173` to interact with the game client. The Express + WebSocket server listens on `http://localhost:6500`.
- Want to debug the backend only? Use `npm run dev:server`. For client-only work use `npm run dev:client`.

## Optional environment variables

| Variable | Purpose | Default |
|---|---|---|
| `SITE_URL` | Points the authentication layer at your API backend. | `http://website.test` |

## Useful commands

- `npm run test:unit` - Vitest-powered unit tests.
- `npm run test:e2e` - Playwright smoke tests against a preview build.
- `npm run lint` / `npm run lint:css` - JS/Vue and stylesheet checks.
- `npm run build` - Production client bundle.
- `npm run preview` - Serve the production build locally for smoke testing.
- `npm run dev:server` - Run the Express/WebSocket backend with nodemon reloading.

## Troubleshooting Tips

- After switching Node versions, remove `node_modules` and run `npm install` to refresh native bindings.
- Authentication relies on `SITE_URL`. Update `.env` if you host the API elsewhere.
- Clearing `node_modules` (`rm -rf node_modules`) and reinstalling often resolves residual dependency issues after switching Node versions.
