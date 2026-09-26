---
rfc: 0003
title: Plugin system and plugin API
status: implemented
created: 2026-09-26
references: [0001, 0002]
retroactive: db39f26
---

# RFC 0003: Plugin system and plugin API

## Summary
Records how plugins are found, loaded, isolated and configured, and the `einstein` API they program against, as built at `db39f26`. Plugins are CommonJS bundles loaded into per-plugin vm2 contexts inside the shared plugin host ([RFC 0002](0002-process-architecture.md)), register search engines under triggers, and act through events.

## Motivation
Plugins are Einstein's ecosystem; their API is a contract that any change must keep or replace deliberately. The sandbox's actual security properties also need to be on record.

## Requirements

### Discovery
- **R1** — Plugins are discovered in three roots, in order: built-in (`<app>/plugins`), system (`/usr/share/einstein/plugins`, not on Windows) and user (`<userData>/plugins`, RFC-0002/R17).
- **R2** — A plugin is an immediate subdirectory of a root containing a `package.json` with `name`, `uid` and an entry (`main`, else `module`). Invalid or incomplete plugins, and unreadable roots, are logged and skipped.
- **R3** — `uid` (reverse-DNS by convention, e.g. `tw.childish.einstein.plugins.search`) is the plugin's identity: it keys config files, `plugin://` URLs and event routing.

### Loading and isolation
- **R4** — Each plugin's entry is precompiled CommonJS, run in its own vm2 `NodeVM` inside the plugin host; its `default` export is the setup function.
- **R5** — The host supplies every plugin with the `einstein` module (the API) and a fuzzy matcher; at `db39f26` the matcher is the host's own copy of `fuse.js`, required as `fuse.js`.
- **R6** — The environment visible to plugins is filtered through an allowlist, and Electron's changes are reverted (`XDG_CURRENT_DESKTOP` restored, `ELECTRON_RUN_AS_NODE` removed) so programs they start behave normally.
- **R7** — All plugins load in parallel at startup; a failure in one plugin's load or setup is logged and does not stop the others.
- **R8** — `setup(context)` may return nothing, a dispose function, or a promise of either.

### Search and actions
- **R9** — A plugin registers a search engine (`search(term, trigger?) → Promise<SearchResult[]>`) under zero or more triggers; zero triggers means the default engine set (`VOID_TRIGGER`, `''`).
- **R10** — Query routing: if the first space-separated word of the trimmed query equals a registered trigger, only that trigger's engines run, on the rest of the query; otherwise all default engines run on the whole query.
- **R11** — A result is `{id, title, description?, icon?, completion?, event?: {type, data?}}`. Activating a result with an event sends `{pluginUid, type, data}` to the owning plugin, whose handlers for that type run (RFC-0002/R14).
- **R12** — `plugin://<uid>/<path>` serves files from that plugin's own folder only (RFC-0002/R15); results use it for icons.

### Configuration
- **R13** — Each plugin has one JSON config file, `<userData>/config/<uid>.config.json`, read and written through `loadConfig`/`saveConfig` with comment-json so comments survive. A missing or invalid file reads as `{}`.

### API
- **R14** — The `einstein` module exposes:
  - `version` (the app version), `VOID_TRIGGER`;
  - types `SearchResult`, `ISearchEngine`, `PluginSetup`, `PluginDispose`, `PluginEventHandler`, `PluginMetadata {name, uid, path}`, `AppContext`, `IEnvironment {platform: 'linux' | 'macos' | 'windows' | 'other', homedir}`, `Configuration`;
  - `PluginContext`: `registerSearchEngine`, `deregisterSearchEngine`, `registerEventHandler`, `deregisterEventHandler`, `loadConfig`, `saveConfig`, `app`, `metadata`;
  - methods `openUrl(url)` and `spawn(command, {cwd?, env?, argv?})`.
- **R15** — `spawn` runs the command through a shell, detached and unreferenced, and returns nothing (no exit code, no output).
- **R16** — `openUrl` opens the URL with the platform handler: `xdg-open` on Linux, `open` on macOS, PowerShell `Start` on Windows.
- **R17** — The API version is the app version; a typed `dist/api` package (UMD + `.d.ts`) is built for plugin authors.

### UI
- **R18** — Plugins contribute no UI of their own: what they show is limited to result rows (R11) and the files they serve for them (R12).

## Design
- Plugins are built by the app's webpack config (see [RFC 0002](0002-process-architecture.md) for the host process); `einstein` and `fuse.js` stay external so the host's copies are used.
- Engines are tagged with the owning plugin's uid; results are tagged with `pluginUid` before ranking.

### Known gaps at `db39f26` (not decisions)
- Plugins may require any Node builtin and any npm module, and vm2 is patched to allow `process` and `os`: a workaround, not a granted capability. Plugins therefore run with the user's full privileges.
- No real isolation: any plugin can read and write user files, use the network, start processes, read the full environment via `process`, or claim another plugin's uid (config, assets, events). vm2 is discontinued upstream and has known escapes.
- One plugin crashing, looping or calling `process.exit` stops all plugins; a throwing engine fails the whole search; no timeouts.
- `uid` is not validated (duplicates overwrite; `../` escapes the config directory).
- `plugin://` does not check that the resolved path stays inside the plugin folder (R12); it relies on URL normalisation removing `..`.
- Shell injection: `openUrl` on Linux and Windows quotes naively; `spawn` always uses a shell, even with `argv`.
- `unloadPlugin` leaves engines registered and is never called; no hot reload.
- No permissions, signing, or API-compatibility check; system and user plugins load automatically.
- Env allowlist typo (`'LINES COLUMNS'`) drops both variables.
- Configs have no schemas or defaults.

## Verification
Retroactive (RFC-0001/R16): describes the code at `db39f26`; exempt from test coverage. Later RFCs that change these requirements list them under "Relation to earlier RFCs".
