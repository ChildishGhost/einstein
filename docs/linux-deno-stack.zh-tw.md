<!-- source-sha256: 20e742233106618929641a704bbbaaeaad0846dc3bbb90fa54eb585817d2be47 -->

> 本文為 [linux-deno-stack.md](linux-deno-stack.md) 的翻譯，內容以英文版為準。

# Linux 上的 Einstein：Deno 與 gpui-native 技術堆疊

Einstein 有兩套技術堆疊（[RFC 0008](rfc/0008-deno-gpui-runtime.zh-tw.md)）：

- **Deno 堆疊（Linux）：** Deno 是唯一的執行環境，啟動器以 [gpui-native](https://github.com/countradooku/gpui-native)（由 GPUI 繪製的 Vue 3）繪製。
- **Electron 堆疊（所有平台）：** macOS 與 Windows 使用此堆疊。Linux 的 Electron 建置仍然可用；請見 README 的[建置](../README.zh-tw.md#建置)。

兩套堆疊共用外掛 API、外掛原始碼，以及使用者資料與外掛設定的位置，因此切換堆疊時會保留你的設定。

## 需求

- [Deno](https://deno.com/)，版本為 [`.tool-versions`](../.tool-versions) 中所釘選的版本。
- Node.js 與 npm（請見 [README](../README.zh-tw.md#需求)）。以 webpack 建置外掛以及 Electron 堆疊仍需要它們。
- [Podman](https://podman.io/) 或 [Docker](https://www.docker.com/)，用來建置 gpui-native addon。
- Wayland 或 X11 工作階段。

## 從原始碼建置並執行

先安裝 npm 相依套件，與 Electron 堆疊相同；外掛建置會用到它們：

```bash
npm install
(cd plugins/desktop && npm install)
```

接著在儲存庫根目錄執行：

```bash
deno task native:fetch   # fetch the pinned gpui-native commit and apply the patches
deno task native:build   # build the gpui-native addon in a container
deno task install:ui     # install the UI dependencies, including the built addon
deno task build          # build the UI, check main and the plugin host, build the plugins
deno task dev            # run Einstein
```

關於 `deno task native:build`：

- 第一次建置會在容器內下載 Rust 與 zig 工具鏈並編譯 gpui-native，約需 20 分鐘。
- 只會為主機的架構建置。結果寫入 `native/gpui-native/dist`。
- 容器引擎預設為 `podman`。設定 `CONTAINER_ENGINE` 可改用其他引擎，例如 `CONTAINER_ENGINE=docker deno task native:build`。
- 在只有主機才有 podman 的 toolbox 或 distrobox 內，請使用 `CONTAINER_ENGINE="host-spawn podman" deno task native:build`。`podman-remote` 無法使用，因為它不支援 `--output`。

`deno task test` 會執行 Deno 堆疊的測試。

在 KDE Plasma 上做視覺檢查時，`deno task capture:launcher [--toggle] <file.png>` 只擷取啟動器視窗：在啟動器為作用中視窗時以 Spectacle 擷取；`--toggle` 會先顯示啟動器。若 KWin 回報作用中視窗是其他視窗，則不擷取並拒絕執行；寬度不是 600 px 的擷取會被刪除。在 toolbox 內請設定 `SPECTACLE="host-spawn spectacle"`。

## 單一實例與控制

同一時間只會執行一個 Einstein。再次啟動不會建立第二個實例，而是：

- `einstein --toggle` 顯示或隱藏執行中實例的啟動器；
- `einstein --restart` 重新啟動它。

從原始碼執行時，請使用 `deno task dev --toggle` 與 `deno task dev --restart`。

## 全域快捷鍵

以 Alt+Space 切換啟動器。

- **Wayland：** 快捷鍵透過 XDG Desktop Portal（`GlobalShortcuts`）註冊。Portal 需要 Einstein 的 app id `io.github.ChildishGhost.Einstein` 的桌面項目（desktop entry）：
  1. 執行 `deno task desktop-entry:install`。它會將 `io.github.ChildishGhost.Einstein.desktop` 寫入 `$XDG_DATA_HOME/applications`（預設為 `~/.local/share/applications`）。
  2. 重新啟動工作階段。
  3. 啟動 Einstein 並核准 portal 對話框。Alt+Space 是偏好的按鍵；對話框可能讓你選擇其他按鍵。
- **X11：** 快捷鍵以按鍵攔截（key grab）實作，不需要桌面項目。
- **備援：** 若快捷鍵無法註冊（沒有 portal，或按鍵已被占用），Einstein 會記錄在日誌中。請改在桌面環境本身的快捷鍵設定中綁定 `einstein --toggle`。從原始碼執行時，該指令為 `deno task --config /path/to/einstein/deno.json dev --toggle`。

`deno task desktop-entry:remove` 只會移除該桌面項目檔案。

桌面項目儲存了此 checkout 的 `deno.json` 與 Deno 執行檔的絕對路徑。移動 checkout 之後，請再次執行 `deno task desktop-entry:install`。

## 視窗行為

- 在 Wayland 合成器（compositor）支援時，啟動器是 layer-shell 覆蓋層；在 X11 上為彈出視窗（popup）；在不支援 layer-shell 的 Wayland 合成器上則為一般視窗。
- 它沒有邊框。layer-shell 覆蓋層與彈出視窗會保持在其他視窗之上，且不會出現在工作列。
- layer-shell 覆蓋層在顯示期間獨占鍵盤。
- 隱藏啟動器時會保留輸入內容與結果，供下次顯示時使用。
- 啟動器使用的字型堆疊依序為 Noto Sans CJK TC、LiHei Pro，最後是系統 UI 字型。在 Linux 上，系統 UI 字型是 fontconfig 在 Einstein 執行環境中為 `sans-serif` 選出的字族。在 toolbox 或 distrobox 內，這指的是容器的 fontconfig，而非主機的，因此字型可能與你的桌面設定不同。

## Deno 外掛主機上的外掛

- 每個外掛在各自的 Deno Worker 中執行。外掛 API（`einstein` 與模糊比對器）與 Electron 外掛主機相同。
- 外掛主機載入外掛的 `module` 進入點（ES module）。沒有 `module` 的外掛則改由其 `main` 進入點（CommonJS）載入。
- 結果的 `icon` 必須是 `plugin://` 或 `data:` URL。UI 程序沒有網路存取權，因此其他 URL 不會顯示。

## 當機處理

若 UI 程序或外掛主機意外結束，Einstein 會記錄下來並重新啟動它。同一程序在 60 秒內意外結束三次後，就不再重新啟動；請執行 `einstein --restart`（從原始碼執行時為 `deno task dev --restart`）。

## 更新 gpui-native 的釘選版本

gpui-native 釘選在 [`native/gpui-native/upstream.json`](../native/gpui-native/upstream.json) 中的上游 commit。Einstein 對它的修改只以 patch 檔的形式存放於 `native/gpui-native/patches/`，依檔名順序套用。切勿直接修改上游 checkout 而不將修改轉為 patch。

1. 修改 `upstream.json` 中的 `commit`。
2. 針對新的 commit 重新產生 patch：在位於 `native/gpui-native/.cache/upstream` 的上游 checkout 中，依序套用並修正每個 patch，再以 `git diff` 寫回。`deno task native:fetch` 會重設該 checkout，因此重新執行它之前，請先將工作存成 patch。
3. 執行 `deno task native:fetch` 與 `deno task native:build`。
4. 執行一次不帶 `--frozen` 的 `deno install --config src/ui.deno/deno.json`，以更新 `src/ui.deno/deno.lock`。之後照常執行 `deno task install:ui` 與 `deno task build`。

## 已知由 GPUI 造成的差異

與 Electron 啟動器（[RFC 0004](rfc/0004-launcher-and-search.zh-tw.md)、[RFC 0007](rfc/0007-launcher-visual-design.zh-tw.md)）相比：

<!-- known-deviations: add further GPUI-forced deviations below (RFC-0008/R9) -->
- 沒有應用程式選單。重新啟動改為 `einstein --restart`。
- 沒有 DevTools。
- 啟動器不在螢幕正中央：它水平置中，頂端位於螢幕頂部下方 160 px（Wayland 上為 layer-shell 覆蓋層，X11 上為彈出視窗）。在不支援 layer-shell 的 Wayland 合成器上，視窗的位置由合成器決定（RFC-0004/R1、R2）。
- layer-shell 覆蓋層在顯示期間獨占鍵盤，因此在它隱藏前，輸入都會送往啟動器。它失去焦點時不會隱藏；這是沿自 RFC 0004 的已知缺口。
- 在 Wayland 上，隱藏會關閉啟動器視窗，顯示時再重新開啟，因為 GPUI 無法就地隱藏 layer surface；在 X11 上視窗會保留，只是隱藏（RFC-0004/R1）。兩者都會保留輸入與結果。
- 在不支援 layer-shell 的合成器（例如 GNOME）上，啟動器是一般視窗。它可能被其他視窗遮住，開啟期間會出現在 dash、概覽（overview）與 Alt+Tab 中；其位置由合成器決定（RFC-0004/R1、R2）。
