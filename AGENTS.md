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
- Commit per stage, conventional style: `docs(rfc): …`, `docs(agents): …`, `test(…): …`, `feat(…): …`, `docs: …`.
- Match existing code style (Prettier, ESLint, tabs). Concise comments: only non-obvious why.
- `CLAUDE.md` is symlink to this file; keep it.
- Agent-only docs (`AGENTS.md`, `.agents/`, `.claude/skills/`) caveman-compressed: after substantial edit, run `/caveman-compress` on file (on `AGENTS.md`, never `CLAUDE.md`); small edits in same style. Never compress RFCs, `README.md`, `docs/` (RFC-0001/R25).

## Commands
- `npm test` — tests (`node:test`, `test/**/*.test.mjs`)
- `npm run docs:check` — RFC + docs rules (RFC-0001/R14)
- `npm run docs:index` — regenerate RFC index in `docs/rfc/README.md` (RFC-0001/R19)
- `npm run rfc:new -- <kebab-title>`, `npm run rfc:status -- NNNN <status>` — create RFC, change status (RFC-0001/R24)
- `npm run lint`, `npm run build`

## Skills
- [rfc-create](.claude/skills/rfc-create/SKILL.md) — discuss, draft, grill RFC with developer (stage 1)
- [rfc-cascade](.claude/skills/rfc-cascade/SKILL.md) — human only: move RFC to next gate (stages 2–5)
- [translate](.claude/skills/translate/SKILL.md) — write + stamp `.zh-tw.md` translations