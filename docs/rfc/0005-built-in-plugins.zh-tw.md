<!-- source-sha256: 63cce8b26eda26ce07098a3a5e66231eb5138de59a7cb96342aadef240d44bf5 -->

> 本文為 [0005-built-in-plugins.md](0005-built-in-plugins.md) 的翻譯，內容以英文版為準。

---
rfc: 0005
title: Built-in plugins
status: implemented
created: 2026-09-26
references: [0001, 0003, 0004]
retroactive: db39f26
---

# RFC 0005：內建外掛

## 摘要
記錄 `db39f26` 時 `plugins/` 中隨附的外掛做了什麼：瀏覽器書籤、桌面應用程式、`pass` 密碼庫、網頁搜尋捷徑，以及一個範例。每個都是只使用公開 API 的一般外掛（[RFC 0003](0003-plugin-system.md)）。

## 動機
使用者實際搜尋的內容大多來自這些外掛；本文記錄它們的行為。

## 需求

### 共通
- **R1** — 內建外掛只使用 `einstein` API 與 `fuse.js`（RFC-0003/R5、R14）；每個都以 `tw.childish.einstein.plugins.` 下的反向 DNS uid 識別。
- **R2** — 每個外掛只在 setup 時建立一次索引；磁碟上的變更要重新啟動後才會看到。
- **R3** — 除非另有說明，每個外掛都以 Fuse（threshold 0.4）在本地比對；之後啟動器再重新排序（RFC-0004/R5）。

### 書籤（`…plugins.bookmarks.chromium`）
- **R4** — 在預設觸發詞上搜尋 Chromium 系瀏覽器的書籤，讀取各瀏覽器的資料目錄：`~/.config/<browser>`（Linux）、`~/Library/Application Support/<browser>`（macOS）、`~/AppData/Local/<browser>/User Data`（Windows）。
- **R5** — 瀏覽器來自各平台內建的清單，可由設定鍵 `browsers: string[]` 整個取代。
- **R6** — 讀取每個設定檔目錄的 `Bookmarks` JSON；收集所有 URL 項目，合併重複（名稱與 URL 相同）的項目，略過無法讀取的檔案。以名稱與 URL 比對。
- **R7** — 結果以名稱為標題、URL 為描述，補全為名稱，開啟時呼叫 `openUrl`。

### 桌面應用程式（`…plugins.desktop`）
- **R8** — 支援 Linux 與 macOS；在其他平台上 setup 會失敗。
- **R9** — Linux：從 `/usr/share/applications`、`/usr/local/share/applications` 與 `~/.local/share/applications` 讀取 `.desktop` 檔；保留有 `Exec` 的 `Type=Application` 項目，除非 `NoDisplay=true`；每個 `[Desktop Action …]` 是獨立的結果，標題為 `<App>: <Action>`。
- **R10** — Linux：移除 Exec 欄位代碼（不傳入檔案或 URL）；`Terminal=true` 的應用程式在終端機中執行，終端機由已安裝的 `TerminalEmulator` 項目偵測（優先順序：urxvtc、gnome-terminal、uxterm、xterm；預設 `urxvtc -e`）；透過 `spawn` 啟動。
- **R11** — Linux：圖示是在圖示目錄下找到的最大相符圖片，以 data URI 內嵌。
- **R12** — macOS：列出 `/Applications` 與 `~/Applications` 中的 `*.app`，以 `file-icon` 取得 72 px 圖示，依名稱最多比對 10 筆；以 `open <path>` 啟動。
- **R13** — 結果以應用程式名稱為標題，以其指令（Linux）或路徑（macOS）為描述，補全為名稱。

### Pass（`…plugins.pass`）
- **R14** — 只回應 `pass` 觸發詞；索引 `~/.password-store` 下的 `*.gpg` 項目，並以項目名稱與路徑比對。
- **R15** — 啟用項目時執行 `pass -c <entry>`（複製到剪貼簿；逾時由 pass 處理）。`pass show <entry>` 以 QR code 顯示（macOS：`qrencode` + 預覽程式；其他平台：`pass show -q`）。
- **R16** — 查詢為空時，提供可用的子指令作為補全。

### 網頁搜尋（`…plugins.search`）
- **R17** — 依觸發詞提供網頁搜尋，引擎來自內建清單，其中一個引擎位於預設觸發詞。
- **R18** — 設定鍵 `engines: {trigger, url, description}[]` 取代預設值；URL 中的 `%s` 以查詢替換。
- **R19** — 在預設觸發詞上，也會建議觸發詞包含查詢內容的引擎；開啟結果時呼叫 `openUrl`。
- **R20** — `plugins/search/dump.sh` 是開發者工具，把 Chromium 瀏覽器的搜尋引擎轉為 `engines` 設定。

### 範例（`…plugins.example`）
- **R21** — 範本外掛，示範觸發詞（包含 `VOID_TRIGGER`）、第二個引擎與設定保存；只在設定 `BUILD_EXAMPLE_PLUGIN` 時建置。

## 設計
- 各平台的引擎在每個外掛中都實作同一個介面（例如 desktop 的 `IApplicationSearchEngine`）。
- 資源（圖示、`file-icon` 執行檔）透過 manifest 的 `__webpack_copy` 清單複製到建置輸出中。
- `db39f26` 時的內建預設值反映原作者的個人設定，而非產品決策：
  - 瀏覽器：Linux `microsoft-edge-dev`、`chromium`、`google-chrome`；macOS `Google/Chrome`、`Microsoft Edge`、`Microsoft Edge Beta`；Windows `Microsoft\Edge`、`Microsoft\Edge Dev`、`Google\Chrome`；
  - 網頁搜尋引擎：預設觸發詞為 DuckDuckGo，`g` 為 Google（`zh-TW` 語系），`github` 為 GitHub，`tw` 為 itaigi.tw，`q` 為 Qwant。

### `db39f26` 時已知的缺口（非決策）
- Shell 注入：項目名稱與路徑未加引號就插入 shell 指令（`pass -c`、`open`）；網頁搜尋未對查詢做 URL 編碼。
- Desktop：`Keywords` 從未被搜尋（鍵名筆誤）；`/usr/share/pixmaps ` 結尾多一個空白；忽略 `XDG_DATA_DIRS`、`Hidden`、`OnlyShowIn`、`NotShowIn`、`TryExec`；忽略圖示主題與尺寸；Linux 索引以同步方式載入。
- Pass：忽略 `PASSWORD_STORE_DIR`；`.gpg` 在第一次出現處被移除，而不只是副檔名。
- 書籤：不支援 Firefox 或 Safari；不顯示資料夾。
- 搜尋：Google URL 寫死 `zh-TW`；`dump.sh` 產生無效的 JSON（結尾逗號、未跳脫的引號）。
- 有 Windows 支援的部分未經測試；desktop 與 pass 沒有 Windows 支援。

## 驗證
追溯式（RFC-0001/R16）：描述 `db39f26` 時的程式碼；不受測試覆蓋檢查約束。之後變更這些需求的 RFC，須在「與較早 RFC 的關係」中列出。
