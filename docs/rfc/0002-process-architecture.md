---
rfc: 0002
title: Process architecture and messaging
status: implemented
created: 2026-09-26
references: [0001]
retroactive: db39f26
---

# RFC 0002: Process architecture and messaging

## Summary
Records how Einstein splits into processes and how they talk, as built at `db39f26`: an Electron main process that relays everything, a launcher window, a hidden shared window, and one Node child process hosting all plugins, connected by a transport-independent, fire-and-forget message tunnel.

## Motivation
Writing down what the process split guarantees, and what it does not, lets any RFC that changes it state which properties it keeps or changes (RFC-0001/R17).

## Requirements

### Processes
- **R1** — Einstein runs as four roles: the Electron main process; the launcher window (`omniSearch` renderer); a hidden `sharedProcess` window, reserved for views shared across the host and plugins (e.g. a settings page); and a *plugin host*, a plain Node child process.
- **R2** — Plugin code never runs in the main process or a renderer; all plugins share the single plugin host process.
- **R3** — The main process starts the plugin host with `child_process.fork` (`silent: true`, `serialization: 'advanced'`) and forwards its stdout and stderr, line by line, to its own console.
- **R4** — Startup order: shared window → plugin host → the plugin host reports `plugin:initialized` after every plugin has loaded → launcher window → message routes. The launcher is not ready before the plugins are.
- **R5** — Shutdown (`will-quit`): the main process asks the plugin host to exit (`pluginHost:exit`), kills it after 1 s regardless, unregisters global shortcuts and destroys both windows. The app keeps running when all windows are closed.
- **R6** — A *Restart* menu command (CmdOrCtrl+R) tears down and recreates all processes and windows.

### Messaging
- **R7** — Processes communicate through a `MessageTunnel` over a pluggable transport (`send` + `message` events), with three transports: Electron `MessagePortMain`, DOM `MessagePort`, and Node child-process IPC.
- **R8** — A message is `{channel, data?}` with a non-empty channel. Delivery is fire-and-forget: every handler on the channel receives it; there is no request/response pairing, correlation id, timeout or error reply. A reply is a separate channel.
- **R9** — Messages to a channel without a handler are buffered and replayed to the first handler that registers.
- **R10** — Renderers obtain a port by sending `<name>:registerMessageChannel` with a nonce over Electron IPC; the main process answers with a `MessageChannelMain` port and the same nonce.
- **R11** — The plugin host handshake exchanges random tokens; afterwards every tunnel packet carries the receiver's token, and packets with another token are ignored.
- **R12** — Data from the plugin host is reduced to JSON-compatible values before sending.

### Routing
- **R13** — The main process is the hub: the launcher and the plugin host never talk directly. It relays `search` → `plugin:performSearch`, `plugin:performSearch:reply` → `searchResult`, and `plugin:event` unchanged.
- **R14** — Message types: `PerformSearch {term}`; `PerformSearchReply {term, result}` where `term` echoes the request and each result is tagged with `pluginUid`; `PluginEvent {pluginUid, type, data?}`.
- **R15** — `plugin://<uid>/<path>` is an Electron protocol; the main process resolves it by asking the plugin host for the file path (`plugin:filePath`), answers 404 when there is none, and caches successful lookups.
- **R16** — The launcher asks the main process to resize (`resizeWindow {height}`, width kept) and hide (`closeWindow`); the main process sends it `beforeShow` before showing.

### Locations
- **R17** — User data lives in `~/.config/einstein` (Windows: `~/AppData/Local/einstein`), with plugin configs in its `config/` directory; the app resolves its own files relative to its build output directory.

## Design
```
omniSearch window ──MessagePort──┐
                                 main process ──fork IPC (token)── plugin host (all plugins)
sharedProcess window ─MessagePort┘
```
- The main process owns windows, global shortcuts, the menu and the `plugin://` protocol; it knows channel names but not plugin logic.
- The plugin host runs outside Electron (target `node`), keeping Electron APIs out of plugin code.
- The shared window only opens a tunnel at `db39f26`; nothing routes to it.
- The tokens keep tunnel traffic separate from other IPC on the same channel (R11).

### Known gaps at `db39f26` (not decisions)
- No restart of a crashed plugin host; no detection of a hung renderer.
- No timeouts on handshakes, `plugin:initialized` or `plugin:filePath`; a silent plugin host blocks startup.
- Errors never cross the tunnel; a failing search sends no reply.
- Renderers run with `nodeIntegration: true` and `contextIsolation: false` (marked TODO).
- Weak randomness: the renderer nonce is `getUTCMilliseconds()`, tokens use `Math.random`.
- No single-instance lock; the `plugin:filePath` cache never evicts.

## Verification
Retroactive (RFC-0001/R16): describes the code at `db39f26`; exempt from test coverage. Later RFCs that change these requirements list them under "Relation to earlier RFCs".
