---
rfc: 0005
title: Built-in plugins
status: implemented
created: 2026-09-26
references: [0001, 0003, 0004]
retroactive: db39f26
---

# RFC 0005: Built-in plugins

## Summary
Records what the plugins shipped in `plugins/` do at `db39f26`: browser bookmarks, desktop applications, the `pass` password store, web search shortcuts, and an example. Each is an ordinary plugin using only the public API ([RFC 0003](0003-plugin-system.md)).

## Motivation
These plugins are most of what users actually search; this records their behavior.

## Requirements

### Common
- **R1** — Built-in plugins use only the `einstein` API and `fuse.js` (RFC-0003/R5, R14); each is identified by a reverse-DNS uid under `tw.childish.einstein.plugins.`.
- **R2** — Each builds its index once, at setup; changes on disk are seen after a restart.
- **R3** — Each matches locally with Fuse (threshold 0.4) unless stated otherwise; the launcher then re-ranks (RFC-0004/R5).

### Bookmarks (`…plugins.bookmarks.chromium`)
- **R4** — Searches bookmarks of Chromium-family browsers, on the default trigger, in each browser's data directory: `~/.config/<browser>` (Linux), `~/Library/Application Support/<browser>` (macOS), `~/AppData/Local/<browser>/User Data` (Windows).
- **R5** — The browsers come from a built-in list per platform, replaced entirely by the config key `browsers: string[]`.
- **R6** — Every profile directory's `Bookmarks` JSON is read; all URL entries are collected, duplicates (same name and URL) merged, unreadable files skipped. Matching uses name and URL.
- **R7** — A result shows the name as title and the URL as description, completes to the name, and opening it calls `openUrl`.

### Desktop applications (`…plugins.desktop`)
- **R8** — Supported on Linux and macOS; setup fails on other platforms.
- **R9** — Linux: reads `.desktop` files from `/usr/share/applications`, `/usr/local/share/applications` and `~/.local/share/applications`; keeps `Type=Application` entries with `Exec` unless `NoDisplay=true`; each `[Desktop Action …]` is its own result, titled `<App>: <Action>`.
- **R10** — Linux: Exec field codes are removed (no files or URLs are passed); `Terminal=true` apps run inside a terminal detected from installed `TerminalEmulator` entries (preference: urxvtc, gnome-terminal, uxterm, xterm; default `urxvtc -e`); launching goes through `spawn`.
- **R11** — Linux: icons are the largest matching image found under the icon directories, embedded as data URIs.
- **R12** — macOS: lists `*.app` in `/Applications` and `~/Applications`, icons via `file-icon` at 72 px, at most 10 matches on name; launching runs `open <path>`.
- **R13** — A result shows the app name as title and its command (Linux) or path (macOS) as description, and completes to the name.

### Pass (`…plugins.pass`)
- **R14** — Responds only to the `pass` trigger; indexes `*.gpg` entries under `~/.password-store` and matches on entry name and path.
- **R15** — Activating an entry runs `pass -c <entry>` (copy to clipboard; pass handles the timeout). `pass show <entry>` shows it as a QR code (macOS: `qrencode` + Preview; elsewhere `pass show -q`).
- **R16** — With an empty term it offers the available subcommands as completions.

### Web search (`…plugins.search`)
- **R17** — Offers web searches per trigger, from a built-in list of engines with one engine on the default trigger.
- **R18** — The config key `engines: {trigger, url, description}[]` replaces the defaults; `%s` in the URL is replaced by the query.
- **R19** — On the default trigger it also suggests engines whose trigger contains the query; opening a result calls `openUrl`.
- **R20** — `plugins/search/dump.sh` is a developer tool that converts a Chromium browser's search engines into an `engines` config.

### Example (`…plugins.example`)
- **R21** — A template plugin demonstrating triggers (including `VOID_TRIGGER`), a second engine, and config persistence; it is built only when `BUILD_EXAMPLE_PLUGIN` is set.

## Design
- Platform-specific engines sit behind one interface per plugin (e.g. desktop's `IApplicationSearchEngine`).
- Assets (icons, the `file-icon` binary) are copied into the build through the manifest's `__webpack_copy` list.
- Built-in defaults at `db39f26` reflect the original author's setup, not product decisions:
  - browsers: Linux `microsoft-edge-dev`, `chromium`, `google-chrome`; macOS `Google/Chrome`, `Microsoft Edge`, `Microsoft Edge Beta`; Windows `Microsoft\Edge`, `Microsoft\Edge Dev`, `Google\Chrome`;
  - web engines: DuckDuckGo on the default trigger, `g` Google (`zh-TW` locale), `github` GitHub, `tw` itaigi.tw, `q` Qwant.

### Known gaps at `db39f26` (not decisions)
- Shell injection: entry names and paths are interpolated into shell commands unquoted (`pass -c`, `open`); web search does not URL-encode the query.
- Desktop: `Keywords` never searched (key typo); `/usr/share/pixmaps ` has a trailing space; `XDG_DATA_DIRS`, `Hidden`, `OnlyShowIn`, `NotShowIn`, `TryExec` ignored; icon themes and sizes ignored; the Linux index loads synchronously.
- Pass: `PASSWORD_STORE_DIR` ignored; `.gpg` removed at its first occurrence, not only as the extension.
- Bookmarks: no Firefox or Safari; folders not shown.
- Search: Google URL hardcodes `zh-TW`; `dump.sh` emits invalid JSON (trailing comma, unescaped quotes).
- Windows support is untested where present, absent in desktop and pass.

## Verification
Retroactive (RFC-0001/R16): describes the code at `db39f26`; exempt from test coverage. Later RFCs that change these requirements list them under "Relation to earlier RFCs".
