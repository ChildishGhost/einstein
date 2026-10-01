<!-- source-sha256: 8f1465fc33adcad71b1e7cc59b97de2ef623c4c21992666bd9b927733a77f56c -->

> 本文為 [0008-deno-gpui-runtime.md](0008-deno-gpui-runtime.md) 的翻譯，內容以英文版為準。

---
rfc: 0008
title: Deno and gpui-native runtime on Linux
status: implemented
created: 2026-09-26
references: [0001, 0002, 0003, 0004, 0005, 0006, 0007]
gates: accept, verify
---

# RFC 0008：Linux 上的 Deno 與 gpui-native 執行環境

## 摘要
在 Linux 上，以 Deno 取代 Electron 與 Node 作為唯一的執行環境，並以 gpui-native（由 GPUI 繪製的 Vue）繪製啟動器。RFC 0002–0007 的行程結構、訊息路由、外掛 API、內建外掛與啟動器行為都予以保留；只變更新執行環境不得不改的部分。macOS 與 Windows 維持 Electron 版本。

## 動機
- **維護：** Electron、圍繞它的 webpack 建置，以及 vm2（上游已停止維護、在此另行修補）的負擔日益加重。
- **基礎：** 外掛隔離、外掛 UI 與使用者自訂快捷鍵建立在 Deno 的權限模型與原生 UI 工具組之上；本 RFC 只更換執行環境，讓那些決策各自獨立、便於審查。

先做 Linux，因為 CI 已涵蓋它，且所需的 gpui-native 視窗功能目前已存在於此平台。

## 需求

### 行程與訊息傳遞
- **R1** — 在 Linux 上，Deno 版本以 Deno 作為唯一的執行環境。Linux 的 Electron 版本仍與其並存。
- **R2** — 三個行程：*主行程*（中樞與生命週期；不含 UI、不含外掛程式碼）、*UI 行程*（所有視窗，以 gpui-native 繪製）與*外掛主機*（所有外掛）。
- **R3** — 主行程以 spawn Deno 執行檔的方式啟動 UI 行程與外掛主機，附帶 Node 相容的 IPC 通道（`advanced` 序列化）、明確的 Deno 權限與 `--no-prompt`，並將它們的 stdout 與 stderr 逐行轉送。
- **R4** — UI 行程不授予 `net` 與 `run` 權限，因此結果圖示必須是 `plugin://` 或 `data:` URL；其他 URL 不會顯示。外掛主機授予所有權限。
- **R5** — 行程之間的訊息透過 IPC 通道上的 `MessageTunnel` 傳遞，兩個子行程都使用 RFC-0002/R11 的 token 握手。
- **R6** — 主行程仍是中樞：UI 行程與外掛主機從不直接溝通。視窗指令（`beforeShow`、`resizeWindow`、`closeWindow`）在主行程與 UI 行程之間傳遞。
- **R7** — UI 行程或外掛主機意外結束時，主行程會記錄並依 RFC-0002/R4 的啟動順序重新啟動它。同一個行程在 60 秒內意外結束三次後，主行程停止重啟，並記錄需要執行 `einstein --restart`。
- **R8** — 再次啟動 Einstein 不會建立另一個實例。`einstein --toggle` 切換執行中實例的啟動器，`einstein --restart` 重新啟動它，兩者都透過本機 socket。

### UI
- **R9** *(manual)* — 啟動器是由 gpui-native 繪製的 Vue 3。其行為依循 RFC 0004，外觀依循 RFC 0007；GPUI 造成的任何差異都列在文件中。
- **R10** *(manual)* — 啟動器視窗無邊框。在支援 layer-shell 的 Wayland 合成器上，它是 layer-shell overlay，在 X11 上則是 popup 視窗；兩者都位於其他視窗之上，且沒有工作列項目。在不支援 layer-shell 的 Wayland 合成器上，它是一般視窗，由合成器決定位置，並在每次顯示時提升到最上層並取得焦點。隱藏後保留輸入與結果，供下次顯示。
- **R11** — `plugin://<uid>/<path>` 圖片從外掛主機在該外掛資料夾內解析出的檔案繪製；解析到資料夾之外的路徑會被拒絕。
- **R12** *(manual)* — 全域快捷鍵由 UI 行程註冊：在 Wayland 上透過 XDG Desktop Portal `GlobalShortcuts`（以 Alt+Space 為偏好的觸發鍵，使用者可更改），在 X11 上以按鍵攔截（key grab）註冊。其切換行為同 RFC-0004/R2。註冊失敗時會記錄在日誌中，並提示使用 `einstein --toggle`。
- **R13** — 一個指令將 portal 所需的桌面項目（application id）安裝到 `$XDG_DATA_HOME/applications`；另一個指令只移除該檔案。

### gpui-native
- **R14** — gpui-native 固定在某個上游 commit；Einstein 對它的修改只以 patch 檔的形式存放在本儲存庫中。
- **R15** — 由一個 Containerfile 為每個 Linux 目標建置修補後的 addon，在 Docker 或 Podman 下執行，本機建置與 CI 皆同。它以 zig 作為連結器，交叉編譯 x86_64 與 aarch64，目標為 glibc 2.36（Debian bookworm），使用以 digest 固定的基礎映像、固定版本的 Rust 工具鏈與 `cargo --locked`。

### 外掛
- **R16** — 外掛主機在各自的 Deno Worker 中執行每個外掛。一個 preload 模組提供 `einstein` 與模糊比對器（RFC-0003/R5），透過 import map 解析；RFC-0003/R14 的 API 不變。
- **R17** — `spawn` 與 `openUrl` 由外掛主機代外掛執行，行為同 RFC-0003/R15–R16，並套用 RFC-0003/R6 的環境變數允許清單。
- **R18** — 外掛以 ES module 撰寫。建置產生 CommonJS bundle（`main`，供 Electron 外掛主機）與 ES module bundle（`module`，供 Deno 外掛主機）；Deno 外掛主機載入 `module`，沒有 `module` 的外掛則退而透過 Deno 的 Node 相容 `require` 載入 `main`。
- **R19** — 內建外掛（RFC 0005）在兩種外掛主機上的行為相同。

### 建置與分階段
- **R20** — Deno 版本固定在 `.tool-versions` 中。在 Linux 上，一個 Deno task 建置所有東西（以 Vite 與 gpui-native 的 Vue renderer 建置 UI、主行程、外掛主機、外掛），另一個從原始碼目錄執行。第三個 task `test` 執行 Deno 版本的測試，這些測試以 Deno 的測試執行器與 `jsr:@std/testing/bdd` 撰寫。
- **R21** — macOS 與 Windows 維持 Electron 版本不變；CI 建置兩套架構，Linux 上亦然，並在 Linux 上執行 Deno 測試。

## 設計

```
                 main (Deno) — hub, lifecycle, single-instance socket
          IPC (spawn + 'ipc', token)          IPC (spawn + 'ipc', token)
        ┌─────────────┴─────────────┐   ┌──────────────┴─────────────────┐
        │ UI process (Deno)         │   │ plugin host (Deno, all perms)   │
        │ gpui-native + Vue 3       │   │ Worker per plugin               │
        │ launcher + shared window  │   │ preload: einstein + matcher     │
        │ global shortcut (portal / │   │ broker: spawn, openUrl,         │
        │ X11 grab)                 │   │ plugin:// path resolution       │
        └───────────────────────────┘   └────────────────────────────────┘
```

- **為何獨立出 UI 行程：** gpui-native 在載入它的行程中執行。Vue 的部分（狀態、比對差異、批次處理）一律在該行程的 JS 執行緒上執行。要讓主行程如 RFC 0002 的本意維持為精簡的中樞，UI 就需要自己的行程。保留的共用視窗（RFC-0002/R1）成為 UI 行程的第二個視窗。
- **為何使用帶 IPC 通道的 `spawn` 而非 `fork`：** 在 Deno 2.9 中，`fork` 出的子行程一律取得所有權限，且 `execArgv` 會傳給 V8 而非 Deno。以 `'ipc'` stdio 位置 spawn Deno 執行檔，能保有相同的通道與序列化方式，並讓每個行程取得確切的權限。
- **gpui-native：** Apache-2.0 授權，與 Einstein 的 LGPL-3.0 相容（RFC-0006/R10）。透過 Deno 的 Node-API 支援載入。在 Linux 上，其 GPUI 迴圈在 UI 行程的原生執行緒上執行。
- **patch 集合**（`native/gpui-native/patches/`，依檔名順序套用）：0001 加入視窗類型（popup、Wayland layer-shell）、無邊框裝飾、執行期調整大小、隱藏／顯示與全域快捷鍵；0002 讓視窗可在隱藏狀態下啟動、在第一次顯示前註冊快捷鍵，並在合成器不支援 layer-shell 時退回 popup 視窗（X11 上為彈出視窗，Wayland 上為一般視窗）；0003 讓輸入框在視窗綁定之前攔截列出的按鍵（其 `captureKeys` prop）；0004 接受帶後備字型的 `fontFamily` 清單；0005 在 Linux 上透過 fontconfig 解析 `.SystemUIFont`；0006 啟用 GPUI 的 X11 後端；0007 在顯示時讓 X11 彈出視窗取得焦點，並忽略按鍵攔截造成的失焦；0008 在 Wayland 的 configure 回應較舊的請求時，保留最新要求的尺寸；0009 在 X11 上以取消映射隱藏視窗，而非關閉它；0010 提供視窗所在顯示器的範圍（`getDisplayBounds`）；0011 讓 X11 彈出視窗開啟時水平置中，頂端位於螢幕頂部下方 160 px；0012 以輸入框自身的行高排版其文字。
- **輸入框中的按鍵：** Esc 與方向鍵會以 `keyDown` 送達單行輸入框；Tab 只有透過 patch 0003 才會送達。
- **key-stop 轉換：** gpui-native 的事件在分派之後才到達 JS，因此 `.stop` 無法在那裡阻止它們；一個 Vue 編譯器轉換（`src/ui.deno/vite/keyStop.ts`）把 `@key-down.<key>.stop` 轉成輸入框的 `captureKeys`。
- **UI 建置：** 容器建置 `@gpui-native/{core,runtime,vue}`，`src/ui.deno` 透過 Deno `links` 安裝它們，再由 Vite 把 UI 打包到 `src/ui.deno/dist/`。
- **快捷鍵的後備方案：** 在沒有 portal 或按鍵已被占用時，使用者在桌面環境自己的快捷鍵設定中綁定 `einstein --toggle`。
- **指令名稱：** 這些需求中的 `einstein` 指 Einstein 的進入點；從原始碼執行時為 `deno task dev`，因此 `einstein --toggle` 即 `deno task dev --toggle`。
- **Worker 中的外掛：** Worker 保有完整的 Deno 權限，與 vm2 實際上的狀況相同。
- **容器建置：** `native/gpui-native/Containerfile` 以 Debian bookworm 為基礎，在固定的 commit 複製上游，依序套用 patch，並透過 zig 以 napi-rs CLI 建置，因此主機都不需要 Rust 工具鏈。addon 經由 `--output` 以檔案形式離開建置，不需保留執行中的容器。
- **兩套架構：** Electron 版本（webpack、vm2、Node 外掛主機）維持原狀。兩者共用外掛 API、外掛原始碼，以及使用者資料與外掛設定的位置（RFC-0002/R17），因此切換架構會保留使用者的設定。

## 與較早 RFC 的關係
Electron 版本在所有平台上保留每一項較早的需求，但 RFC-0006/R2、R3 與 R8 的變更同時適用於兩套架構。其餘項目針對 Deno 版本；未列出的需求皆保留。

- RFC-0002/R1 — 變更：三個行程；啟動器與共用視窗位於 UI 行程，而非 Electron renderer（gpui-native 在載入它的行程中繪製）。
- RFC-0002/R3 — 變更：外掛主機是帶 IPC 通道、以 spawn 啟動的 Deno 行程，而非 fork 出的 Node 行程；保留 `advanced` 序列化與輸出轉送。
- RFC-0002/R6 — 變更：重新啟動改為 `einstein --restart`，而非選單指令（R8）。
- RFC-0002/R7 — 變更：唯一的傳輸方式是 Node 相容的 IPC 通道；MessagePort 傳輸隨 Electron 一起移除。
- RFC-0002/R10 — 變更：移除；沒有需要分發的 renderer port。
- RFC-0002/R15 — 變更：`plugin://` 改由 UI 行程透過主行程為圖片解析，而非 Electron protocol；查詢方式與外掛資料夾範圍保留。
- RFC-0002/R2、R4、R5、R8、R9、R11–R14、R16、R17 — 保留。
- RFC-0003/R2 — 在 Deno 主機上變更：進入點是 `module`；`main` 仍是 Electron 的進入點（R18）。
- RFC-0003/R11 — 在 Linux 上變更：結果的 `icon` 必須是 `plugin://` 或 `data:` URL（R4）；UI 行程沒有網路存取。
- RFC-0003/R4 — 在 Deno 主機上變更：每個外掛一個 Worker，而非 vm2 context；default export 仍是 setup 函式。
- RFC-0003/R5、R6、R14–R16、R18 — 保留（R16、R17）。
- RFC-0004/R1 — 在 Linux 上變更：使用 layer-shell 或 popup 視窗，而非 Electron 永遠置頂的 `toolbar` 視窗。在不支援 layer-shell 的 Wayland 合成器（例如 GNOME）上，啟動器是一般視窗：它不會保持在最上層，且顯示期間會列在 dash、概覽（overview）與應用程式切換器中。
- RFC-0004/R2 — 在 Linux 上變更：啟動器水平置中，頂端位於螢幕頂部下方 160 px（Wayland 上的 layer-shell 覆蓋層與 X11 上的彈出視窗皆然），而非在螢幕上置中；在 Wayland 上按鍵是使用者確認的偏好觸發鍵，視窗位置由合成器決定（合成器不支援 layer-shell 時退回的一般視窗亦然）；切換行為保留。
- RFC-0004/R3 — 在 Linux 上變更：沒有應用程式選單；移除 DevTools，Restart 改為 `einstein --restart`。
- RFC-0006/R2 — 變更：新增 devDependencies `vite` 8.2.2、`@vitejs/plugin-vue` 6.0.8 與 `@vue/compiler-core` 3.5.41；`vue` 升級至 `^3.5.41`，`@types/node` 升級至 `^24.0.0`。Deno UI 有自己的 manifest `src/ui.deno/package.json`，其中列出 gpui-native。在 Linux 上，Deno 版本另外以 `.tool-versions` 的 Deno 版本執行（R20），且建置外掛時仍需要 Node。
- RFC-0006/R3 — 變更：`npm run build` 執行六個 webpack 設定；第六個 `plugins:module` 是 Deno 外掛主機載入的 ES module 外掛 bundle（R18）。在 Linux 上，Deno 版本的 UI bundle 由 Vite 建置，外掛 bundle 則由 Node 下的 webpack 建置（`build:plugins`，R20）。
- RFC-0006/R5 — 在 Linux 上變更：Deno 版本不下載 Electron。
- RFC-0006/R8 — 變更：外掛原始碼以明確的 `.ts` 副檔名匯入本地模組，而非省略副檔名，並以 `node:` 前綴匯入 Node 內建模組，因此 Deno 不需 unstable 旗標即可執行；`plugins/` 有自己的 ESLint flat config（沿用根目錄設定，改用 Node globals）。
- RFC-0006/R4 — 變更：gpui-native 從本儲存庫修補（R14）；vm2 的 patch 只保留給 Electron 版本。
- RFC-0006/R9 — 變更：CI 也在 Linux 上建置 Deno 版本與 gpui-native addon（R15、R21）。
- RFC 0005 與 RFC 0007 — 保留（R9、R19）。

## 替代方案
- **UI 放在主行程：** 行程較少，但中樞的 JS 執行緒也要執行所有 Vue 工作，違背 RFC 0002 精簡中樞的原則。
- **單純使用 `fork`：** 最接近現有程式碼，但會讓每個子行程取得所有權限。
- **stdio JSON lines 或本機 socket：** 可行，但與 RFC 0002 的 IPC 差距更大，而 Node 相容通道在 Deno 下已經可用。
- **在 Deno 上執行 vm2：** 依賴 Node 內部實作與一個已停止維護的函式庫。
- **只用 CommonJS，以 `createRequire` 載入：** 只有一種產物，但讓 Deno 主機綁定 Node 的模組系統；僅保留作為沒有 `module` 之外掛的後備方案。
- **略過沒有 `module` 的外掛：** 較簡單，但會讓既有的第三方 CommonJS 外掛在 Linux 上失效。
- **讓 UI 行程存取網路：** 可顯示 http(s) 圖示，代價是 UI 行程需要網路。
- **將 gpui-native 納入本儲存庫或另行 fork：** 儲存庫更龐大，或需維護一個 fork；在固定的上游之上套用 patch，讓差異小且易於審查。
- **子行程當掉後不重啟**（如 `db39f26`）：有兩個子行程時，任一個當掉都會讓啟動器無法使用，直到手動重啟。
- **三個平台同時進行：** gpui-native 目前還沒有 macOS 的視窗與快捷鍵功能。
- **在主機上建置：** 每台從原始碼建置的機器都需要 Rust、zig 與原生建置函式庫。
- **發布預先建置的執行檔並固定 SHA-256：** 不需容器執行環境即可建置，但需要發布空間，且每次 patch 或固定版本變更都要更新雜湊。
- **以模擬（qemu）建置 aarch64：** 不需設定交叉連結，但慢得多。
- **較新的基礎映像：** 工具較新，但會排除 glibc 較舊的發行版。
- **`deno compile` 執行檔：** 更換執行環境並不需要打包。

## 驗證
測試涵蓋 R1–R8、R11、R13–R21（行程與權限、IPC 路由、單一實例、`plugin://` 範圍、桌面項目、patch 固定、兩種主機上的外掛載入、建置 task、CI 設定、容器配方）。R9、R10 與 R12 在 KDE Plasma（Wayland）上人工檢查。

## 未決問題
- R10 與 R12 在 X11 上經人工檢查時是否成立：agent 已在 Xephyr 中檢查 popup 與按鍵攔截，但人工檢查只在 KDE Plasma（Wayland）上進行過。
- UI 行程以 `--allow-read --allow-ffi --allow-env=GPUI_NATIVE_LIBRARY_PATH,GPUI_VUE_NATIVE_LIBRARY_PATH` 執行。Deno 的權限管不到 gpui-native 的原生程式碼，它本身就能抓取 http(s) URL 並讀取檔案（例如 `<img>`），因此 R4 依賴 UI 的圖示過濾。未決：是否需要原生端的防護。
- R12 在 GNOME 上是否成立：我們的目標 GNOME 版本是否提供該 portal，並能透過它註冊快捷鍵。此項尚未測試；沒有 portal 時，註冊會安全地失敗，並指向 `einstein --toggle`。
- gpui 的所有 Linux 原生函式庫能否在 zig 下為 aarch64 交叉連結。
