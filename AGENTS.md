# Agent guide

Einstein: Spotlight-like launcher, plugin ecosystem. Today: Electron + Node + vm2 plugins (see `README.md`). Decisions planned in RFCs ([RFC 0001](docs/rfc/0001-rfc-process.md)).

## Rules
- Decisions (new/changed behavior, interfaces, architecture, significant deps, process) need `accepted` RFC. None → draft via `rfc-create` skill, stop for human approval.
- Fixes, no-behavior-change refactors, dep bumps, CI maintenance, doc corrections: no RFC, but must not contradict one. Unsure → ask.
- Only human passes gate, via `/rfc-cascade NNNN`. Never set `accepted`, or `implemented` on RFC with `gates: accept, verify`, any other way (RFC-0001/R23).
- Recording decision already in code: retroactive RFC (`retroactive: <commit>`, written as `implemented`, no tests), shown to human before commit.
- RFC editing depends on publication (on `dev`, or pushed branch with non-draft PR): unpublished → amend in place; published `accepted` → additions only; published `implemented` → status, `superseded-by`, Errata only.
- English = source; every RFC, `README.md`, `docs/**/*.md` has `.zh-tw.md` (`translate` skill).
- Test names cite requirements: `RFC-NNNN/Rn: <why it matters>`.
- Tests black-box: drive public entry points (CLI, processes, plugin API, files, process-boundary messages), assert outcomes requirement states. No internal modules, signatures, arg lists or exact formats unless requirement fixes them.
- Deno-stack tests: TypeScript `*.test.ts` for `deno test`, `describe`/`it` from `jsr:@std/testing/bdd`, asserts from `jsr:@std/assert`. Node tests (`node:test`) only for Node tooling (`.bin/`, Electron stack).
- Test location mirrors `src/`: `src/<dir>/<module>.ts` → `tests/<dir>/<module>.test.ts`; tests of files outside `src/` mirror their path (e.g. `tests/native/gpui-native/`).
- Commit per stage, conventional style: `docs(rfc): …`, `docs(agents): …`, `test(…): …`, `feat(…): …`, `docs: …`.
- Match existing code style (Prettier, ESLint, tabs). Concise comments: only non-obvious why.
- `CLAUDE.md` is symlink to this file; keep it.
- Agent-only docs (`AGENTS.md`, `.agents/`, `.claude/skills/`) caveman-compressed: after substantial edit, run `/caveman-compress` on file (on `AGENTS.md`, never `CLAUDE.md`); small edits in same style. Never compress RFCs, `README.md`, `docs/` (RFC-0001/R25).

## Layout
- Electron stack (all platforms): `src/main/`, `src/omniSearch/`, `src/sharedProcess/`, `src/pluginHost.node/`. Unchanged until later RFCs.
- Deno stack (Linux, RFC 0008): `src/main.deno/` (hub), `src/ui.deno/` (gpui-native UI), `src/pluginHost.deno/` (Workers, preload, broker). `*.deno/` never import Electron.
- Shared by both: `src/api/` (plugin API), `src/common/` (MessageTunnel, message types). No Electron-, Node- or Deno-only APIs there, except per-runtime transport adapters.
- gpui-native: pin in `native/gpui-native/upstream.json`, changes only as `native/gpui-native/patches/*.patch`. Never edit an upstream checkout; regenerate patch instead.

## Commands
- `npm test` — Node tests (`node:test`, `tests/**/*.test.mjs`)
- `deno task test` — Deno-stack tests (RFC-0008/R20)
- `npm run docs:check` — RFC + docs rules (RFC-0001/R14)
- `npm run docs:index` — regenerate RFC index in `docs/rfc/README.md` (RFC-0001/R19)
- `npm run rfc:new -- <kebab-title>`, `npm run rfc:status -- NNNN <status>` — create RFC, change status (RFC-0001/R24)
- `npm run lint`, `npm run build`

## Skills
- [rfc-create](.claude/skills/rfc-create/SKILL.md) — discuss, draft, grill RFC with developer (stage 1)
- [rfc-cascade](.claude/skills/rfc-cascade/SKILL.md) — human only: move RFC to next gate (stages 2–5)
- [translate](.claude/skills/translate/SKILL.md) — write + stamp `.zh-tw.md` translations