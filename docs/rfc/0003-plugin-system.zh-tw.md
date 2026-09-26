<!-- source-sha256: 245e4b3b518b4e724e931c4d9a1e73f2ce55f2c9f7f8bf618f71ddfe00079eff -->

> 本文為 [0003-plugin-system.md](0003-plugin-system.md) 的翻譯，內容以英文版為準。

---
rfc: 0003
title: Plugin system and plugin API
status: implemented
created: 2026-09-26
references: [0001, 0002]
retroactive: db39f26
---

# RFC 0003：外掛系統與外掛 API

## 摘要
記錄 `db39f26` 時外掛如何被發現、載入、隔離與設定，以及外掛所使用的 `einstein` API。外掛是 CommonJS bundle，在共用的外掛主機（[RFC 0002](0002-process-architecture.md)）中各自載入到獨立的 vm2 context，以觸發詞註冊搜尋引擎，並透過事件執行動作。

## 動機
外掛是 Einstein 的生態系；其 API 是任何變更都必須保留、或刻意替換的契約。沙箱實際的安全性質也必須記錄下來。

## 需求

### 探索
- **R1** — 依序在三個根目錄中探索外掛：內建（`<app>/plugins`）、系統（`/usr/share/einstein/plugins`，Windows 除外）與使用者（`<userData>/plugins`，RFC-0002/R17）。
- **R2** — 外掛是根目錄下的直接子目錄，內含 `package.json`，具有 `name`、`uid` 與進入點（`main`，否則 `module`）。無效或不完整的外掛、以及無法讀取的根目錄，會被記錄並略過。
- **R3** — `uid`（慣例上為反向 DNS，例如 `tw.childish.einstein.plugins.search`）是外掛的身分：設定檔、`plugin://` URL 與事件路由都以它為鍵。

### 載入與隔離
- **R4** — 每個外掛的進入點是預先編譯的 CommonJS，在外掛主機內各自的 vm2 `NodeVM` 中執行；其 `default` export 為 setup 函式。
- **R5** — 主機為每個外掛提供 `einstein` 模組（API）與一個模糊比對器；`db39f26` 時比對器是主機自己的 `fuse.js`，以 `fuse.js` 為名 require。
- **R6** — 外掛看得到的環境變數經過允許清單過濾，並還原 Electron 所做的變更（還原 `XDG_CURRENT_DESKTOP`、移除 `ELECTRON_RUN_AS_NODE`），讓外掛啟動的程式行為正常。
- **R7** — 所有外掛在啟動時平行載入；某個外掛載入或 setup 失敗時會被記錄，不會中斷其他外掛。
- **R8** — `setup(context)` 可以不回傳、回傳 dispose 函式，或回傳兩者之一的 promise。

### 搜尋與動作
- **R9** — 外掛以零個或多個觸發詞註冊搜尋引擎（`search(term, trigger?) → Promise<SearchResult[]>`）；零個觸發詞代表預設引擎組（`VOID_TRIGGER`，`''`）。
- **R10** — 查詢路由：若修剪後查詢的第一個以空白分隔的字等於已註冊的觸發詞，只執行該觸發詞的引擎，並以其餘部分查詢；否則所有預設引擎以完整查詢執行。
- **R11** — 結果為 `{id, title, description?, icon?, completion?, event?: {type, data?}}`。啟用帶有 event 的結果時，會將 `{pluginUid, type, data}` 送給所屬外掛，執行其對應該 type 的 handler（RFC-0002/R14）。
- **R12** — `plugin://<uid>/<path>` 只提供該外掛自己資料夾中的檔案（RFC-0002/R15）；結果以此提供圖示。

### 設定
- **R13** — 每個外掛有一個 JSON 設定檔 `<userData>/config/<uid>.config.json`，透過 `loadConfig`/`saveConfig` 以 comment-json 讀寫，因此註解會保留。檔案不存在或無效時讀為 `{}`。

### API
- **R14** — `einstein` 模組提供：
  - `version`（應用程式版本）、`VOID_TRIGGER`；
  - 型別 `SearchResult`、`ISearchEngine`、`PluginSetup`、`PluginDispose`、`PluginEventHandler`、`PluginMetadata {name, uid, path}`、`AppContext`、`IEnvironment {platform: 'linux' | 'macos' | 'windows' | 'other', homedir}`、`Configuration`；
  - `PluginContext`：`registerSearchEngine`、`deregisterSearchEngine`、`registerEventHandler`、`deregisterEventHandler`、`loadConfig`、`saveConfig`、`app`、`metadata`；
  - 方法 `openUrl(url)` 與 `spawn(command, {cwd?, env?, argv?})`。
- **R15** — `spawn` 透過 shell 執行指令，以 detached 且 unref 的方式執行，不回傳任何東西（沒有結束碼、沒有輸出）。
- **R16** — `openUrl` 以平台的處理程式開啟 URL：Linux 用 `xdg-open`、macOS 用 `open`、Windows 用 PowerShell `Start`。
- **R17** — API 版本即應用程式版本；為外掛作者建置有型別的 `dist/api` 套件（UMD + `.d.ts`）。

### UI
- **R18** — 外掛不提供自己的 UI：可顯示的內容僅限於結果列（R11）及其所提供的檔案（R12）。

## 設計
- 外掛由應用程式的 webpack 設定建置（外掛主機行程見 [RFC 0002](0002-process-architecture.md)）；`einstein` 與 `fuse.js` 維持為 external，以使用主機的版本。
- 引擎標上所屬外掛的 uid；結果在排序前標上 `pluginUid`。

### `db39f26` 時已知的缺口（非決策）
- 外掛可以 require 任何 Node 內建模組與任何 npm 模組，且 vm2 經過修補允許 `process` 與 `os`：這是權宜之計，而非授予的能力。因此外掛以使用者的完整權限執行。
- 沒有真正的隔離：任何外掛都能讀寫使用者檔案、使用網路、啟動行程、透過 `process` 讀取完整環境變數，或冒用其他外掛的 uid（設定、資源、事件）。vm2 在上游已停止維護，且有已知的逃脫方式。
- 一個外掛當掉、無窮迴圈或呼叫 `process.exit`，會讓所有外掛停止；一個拋出例外的引擎會讓整次搜尋失敗；沒有逾時。
- `uid` 沒有驗證（重複時覆蓋；`../` 可跳出設定目錄）。
- `plugin://` 不檢查解析後的路徑是否仍在外掛資料夾內（R12）；而是仰賴 URL 正規化移除 `..`。
- Shell 注入：Linux 與 Windows 上的 `openUrl` 引號處理過於簡單；`spawn` 一律使用 shell，即使給了 `argv`。
- `unloadPlugin` 不會移除已註冊的引擎，且從未被呼叫；沒有熱重載。
- 沒有權限、簽章或 API 相容性檢查；系統與使用者外掛會自動載入。
- 環境變數允許清單的筆誤（`'LINES COLUMNS'`）讓兩個變數都被丟棄。
- 設定沒有 schema 或預設值。

## 驗證
追溯式（RFC-0001/R16）：描述 `db39f26` 時的程式碼；不受測試覆蓋檢查約束。之後變更這些需求的 RFC，須在「與較早 RFC 的關係」中列出。
