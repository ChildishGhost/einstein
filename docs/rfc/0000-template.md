---
rfc: 0000
title: RFC template
status: implemented
created: 2026-09-26
references: []
---

# RFC 0000: RFC template

Copy this file to `NNNN-kebab-title.md` (next free number), fill the sections, delete the guidance. Add sections only when relevant: *Alternatives*, *Migration and compatibility*, *Unresolved questions* (before Verification), *Errata* (at the end, after acceptance).

---

```yaml
---
rfc: NNNN
title: <short title>
status: draft            # see RFC 0001
created: YYYY-MM-DD
references: [0001]       # lower-numbered RFCs only
supersedes: []           # optional
superseded-by: null      # set only by a later RFC
retroactive: null        # commit hash, only for RFCs recording existing code
gates: accept, verify    # or `accept` for small decisions (single human gate)
---
```

# RFC NNNN: <title>

## Summary
One paragraph: what changes and why.

## Motivation
The problem, and why now.

## Requirements
Numbered, testable statements. Cite elsewhere as `RFC-NNNN/Rn`. Mark review-only ones `*(manual)*` after the ID. Say what the system does; a negative only for a testable limit (RFC-0001/R26).

- **R1** — …
- **R2** — …

## Design
How the requirements are met. Diagrams if they earn their place.

## Relation to earlier RFCs
Required when this RFC changes earlier behavior. Each earlier requirement it touches: `RFC-NNNN/Rn` — kept | changed (reason).

## Verification
How each requirement is checked (tests, `docs:check`, manual).
