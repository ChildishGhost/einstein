<!-- source-sha256: dc6fe8ec700dec52c38c3f0ad03dfbf96677e15796591b952663409089037eed -->

> 本文為 [0002-process-architecture.md](0002-process-architecture.md) 的翻譯，內容以英文版為準。

---
rfc: 0002
title: Process architecture and messaging
status: implemented
created: 2026-09-26
references: [0001]
retroactive: db39f26
---

# RFC 0002：行程架構與訊息傳遞

## 摘要
記錄 `db39f26` 時 Einstein 如何拆分為多個行程、以及行程之間如何溝通：由 Electron 主行程轉送一切訊息，另有啟動器視窗、隱藏的共用視窗，以及一個承載所有外掛的 Node 子行程，彼此以與傳輸方式無關、送出即不管（fire-and-forget）的訊息通道連接。

## 動機
寫下行程拆分保證了什麼（以及沒保證什麼），任何變更它的 RFC 才能說明保留或變更了哪些性質（RFC-0001/R17）。

## 需求

### 行程
- **R1** — Einstein 以四種角色執行：Electron 主行程；啟動器視窗（`omniSearch` renderer）；隱藏的 `sharedProcess` 視窗，保留給主機與外掛共用的畫面（例如設定頁）；以及*外掛主機*（plugin host），一個一般的 Node 子行程。
- **R2** — 外掛程式碼從不在主行程或 renderer 中執行；所有外掛共用唯一的外掛主機行程。
- **R3** — 主行程以 `child_process.fork`（`silent: true`、`serialization: 'advanced'`）啟動外掛主機，並將其 stdout 與 stderr 逐行轉送到自己的主控台。
- **R4** — 啟動順序：共用視窗 → 外掛主機 → 外掛主機在所有外掛載入後回報 `plugin:initialized` → 啟動器視窗 → 訊息路由。外掛就緒之前，啟動器不會就緒。
- **R5** — 關閉（`will-quit`）：主行程要求外掛主機結束（`pluginHost:exit`），1 秒後無論如何都將其終止，取消註冊全域快捷鍵並銷毀兩個視窗。所有視窗關閉時，應用程式仍繼續執行。
- **R6** — *Restart* 選單指令（CmdOrCtrl+R）會拆除並重新建立所有行程與視窗。

### 訊息傳遞
- **R7** — 行程之間透過 `MessageTunnel` 溝通，其下是可替換的傳輸層（`send` + `message` 事件），共有三種傳輸：Electron `MessagePortMain`、DOM `MessagePort` 與 Node 子行程 IPC。
- **R8** — 訊息為 `{channel, data?}`，channel 不可為空。傳遞方式為送出即不管：該 channel 的每個 handler 都會收到；沒有請求／回應配對、關聯 id、逾時或錯誤回覆。回覆是另一個 channel。
- **R9** — 送往尚無 handler 之 channel 的訊息會被暫存，並重播給第一個註冊的 handler。
- **R10** — Renderer 透過 Electron IPC 送出帶 nonce 的 `<name>:registerMessageChannel` 以取得 port；主行程以 `MessageChannelMain` port 與相同的 nonce 回應。
- **R11** — 外掛主機的握手會交換隨機 token；之後每個通道封包都帶有接收方的 token，token 不符的封包會被忽略。
- **R12** — 來自外掛主機的資料在送出前會被簡化為 JSON 相容的值。

### 路由
- **R13** — 主行程是中樞：啟動器與外掛主機從不直接溝通。它轉送 `search` → `plugin:performSearch`、`plugin:performSearch:reply` → `searchResult`，`plugin:event` 則原樣轉送。
- **R14** — 訊息型別：`PerformSearch {term}`；`PerformSearchReply {term, result}`，其中 `term` 回傳請求的內容，每筆結果都標上 `pluginUid`；`PluginEvent {pluginUid, type, data?}`。
- **R15** — `plugin://<uid>/<path>` 是 Electron protocol；主行程向外掛主機詢問檔案路徑（`plugin:filePath`）來解析它，沒有路徑時回應 404，並快取成功的查詢。
- **R16** — 啟動器要求主行程調整大小（`resizeWindow {height}`，保留寬度）與隱藏（`closeWindow`）；主行程在顯示前送出 `beforeShow`。

### 位置
- **R17** — 使用者資料位於 `~/.config/einstein`（Windows：`~/AppData/Local/einstein`），外掛設定放在其中的 `config/` 目錄；應用程式以其建置輸出目錄為基準解析自己的檔案。

## 設計
```
omniSearch window ──MessagePort──┐
                                 main process ──fork IPC (token)── plugin host (all plugins)
sharedProcess window ─MessagePort┘
```
- 主行程擁有視窗、全域快捷鍵、選單與 `plugin://` protocol；它知道 channel 名稱，但不知道外掛邏輯。
- 外掛主機在 Electron 之外執行（target `node`），讓外掛程式碼接觸不到 Electron API。
- `db39f26` 時共用視窗只開啟一個通道；沒有任何訊息路由到它。
- token 讓通道流量與同一通道上的其他 IPC 分開（R11）。

### `db39f26` 時已知的缺口（非決策）
- 外掛主機當掉後不會重啟；不會偵測卡住的 renderer。
- 握手、`plugin:initialized` 與 `plugin:filePath` 都沒有逾時；沒有回應的外掛主機會卡住啟動。
- 錯誤從不跨越通道；搜尋失敗時不會送出回覆。
- Renderer 以 `nodeIntegration: true` 與 `contextIsolation: false` 執行（標為 TODO）。
- 隨機性不足：renderer 的 nonce 是 `getUTCMilliseconds()`，token 使用 `Math.random`。
- 沒有單一實例鎖；`plugin:filePath` 的快取從不清除。

## 驗證
追溯式（RFC-0001/R16）：描述 `db39f26` 時的程式碼；不受測試覆蓋檢查約束。之後變更這些需求的 RFC，須在「與較早 RFC 的關係」中列出。
