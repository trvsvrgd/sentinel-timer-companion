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

- **`prebuild` script**: The `prebuild` npm script calls `taskkill` (Windows-only). It will fail on Linux but is swallowed by `|| exit 0`. This is harmless.

### Gotchas

- The Vite dev server binds to `::` (all interfaces) on port 8080.
- No automated test suite exists — there are no `test` scripts in `package.json`.
- The project has no `.nvmrc` or `.node-version`; Node.js 20+ is required (22 works fine).
