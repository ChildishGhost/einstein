---
name: rfc-create
description: Discuss, draft and grill an Einstein RFC together with a developer (RFC-0001 stage 1). Use when a change involves a decision — new or changed behavior, interfaces, architecture, significant dependencies, the process — that no accepted RFC covers, or to re-review an existing draft.
argument-hint: <topic> | <NNNN>
---
# Create an RFC

Stage 1 of [RFC 0001](../../../docs/rfc/0001-rfc-process.md) (R8). Input: `$ARGUMENTS` — topic for new RFC, or `NNNN` to grill existing draft (go to step 5).

Developer decides; you ask, propose, challenge. Max three questions per turn, then wait for answers.

1. **Read first.** [RFC index](../../../docs/rfc/README.md), related RFCs, involved code. Don't ask what code or earlier RFCs already answer.
2. **Purpose.** Agree on problem, who affected, why now, scope, non-goals. Restate in two or three sentences, get yes before moving on. If not a decision (RFC-0001/R20), say so and stop.
3. **Solution.** Propose ≥2 options, incl. simplest, with trade-offs + your recommendation. Developer picks; rejected options go under Alternatives.
4. **Write.** `npm run rfc:new -- <kebab-title>`, then fill Summary, Motivation, Requirements, Design, Verification. Add "Relation to earlier RFCs" when earlier behavior changes (R17); other sections only when they have content. Propose `gates: accept` only for small, local, reversible decision; developer confirms.
5. **Grill.** Challenge draft; put each finding to developer as question:
   - Each requirement one testable statement? Every `*(manual)*` justified?
   - Decisions hidden in Design that belong in Requirements?
   - Requirements say what system does? Negative only for testable limit; reasons → Design, rejected options → Alternatives, kept behavior → Relation. No future work / later RFCs anywhere (R26).
   - Conflict with earlier RFCs? References only to lower numbers (R4)?
   - Failure modes, security + permissions, data loss, migration, reversibility?
   - Anything not needed for agreed purpose?
   - Simpler design meet same requirements?

   Amend, repeat until round finds nothing new. Open items go under Unresolved questions.
6. **Finish.** Translate with [translate](../translate/SKILL.md) skill; `npm run docs:check` must pass. Commit `docs(rfc): draft NNNN <title>`. Tell developer `/rfc-cascade NNNN` accepts it, then stop.