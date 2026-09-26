---
rfc: 0006
title: Build, toolchain and distribution
status: implemented
created: 2026-09-26
references: [0001, 0002, 0003]
retroactive: db39f26
---

# RFC 0006: Build, toolchain and distribution

## Summary
Records how Einstein is built, checked and shipped at `db39f26`: TypeScript bundled by one webpack run into five targets, a downloaded Electron runtime with the app copied in unpacked, lint and format rules, CI that builds on Linux, and the LGPL-3.0 license.

## Motivation
Recording the toolchain and distribution promises makes clear what users and contributors rely on.

## Requirements

### Toolchain
- **R1** — Source is TypeScript; `@/*` maps to `src/*`, and the public API is imported as `einstein` (never `@/api`), enforced by lint.
- **R2** — Node is pinned by `.node-version` (24.14.0); npm with a lockfile is the package manager.
- **R3** — One `npm run build` runs a single webpack invocation over five configs: `main` (target `electron-main`), `renderer` (Vue 3, one HTML page per window), `node` (the plugin host, RFC-0002/R3), `api` (the typed `einstein` package, RFC-0003/R17) and `plugins` (one bundle per `plugins/<name>`, with `einstein` and `fuse.js` external, RFC-0003/R5).
- **R4** — Dependencies are patched with `patch-package` on install; vm2 is patched to allow `process`/`os` (a known gap in RFC 0003) and to load its own files after bundling.

### Distribution
- **R5** — `npm run build:electron` downloads the Electron release matching the `electron` devDependency for the host (or `ELECTRON_PLATFORM`/`ELECTRON_ARCH`), caches it under `node_modules/.einstein`, and copies the built app unpacked into its `resources/app` (macOS: inside `Electron.app`). The result is `dist/electron/`.
- **R6** — The only supported installation is building from source; the built app can also run on a system Electron (`electron dist/electron/resources/app`).
- **R7** — There are no installers, code signing, asar archives, releases or auto-update.

### Code style
- **R8** — Tabs (width 2), LF, UTF-8, final newline (`.editorconfig`); Prettier with 120 columns, single quotes, no semicolons, trailing commas; ESLint (typescript-eslint, vue, prettier) with ordered, extension-less imports.

### CI and repository
- **R9** — CI (GitHub Actions) runs on push, pull request and manual dispatch, on Ubuntu only: `npm ci` (also in `plugins/desktop`), lint, build. No artifacts are published. CodeQL scans JavaScript; Dependabot updates root npm dependencies weekly.
- **R10** — Einstein is licensed under the GNU LGPL v3.
- **R11** — The README describes Einstein as a cross-platform, Spotlight-like launcher with a plugin ecosystem, documents the npm scripts, and credits albert, Alfred, Electron, Fuse.js and Vue.

## Design
- Build output layout: `dist/{main,renderer,node,plugins,api}`; the app finds its files relative to that directory (RFC-0002/R17).
- `plugins/desktop` has its own lockfile because it depends on `file-icon`.

### Known gaps at `db39f26` (not decisions)
- No tests and no test step in CI.
- CI covers Linux only, though the README claims cross-platform and plugins claim macOS.
- `@types/node` targets Node 16; several dev dependencies look unused.
- Dependabot does not cover `plugins/desktop`.
- No copyright notice besides the license text.

## Verification
Retroactive (RFC-0001/R16): describes the code at `db39f26`; exempt from test coverage. Later RFCs that change these requirements list them under "Relation to earlier RFCs".
