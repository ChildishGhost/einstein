<!-- source-sha256: f87fe6bd974ce8aa35e09bf908d02cede10d26ea1a6db1585e2dc54435946e0e -->

> 本文為 [0006-build-and-distribution.md](0006-build-and-distribution.md) 的翻譯，內容以英文版為準。

---
rfc: 0006
title: Build, toolchain and distribution
status: implemented
created: 2026-09-26
references: [0001, 0002, 0003]
retroactive: db39f26
---

# RFC 0006：建置、工具鏈與發行

## 摘要
記錄 `db39f26` 時 Einstein 如何建置、檢查與發行：TypeScript 由一次 webpack 執行打包成五個目標；下載 Electron 執行環境並將應用程式以未打包形式複製進去；lint 與格式規則；在 Linux 上建置的 CI；以及 LGPL-3.0 授權。

## 動機
記錄工具鏈與發行上的承諾，能清楚說明使用者與貢獻者依賴的是什麼。

## 需求

### 工具鏈
- **R1** — 原始碼為 TypeScript；`@/*` 對應到 `src/*`，公開 API 以 `einstein` 匯入（而非 `@/api`），由 lint 強制。
- **R2** — Node 版本由 `.node-version` 固定（24.14.0）；套件管理器為 npm，並使用 lockfile。
- **R3** — `npm run build` 只執行一次 webpack，涵蓋五個設定：`main`（target `electron-main`）、`renderer`（Vue 3，每個視窗一個 HTML 頁面）、`node`（外掛主機，RFC-0002/R3）、`api`（有型別的 `einstein` 套件，RFC-0003/R17）與 `plugins`（每個 `plugins/<name>` 一個 bundle，`einstein` 與 `fuse.js` 為 external，RFC-0003/R5）。
- **R4** — 相依套件在安裝時以 `patch-package` 修補；vm2 經過修補，允許 `process`/`os`（RFC 0003 中的已知缺口），並在打包後能載入自己的檔案。

### 發行
- **R5** — `npm run build:electron` 為主機平台（或 `ELECTRON_PLATFORM`/`ELECTRON_ARCH`）下載與 `electron` devDependency 相符的 Electron 版本，快取於 `node_modules/.einstein`，並將建置好的應用程式以未打包形式複製到其 `resources/app`（macOS：`Electron.app` 內）。結果為 `dist/electron/`。
- **R6** — 唯一支援的安裝方式是從原始碼建置；建置好的應用程式也可在系統的 Electron 上執行（`electron dist/electron/resources/app`）。
- **R7** — 沒有安裝程式、程式碼簽章、asar 封存、發行版本或自動更新。

### 程式碼風格
- **R8** — Tab（寬度 2）、LF、UTF-8、檔尾換行（`.editorconfig`）；Prettier 120 欄、單引號、無分號、尾隨逗號；ESLint（typescript-eslint、vue、prettier）要求排序、且不帶副檔名的 import。

### CI 與儲存庫
- **R9** — CI（GitHub Actions）在 push、pull request 與手動觸發時執行，只在 Ubuntu 上：`npm ci`（`plugins/desktop` 中也執行）、lint、build。不發布任何產物。CodeQL 掃描 JavaScript；Dependabot 每週更新根目錄的 npm 相依套件。
- **R10** — Einstein 以 GNU LGPL v3 授權。
- **R11** — README 將 Einstein 描述為跨平台、類似 Spotlight、具外掛生態系的啟動器，說明 npm 腳本，並致謝 albert、Alfred、Electron、Fuse.js 與 Vue。

## 設計
- 建置輸出配置：`dist/{main,renderer,node,plugins,api}`；應用程式以該目錄為基準尋找自己的檔案（RFC-0002/R17）。
- `plugins/desktop` 有自己的 lockfile，因為它相依於 `file-icon`。

### `db39f26` 時已知的缺口（非決策）
- 沒有測試，CI 也沒有測試步驟。
- CI 只涵蓋 Linux，雖然 README 宣稱跨平台，外掛也宣稱支援 macOS。
- `@types/node` 針對 Node 16；有幾個開發相依套件看起來沒有用到。
- Dependabot 未涵蓋 `plugins/desktop`。
- 除了授權文字之外，沒有著作權聲明。

## 驗證
追溯式（RFC-0001/R16）：描述 `db39f26` 時的程式碼；不受測試覆蓋檢查約束。之後變更這些需求的 RFC，須在「與較早 RFC 的關係」中列出。
