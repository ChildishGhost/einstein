---
name: translate
description: Write or update the Traditional Chinese (zh-tw) translation of an Einstein RFC, README.md or docs/**/*.md and stamp it with the source hash (RFC-0001/R2). Use when a source changed or docs:check reports a missing or stale translation.
argument-hint: <path/to/name.md>
---
# Translate

Translate `$ARGUMENTS` into `name.zh-tw.md` beside it. Required for every RFC, `README.md`, `docs/**/*.md`; not `AGENTS.md`, `.agents/`, `.claude/`.

- Traditional Chinese (Taiwan). English file only source: add nothing not in it.
- First line `<!-- source-sha256: … -->`, then note linking source:
  `> 本文為 [name.md](name.md) 的翻譯，內容以英文版為準。`
- Keep code, identifiers, front-matter keys + values, requirement IDs unchanged.
- Update stale translation: find source changes since translation last touched — `git log -1 --format=%h -- <name.zh-tw.md>`, then `git diff <that commit> -- <name.md>` (plus uncommitted changes).
- Content matches → stamp: `node .bin/sync-translation.mjs <name.zh-tw.md>`. Stamp without translating hides staleness — never do.