---
rfc: 0004
title: Launcher window and search
status: implemented
created: 2026-09-26
references: [0001, 0002, 0003]
retroactive: db39f26
---

# RFC 0004: Launcher window and search

## Summary
Records the launcher's behavior as built at `db39f26`: a frameless, always-on-top window toggled by a global shortcut, searching on every keystroke across all plugins, ranking the merged results with one fuzzy pass, and driven entirely from the keyboard. Its look and layout are a separate concern.

## Motivation
These requirements are the behavior users know; an RFC that changes the launcher keeps or changes each one explicitly, and they are the basis for parity checks.

## Requirements

### Window
- **R1** — The launcher is one frameless, always-on-top window, created hidden and hidden rather than destroyed; on Linux it uses the `toolbar` window type.
- **R2** — A global shortcut toggles it: Alt+Space on Linux, Ctrl+Space elsewhere. Showing centers the window and focuses it; pressing the shortcut while it is visible and focused hides it.
- **R3** — An application menu offers Restart (RFC-0002/R6), DevTools and the standard Edit commands.

### Search
- **R4** — Every change of the input sends a search immediately; the result list is hidden while the input is empty.
- **R5** — Results from all engines that run (RFC-0003/R10) are merged, ranked together by fuzzy match on `title` and `description` (re-ranking without dropping), and cut to a small fixed number (10 at `db39f26`; the value is not part of the contract). With an empty query, results keep engine order.
- **R6** — All results of one search arrive at once.
- **R7** — A reply is shown only if its `term` equals the current input; stale replies are dropped.

### Keyboard and mouse
- **R8** — Up / Ctrl+P and Down / Ctrl+N move the selection, wrapping around; hovering a result selects it.
- **R9** — Tab replaces the input with the selected result's `completion`, or its `title` when it has none.
- **R10** — Enter or a click activates the selected result: with an `event`, it is sent to the plugin (RFC-0003/R11), then the input is cleared and the window hidden; without an event but with a `completion`, it completes instead.
- **R11** — Esc clears the input and hides the window.
- **R12** — Reopening the window keeps the previous input; only Esc or an activation clears it.

## Design
- The renderer (Vue 3) owns input, selection and rendering; the main process owns the window (RFC-0002/R16); ranking and the result limit are applied in the plugin host, with Fuse at threshold 1.0.
- Bindings other than Esc require the exact modifiers listed.
- Layout and look are recorded separately, in a later retroactive RFC on the launcher's visual design.

### Known gaps at `db39f26` (not decisions)
- The window does not hide when it loses focus; hiding on blur is expected but was never implemented.
- Every keystroke runs every engine; no cancellation.
- The selection index is not reset when results change; with zero results, arrow keys produce `NaN`.
- Rows are keyed by index, not `id`.
- No accessibility semantics (roles, labels, icon alt text); no i18n.
- The shortcut is fixed and its registration is not checked.
- The input is focused on first mount only, not on every show.

## Verification
Retroactive (RFC-0001/R16): describes the code at `db39f26`; exempt from test coverage. Later RFCs that change these requirements list them under "Relation to earlier RFCs".
