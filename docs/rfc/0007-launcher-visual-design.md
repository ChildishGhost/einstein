---
rfc: 0007
title: Launcher visual design
status: implemented
created: 2026-09-26
references: [0001, 0002, 0004]
retroactive: db39f26
---

# RFC 0007: Launcher visual design

## Summary
Records the launcher's layout and look as built at `db39f26`: one compact column — an input with results below — that sizes itself to its content, in a single dark theme with CJK-first typography. Behavior is in [RFC 0004](0004-launcher-and-search.md).

## Motivation
Keeping visuals apart from behavior lets the look change without touching what the launcher does, and vice versa.

## Requirements

### Layout
- **R1** — One column: the input on top, the result list directly below it; the list is not shown while the input is empty (RFC-0004/R4).
- **R2** — The window is 600 px wide; its height follows the content, so it shrinks to the input alone and grows with the results (animated resize, width kept; RFC-0002/R16).
- **R3** — A result row shows an optional square icon on the left and, beside it, the title above the description; each text is a single line, cut with an ellipsis.
- **R4** — The selected row is highlighted with a translucent light background.
- **R5** — There is no window frame, no scrollbar and no selectable text.

### Look
- **R6** — A single dark theme: window background `#333`; input text white, 24 pt, borderless on a transparent background; title 20 px `#eee`; description 14 px `#999`; icon 36×36 px; selection `rgba(255, 255, 255, .3)`.
- **R7** — Text uses a CJK-first font stack: Noto Sans CJK TC, LiHei Pro, then the system UI font.

## Design
- Height is measured in the renderer after each result change and before showing, then applied by the main process (RFC-0004/R1, RFC-0002/R16).
- Styles live in the Vue components and `src/omniSearch/index.scss`.

### Known gaps at `db39f26` (not decisions)
- No light theme and no `prefers-color-scheme`; colors are hard-coded.
- No input placeholder; the window is opaque, with square corners and no blur.
- Icons have no alt text; contrast of the description (`#999` on `#333`) is below WCAG AA for small text.

## Verification
Retroactive (RFC-0001/R16): describes the code at `db39f26`; exempt from test coverage. Later RFCs that change these requirements list them under "Relation to earlier RFCs".
