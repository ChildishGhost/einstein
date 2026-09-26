---
rfc: 0001
title: RFC-driven development process
status: implemented
created: 2026-09-26
references: [0000]
---

# RFC 0001: RFC-driven development process

## Summary
Every decision starts as an RFC in `docs/rfc/` and moves through five stages — draft, accept, implement, document, verify — with human approval at acceptance and at completion. Agents follow the stages through project skills; only a human passes a gate. Changes that make no decision need no RFC.

## Motivation
The GPUI migration spans several subsystems and agents do most of the implementation. Plans, tests, agent instructions and human docs must stay traceable to one approved source.

## Requirements

### Scope
- **R20** *(manual)* — An RFC is required for decisions: new or changed behavior, public or plugin interfaces, architecture, significant dependencies, and this process. Bug fixes restoring specified behavior, refactors without behavior change, dependency bumps, CI maintenance and doc corrections need no RFC, but must not contradict an accepted RFC.

### Files
- **R1** — RFCs live in `docs/rfc/NNNN-kebab-title.md`, numbered from `0001` (`0000` is the template). Other files there (`README.md`, translations) are not RFCs.
- **R2** — Each RFC has a translation `NNNN-kebab-title.zh-tw.md`. The English file is the only source; a translation starts with `<!-- source-sha256: <hash of the English file> -->` and is stale when the hash differs.
- **R3** — Front-matter fields: `rfc`, `title`, `status`, `created`, `references`; optional `supersedes`, `superseded-by`, `retroactive`, `gates` (`accept` or `accept, verify`).
- **R21** *(manual)* — Required sections: Summary, Motivation, Requirements, Design, Verification, and "Relation to earlier RFCs" when R17 applies. Alternatives, Migration and compatibility, Unresolved questions and Errata may be omitted when empty.
- **R26** *(manual)* — Requirements state what the system does; a negative statement is used only for a testable limit. Reasons belong in Design, rejected options in Alternatives, and kept earlier behavior in "Relation to earlier RFCs". No section announces future work or later RFCs.
- **R4** — An RFC references only lower-numbered RFCs (in `references` and in body links).
- **R19** — `docs/rfc/README.md` briefs this workflow and indexes every RFC (number, title, status) in a table between `<!-- rfc-index:start -->` and `<!-- rfc-index:end -->`. The table is generated from front-matter by `npm run docs:index`; front-matter stays the only source of status.

### Lifecycle
- **R5** — States: `draft → accepted | rejected | withdrawn`; `accepted → implemented | superseded`; `implemented → superseded`. Transitions are checked against the published version (R18).
- **R6** — Editing depends on publication (R18) and status:
  - unpublished — edit in place at any status;
  - published `draft` — edit freely;
  - published `accepted` — additions only: existing text stays, new requirements take new IDs; removing or rewording needs a superseding RFC;
  - published `implemented` — frozen except `status`, `superseded-by` and the Errata section.
- **R7** — Requirements are numbered `Rn`, unique per RFC, and cited as `RFC-NNNN/Rn`. A requirement verified by human review instead of a test is marked `*(manual)*` right after its ID.
- **R16** — A *retroactive* RFC records decisions already in the code: front-matter `retroactive: <commit>`, status `implemented`, describing the code at that commit, exempt from the test-coverage check.
- **R17** *(manual)* — An RFC that changes behavior specified by an earlier RFC lists each affected requirement under "Relation to earlier RFCs" as *kept* or *changed* (with reason), or supersedes the whole RFC.
- **R18** — An RFC is *published* once it is in a commit on the mainline (`dev`), or in a pushed branch with a non-draft pull request. Before that, changes are amendments in place.

### Stages
- **R8** *(manual)* — *Draft*: the agent and a developer discuss the purpose first (problem, why now, scope), then the solution (at least two options, including the simplest), then critically review ("grill") the written draft until every question is answered or listed under Unresolved questions. The result is written as `status: draft`.
- **R9** — *Accept* (human approval, R23): set `status: accepted`; add failing tests that cite requirement IDs; update agent instructions:
  - `AGENTS.md` holds the always-on rules; `CLAUDE.md` is a symlink to `AGENTS.md`; neither references the other;
  - procedures are skills in `.claude/skills/<name>/SKILL.md` (front-matter `name` equal to `<name>`, and `description`), each linked from `AGENTS.md`;
  - always-needed knowledge may live in `.agents/<topic>.md` files, each imported by `AGENTS.md` with an `@.agents/<topic>.md` line.
- **R25** *(manual)* — Agent-only docs (`AGENTS.md`, `.agents/**/*.md`, `.claude/skills/**/*.md`) are compressed with `/caveman-compress` after each substantial edit; the compressed file in the repository is the source. Human docs (RFCs, `README.md`, `docs/`) are never compressed.
- **R10** *(manual)* — *Implement*: write code from the RFC and agent instructions until all tests pass.
- **R11** *(manual)* — *Document*: human docs in `README.md` (brief, index, license and other key notices) and `docs/`, each with a `.zh-tw.md` translation per R2.
- **R12** *(manual)* — *Verify* (human approval per R23, unless `gates: accept` per R22): every requirement not marked *(manual)* has at least one test, manual ones are reviewed, docs match the code and the RFC, then set `status: implemented`.
- **R22** *(manual)* — `gates: accept` marks a small decision with a single human gate: after acceptance, the agent sets `implemented` itself once tests, `docs:check` and docs pass. Default is `accept, verify` (both gates).
- **R23** — Human gates are passed only by a human invoking the `rfc-cascade` skill (`/rfc-cascade NNNN`), whose `SKILL.md` sets `disable-model-invocation: true`. Agents never set `accepted`, nor `implemented` on an RFC with `gates: accept, verify`, in any other way. Exception: a retroactive RFC (R16) is written as `implemented` and approved by the human reviewing it before it is committed.
- **R24** — Mechanical steps are scripts: `npm run rfc:new -- <kebab-title>` creates the next-numbered draft from the template, with an untranslated `.zh-tw.md` (which fails R2 until translated); `npm run rfc:status -- NNNN <status>` refuses transitions R5 forbids, sets the status in the RFC and its translation, and regenerates the index (R19) in `docs/rfc/README.md` and its translation. Both commands re-stamp only translations that were current before the change, so staleness is never hidden.
- **R13** *(manual)* — Each stage is its own commit, using the repository's conventional-commit style (e.g. `docs(rfc): accept 0002`).

### Automation
- **R14** — `npm run docs:check` fails on: invalid front-matter or status; a transition (R5) or edit (R6) not allowed against the published base (default: merge-base with `origin/dev`); forward references; duplicate requirement IDs; broken Markdown links or `@path` imports; `CLAUDE.md` not a symlink to `AGENTS.md`, or a `.agents/*.md` file not imported by `AGENTS.md`; a skill (R9) with a missing or mismatched `name`, no `description`, or not linked from `AGENTS.md`; an `rfc-cascade` skill that is missing or lacks `disable-model-invocation: true` (R23); a missing or stale `.zh-tw.md` for an RFC, `README.md` or `docs/**/*.md`; a requirement of an `accepted`/`implemented` non-retroactive RFC, not marked *(manual)*, without a citing test; an RFC index (R19) that differs from what `docs:index` would generate.
- **R15** — `docs:check` runs in CI.

## Design
- Status lives only in front-matter; git history is the audit trail for R5/R6.
- Publication (R18) is detected for the mainline by comparing with `origin/dev`; pull-request publication cannot be seen offline and is enforced in review. CI for a non-draft pull request may pass its base as the published ref.
- "Additions only" (R6): every non-blank line of the published body still appears, in order, in the new body.
- Translation drift is detected by hash (R2), not by date.
- Tests cite requirements in their names, e.g. `it('RFC-0002/R3: …')`, so R12 coverage is a text search.
- Agent docs: one file under two names. Claude reads `CLAUDE.md` and expands `@` imports; other agents read `AGENTS.md`, where an `@.agents/…` line is still a readable path.
- Rules vs procedures: rules must hold even when no skill is loaded, so they stay in `AGENTS.md`. Procedures load only when used, so they are skills. Claude discovers skills natively; other agents follow the links in `AGENTS.md` and read `SKILL.md` as plain Markdown.
- Skills:
  - `rfc-create` — stage 1 (R8): the discussion, the draft and the grill; `/rfc-create NNNN` re-grills an existing draft;
  - `rfc-cascade` — moves an RFC to its next gate (R23), invoked by a human only:
    - on a `draft`: accepts it, then runs stages 2–4 and writes the stage-5 report; with `gates: accept`, also sets `implemented` (R22);
    - on an `accepted` RFC with unfinished work (failing tests, missing docs): continues it;
    - on an `accepted` RFC with finished work: shows the stage-5 report and sets `implemented` only after the human confirms, so resuming work never approves the last gate by accident;
  - `translate` — writes and stamps translations (R2).
- Compression (R25) saves agent context on every session. `/caveman-compress` keeps front-matter, headings, code, commands, paths and links unchanged, so skill names, requirement IDs and commands survive. It runs on `AGENTS.md`, never through the `CLAUDE.md` symlink. Its readable backup stays outside the repository; later edits are written in the same compressed style. It needs the caveman Claude Code plugin; without it, write the compressed style by hand.
- The `disable-model-invocation` flag only binds agents that honor it; the rule in `AGENTS.md` (R23) covers the rest.
- `docs:check` skips `.claude/` (it holds worktrees) except `.claude/skills/`.

## Alternatives
- Hand-maintained status index: duplicates front-matter, drifts (R19 generates and checks it instead).
- A separate "lightweight RFC" kind: two templates and rule sets for a difference of three usually-empty sections; optional sections plus `gates` give the same saving.
- Frozen once accepted: blocks refinement during implementation (PEP-style updates are allowed instead, additive once published).
- Separate `CLAUDE.md` index of `@path` lines: two entry points to keep in sync.
- Procedures as `.agents/*.md` topics: always loaded, and nothing stops an agent from running a gate stage on its own.
- One skill per stage, with a separate approval skill: more commands for the same two gates; invoking `rfc-cascade` is the approval.
- Grilling inside `rfc-cascade`: on a draft, invoking it is the approval, so it could not also mean "review this"; and grilling must be available to agents, which a human-only skill is not.
- Translations as sources: two truths; rejected.

## Migration and compatibility
Applies to new work only. This RFC goes through its own stages; `docs:check` (R14) is its implementation. On checkouts without symlink support (Windows with `core.symlinks=false`), `CLAUDE.md` is a text file containing `AGENTS.md`; agents there read `AGENTS.md` directly.

## Verification
Requirements without *(manual)* are covered by tests in `tests/docs-check/` (run by `npm test`); the template (0000) has no requirements of its own. *(manual)* requirements are checked by the human reviewer at R12.

## Unresolved questions
None. (Human docs are not checked for staleness against code beyond links; left to R12 review.)

## Errata
