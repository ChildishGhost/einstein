---
rfc: 0009
title: Quick actions
status: draft
created: 2026-09-27
references: [0001, 0002, 0003, 0004, 0007, 0008]
gates: accept, verify
---

# RFC 0009: Quick actions

## Summary
A search result can offer quick actions: secondary actions next to its main one, such as "copy" beside "open". The Deno UI of RFC 0008 shows the actions of the selected result in its row; the user picks one with the mouse or with Left and Right, and runs it with Enter or a click. Running an action sends its event to the owning plugin, then clears the input and hides the launcher unless the action asks to stay open.

## Motivation
A result has one action today (RFC-0003/R11). Plugins with several useful actions per item, such as a password entry that can be typed or copied, must return one result per action, which crowds the list. The branch `feature/quick-action` started this feature in 2022 for mouse use only; the Deno UI is being rebuilt anyway (RFC 0008), so quick actions are designed there, keyboard first as RFC 0004 requires.

## Requirements
- **R1** — A search result may carry `quickActions`, a list of `{title, icon?, event: {type, data?}, keepOpen?}`. The `QuickAction` type is exported from `einstein` on both plugin hosts.
- **R2** — The Deno UI shows all quick actions of the selected result (RFC-0004/R8) in its row, in the order given, wrapping onto further lines when they do not fit on one; other rows show none.
- **R3** — With the caret at the end of the input, Right highlights the first quick action of the selected result. Right and Left then move the highlight through the actions in order, across lines, stopping at the last one; Left on the first action removes the highlight and returns to the input. In every other case Left and Right move the caret.
- **R4** — Selecting another result (Up, Down or hover), changing the input, or Tab (which completes the selected result as in RFC-0004/R9) removes the action highlight.
- **R5** — Enter runs the highlighted action; a click on an action runs it. Without a highlighted action, Enter keeps its behavior of RFC-0004/R10.
- **R6** — Running an action sends `{pluginUid, type, data}` from the action's `event` to the plugin that returned the result, through the same route as an activation (RFC-0003/R11).
- **R7** — After an action runs, the input is cleared and the launcher hidden. With `keepOpen: true`, the launcher stays open with its input, highlight and results as they were; the search does not run again.
- **R8** — An action's `icon` is shown under the rule of RFC-0008/R4: `plugin://` and `data:` URLs only.
- **R9** — An action without a `title` or without an `event.type` is skipped; the result's other actions are shown.

## Design
- **Data:** actions travel inside results through the existing `search` → `plugin:performSearch` → `searchResult` route (RFC-0002/R13); main and the plugin host pass them through unchanged. The UI already knows each result's `pluginUid`.
- **State:** the UI keeps `actionIndex` next to the selected result index; `-1` means no highlight. Key handling is a pure function of (input, caret, selection, actionIndex, key), which the tests drive directly.
- **Caret rule (R3):** actions sit visually after the text, so Right past the end of the text continues into them, and typing is never interrupted.
- **Electron UI:** it ignores `quickActions`; plugins can return them on both hosts without checking which UI runs.

## Relation to earlier RFCs
The Electron UI keeps every earlier requirement. For the Deno UI, requirements not listed are kept:

- RFC-0003/R11 — changed: a result may also carry `quickActions` (R1); activation of the result itself is unchanged.
- RFC-0003/R14 — changed: the API gains the `QuickAction` type (R1).
- RFC-0004/R8 — kept; selecting a result also shows its actions (R2).
- RFC-0004/R9 — kept: Tab completes the selected result, also while an action is highlighted (R4).
- RFC-0004/R10 — changed: Enter runs the highlighted action when there is one (R5).
- RFC-0004/R11 — kept: Esc clears the input and hides the launcher, also while an action is highlighted.
- RFC-0004/R12 — kept.
- RFC-0007/R2 — kept: the window height follows the taller row.
- RFC-0007/R3 — changed: the selected row also holds its actions, on as many lines as they need (R2).
- RFC-0008/R4 — kept, also for action icons (R8).

## Alternatives
- **Left and Right always move between actions:** simplest key rule, but the caret can then only be moved with Home, End or the mouse.
- **Alt+Left and Alt+Right:** no conflict with the caret, but a chord users have to learn.
- **An action list opened with a key (such as Ctrl+K):** scales to many actions, but hides them until asked for.
- **Alt+1…9 for the first nine actions:** fastest for known actions, but nothing shows which number is which without extra labels.
- **One line of actions, scrolled or cut with a "+k" marker:** keeps rows one height, but hides actions.
- **Esc first removing the action highlight:** one more key press to hide, unlike every other state of the launcher.
- **Running the search again after a `keepOpen` action:** results reflect what the action changed, but the list can jump under the user's cursor.
- **Ignoring all of a result's actions when one is invalid:** stricter, but one plugin mistake hides every action of the result.
- **Mouse only, as on `feature/quick-action`:** against RFC 0004's keyboard-first model.
- **Both UIs:** would mean building the feature twice, in the UI RFC 0008 keeps unchanged.

## Verification
Tests cover R1–R9: the exported type (R1); the key-handling function for showing, moving, clearing and running (R2–R5); the event sent through main (R6); hiding, clearing and `keepOpen` (R7); the icon rule (R8); skipping invalid actions (R9).
