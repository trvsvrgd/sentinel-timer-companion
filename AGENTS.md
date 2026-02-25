# Sentinel Timer - Dota 2 Timer Companion

## Cursor Cloud specific instructions

### Overview

Single-service React + TypeScript + Vite web application (with optional Electron desktop shell). No database, no backend API, no Docker required. See `README.md` for full project details.

### Running the app

- **Web dev server**: `npm run dev` — serves on port 8080
- **Electron dev**: `npm run electron:dev` (not usable in headless Cloud VM)

### Build & Lint

- **Build**: `npm run build`
- **Lint**: `npm run lint`

### Known issues

- **ESLint crash**: The lockfile pins `eslint@9.39.2` with `typescript-eslint@8.11.0`, which are incompatible. ESLint's `no-unused-expressions` rule changed its internal API in 9.39.x, breaking `@typescript-eslint/no-unused-expressions`. `npm run lint` will error with `TypeError: Cannot read properties of undefined (reading 'allowShortCircuit')`. To fix, the lockfile needs regenerating with compatible versions.
- **Peer dependency conflict**: `@vitejs/plugin-react-swc@^3.5.0` declares `peer vite@"^4 || ^5"`, but the project uses `vite@^7.3.1`. Use `--legacy-peer-deps` when running `npm ci` or `npm install`.
- **`prebuild` script**: The `prebuild` npm script calls `taskkill` (Windows-only). It will fail on Linux but is swallowed by `|| exit 0`. This is harmless.

### Gotchas

- The Vite dev server binds to `::` (all interfaces) on port 8080.
- No automated test suite exists — there are no `test` scripts in `package.json`.
- The project has no `.nvmrc` or `.node-version`; Node.js 20+ is required (22 works fine).
