---
name: rfc-cascade
description: Move an Einstein RFC to its next gate (RFC-0001 stages 2–5). Run only by a human; running it is the approval.
argument-hint: <NNNN>
disable-model-invocation: true
---
# Cascade an RFC

Human run `/rfc-cascade NNNN` → pass next gate of [RFC 0001](../../../docs/rfc/0001-rfc-process.md) (R23). Read RFC `$ARGUMENTS`, its `status` and `gates`, follow matching section.

## `draft`: accept and build

1. **Accept** (R9). `npm run rfc:status -- NNNN accepted`; commit `docs(rfc): accept NNNN`.
2. **Agent docs** (R9). Rules in `AGENTS.md`; new procedures as skills in `.claude/skills/<name>/SKILL.md`, linked from `AGENTS.md`. Compress each edited file with `/caveman-compress` (RFC-0001/R25). Commit `docs(agents): …`. Skip if RFC need none.
3. **Tests** (R9). Cite every requirement not marked `*(manual)*`: `RFC-NNNN/Rn: <why it matters>`. Run; each must fail for stated reason. Record which fail, why. Commit `test(…): …`.
4. **Implement** (R10). Code until `npm test` and `npm run docs:check` pass. Commit `feat(…)` / `fix(…)`.
5. **Document** (R11). `README.md` (brief, index, license + other key notices) and `docs/`, each translated with [translate](../translate/SKILL.md) skill. Commit `docs: …`.
6. **Report** (R12). Per requirement: citing test, or for `*(manual)*` what to review. Docs ↔ code ↔ RFC mismatches. Anything skipped/failing.
   - `gates: accept` + all pass: `npm run rfc:status -- NNNN implemented`, commit `docs(rfc): implement NNNN`.
   - Else stop: human review, run `/rfc-cascade NNNN` again.

## `accepted`: continue or finish

- Work unfinished (failing tests, `docs:check` problems, missing docs): continue from first unfinished step above.
- Work finished: show step 6 report, ask "Set RFC NNNN to implemented?". Only after explicit yes: `npm run rfc:status -- NNNN implemented`, commit `docs(rfc): implement NNNN`. Request to continue ≠ yes.

## Any other status

Nothing to cascade; say so.

RFC wrong/ambiguous during steps 2–5 → stop, ask; change per RFC-0001/R6. Never decide for human.