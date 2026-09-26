<!-- source-sha256: 433c702a57e85be244671dfbe3b2b15e1a562364b94b72a0c27e2289858a0bec -->

> 本文為 [0001-rfc-process.md](0001-rfc-process.md) 的翻譯，內容以英文版為準。

---
rfc: 0001
title: RFC-driven development process
status: accepted
created: 2026-09-26
references: [0000]
---

# RFC 0001：以 RFC 驅動的開發流程

## 摘要
每項決策都從 `docs/rfc/` 中的 RFC 開始，依序經過五個階段——草擬、接受、實作、文件、驗證——並在「接受」與「完成」時由人工核准。Agent 透過專案 skill 執行各階段；只有人能通過關卡。不涉及決策的變更不需要 RFC。

## 動機
GPUI 遷移橫跨多個子系統，且大部分實作由 agent 完成。計畫、測試、agent 指示與給人看的文件，都必須能追溯到同一份已核准的來源。

## 需求

### 範圍
- **R20** *(manual)* — 決策需要 RFC：新增或變更的行為、公開或外掛介面、架構、重要的相依套件，以及本流程本身。恢復既定行為的錯誤修正、不改變行為的重構、相依套件版本更新、CI 維護與文件更正不需要 RFC，但不得與已接受的 RFC 牴觸。

### 檔案
- **R1** — RFC 放在 `docs/rfc/NNNN-kebab-title.md`，從 `0001` 開始編號（`0000` 為範本）。該目錄中的其他檔案（`README.md`、翻譯檔）不是 RFC。
- **R2** — 每份 RFC 都有翻譯 `NNNN-kebab-title.zh-tw.md`。英文檔為唯一來源；翻譯檔開頭為 `<!-- source-sha256: <英文檔的雜湊值> -->`，雜湊不符即視為過期。
- **R3** — Front-matter 欄位：`rfc`、`title`、`status`、`created`、`references`；選填 `supersedes`、`superseded-by`、`retroactive`、`gates`（`accept` 或 `accept, verify`）。
- **R21** *(manual)* — 必要章節：摘要、動機、需求、設計、驗證，以及適用 R17 時的「與較早 RFC 的關係」。替代方案、遷移與相容性、未決問題與勘誤在沒有內容時可以省略。
- **R26** *(manual)* — 需求敘述系統做什麼；否定句只用於可測試的限制。理由放在設計，被否決的選項放在替代方案，保留的既有行為放在「與較早 RFC 的關係」。任何章節都不預告未來的工作或之後的 RFC。
- **R4** — RFC 只能引用編號較小的 RFC（包含 `references` 與內文連結）。
- **R19** — `docs/rfc/README.md` 簡述本流程，並在 `<!-- rfc-index:start -->` 與 `<!-- rfc-index:end -->` 之間以表格列出所有 RFC（編號、標題、狀態）。表格由 `npm run docs:index` 從 front-matter 產生；狀態的唯一來源仍是 front-matter。

### 生命週期
- **R5** — 狀態：`draft → accepted | rejected | withdrawn`；`accepted → implemented | superseded`；`implemented → superseded`。狀態轉換以已發布版本（R18）為基準檢查。
- **R6** — 可否編輯取決於是否已發布（R18）與狀態：
  - 未發布 — 任何狀態都可直接修改；
  - 已發布的 `draft` — 可自由修改；
  - 已發布的 `accepted` — 僅能新增：既有文字保留，新需求使用新編號；刪除或改寫需以新的 RFC 取代；
  - 已發布的 `implemented` — 凍結，只有 `status`、`superseded-by` 與勘誤章節可修改。
- **R7** — 需求編號為 `Rn`，在同一份 RFC 內不可重複，以 `RFC-NNNN/Rn` 引用。以人工審查而非測試驗證的需求，在編號後標註 `*(manual)*`。
- **R16** — *追溯式*（retroactive）RFC 記錄程式碼中既有的決策：front-matter 標註 `retroactive: <commit>`，狀態為 `implemented`，描述該 commit 時的程式碼，不受測試覆蓋檢查約束。
- **R17** *(manual)* — 若某 RFC 改變了較早 RFC 規範的行為，須在「與較早 RFC 的關係」章節中逐項列出受影響的需求，標示*保留*或*變更*（附原因），或整份取代（supersede）該 RFC。
- **R18** — RFC 在進入主線（`dev`）的 commit，或位於已推送且有非草稿 pull request 的分支時，即視為*已發布*。在此之前，變更一律直接修改原文。

### 階段
- **R8** *(manual)* — *草擬*：agent 與開發者先討論目的（問題、為何是現在、範圍），再討論解法（至少兩個選項，包含最簡單的一個），接著批判性地審查（「拷問」）寫好的草稿，直到每個問題都有答案，或列入未決問題。結果以 `status: draft` 寫下。
- **R9** — *接受*（人工核准，R23）：設為 `status: accepted`；新增會失敗、並引用需求編號的測試；更新 agent 指示：
  - `AGENTS.md` 放隨時適用的規則；`CLAUDE.md` 是指向 `AGENTS.md` 的符號連結；兩者互不引用；
  - 作業程序是 `.claude/skills/<name>/SKILL.md` 中的 skill（front-matter 的 `name` 等於 `<name>`，並有 `description`），每個都由 `AGENTS.md` 連結；
  - 隨時需要的知識可放在 `.agents/<topic>.md` 檔案，每個都由 `AGENTS.md` 以 `@.agents/<topic>.md` 行匯入。
- **R25** *(manual)* — 只給 agent 看的文件（`AGENTS.md`、`.agents/**/*.md`、`.claude/skills/**/*.md`）在每次實質修改後以 `/caveman-compress` 壓縮；儲存庫中壓縮後的檔案即為來源。給人看的文件（RFC、`README.md`、`docs/`）一律不壓縮。
- **R10** *(manual)* — *實作*：依 RFC 與 agent 指示撰寫程式碼，直到所有測試通過。
- **R11** *(manual)* — *文件*：給人看的文件放在 `README.md`（簡介、索引、授權及其他重要聲明）與 `docs/`，每份皆依 R2 附 `.zh-tw.md` 翻譯。
- **R12** *(manual)* — *驗證*（依 R23 人工核准，除非依 R22 設為 `gates: accept`）：每項未標註 *(manual)* 的需求至少有一個測試，標註 manual 的需求經過審查，文件與程式碼及 RFC 相符，然後設為 `status: implemented`。
- **R22** *(manual)* — `gates: accept` 標示只需一道人工關卡的小型決策：接受之後，當測試、`docs:check` 與文件都完成時，由 agent 自行設為 `implemented`。預設為 `accept, verify`（兩道關卡）。
- **R23** — 人工關卡只能由人呼叫 `rfc-cascade` skill（`/rfc-cascade NNNN`）通過，其 `SKILL.md` 設定 `disable-model-invocation: true`。Agent 不得以其他方式設定 `accepted`，也不得為 `gates: accept, verify` 的 RFC 設定 `implemented`。例外：追溯式 RFC（R16）直接寫為 `implemented`，並在 commit 前經人審查核准。
- **R24** — 機械性步驟以腳本完成：`npm run rfc:new -- <kebab-title>` 從範本建立下一個編號的草稿，並附上尚未翻譯的 `.zh-tw.md`（在翻譯前無法通過 R2）；`npm run rfc:status -- NNNN <status>` 拒絕 R5 不允許的轉換，設定 RFC 與其翻譯的狀態，並在 `docs/rfc/README.md` 及其翻譯中重新產生索引（R19）。兩個指令都只為變更前仍為最新的翻譯重新蓋上雜湊，因此絕不會掩蓋過期。
- **R13** *(manual)* — 每個階段各自一個 commit，沿用本 repo 的 conventional-commit 風格（例如 `docs(rfc): accept 0002`）。

### 自動化
- **R14** — `npm run docs:check` 在以下情況失敗：front-matter 或狀態無效；相對於已發布基準（預設為與 `origin/dev` 的 merge-base）出現 R5 不允許的轉換或 R6 不允許的編輯；向前引用；需求編號重複；Markdown 連結或 `@path` 匯入失效；`CLAUDE.md` 不是指向 `AGENTS.md` 的符號連結，或有 `.agents/*.md` 未被 `AGENTS.md` 匯入；skill（R9）缺少 `name` 或與目錄不符、沒有 `description`，或未被 `AGENTS.md` 連結；`rfc-cascade` skill 不存在或未設定 `disable-model-invocation: true`（R23）；RFC、`README.md` 或 `docs/**/*.md` 缺少或有過期的 `.zh-tw.md`；`accepted`/`implemented` 的非追溯式 RFC 中，有未標註 *(manual)* 的需求沒有任何測試引用；RFC 索引（R19）與 `docs:index` 產生的內容不一致。
- **R15** — `docs:check` 在 CI 中執行。

## 設計
- 狀態只存在 front-matter；git 歷史作為 R5/R6 的稽核紀錄。
- 主線上的發布（R18）以與 `origin/dev` 比較來偵測；pull request 的發布無法離線得知，交由審查確認。非草稿 pull request 的 CI 可將其 base 作為已發布基準傳入。
- 「僅能新增」（R6）：已發布內文的每一個非空白行，都依原順序出現在新內文中。
- 翻譯是否過期以雜湊判斷（R2），而非日期。
- 測試名稱引用需求，例如 `it('RFC-0002/R3: …')`，因此 R12 的覆蓋檢查只是文字搜尋。
- Agent 文件：同一個檔案、兩個名稱。Claude 讀取 `CLAUDE.md` 並展開 `@` 匯入；其他 agent 讀取 `AGENTS.md`，對它們而言 `@.agents/…` 行仍是可讀的路徑。
- 規則與作業程序：規則在沒有載入任何 skill 時也必須成立，因此留在 `AGENTS.md`。作業程序只在使用時載入，因此做成 skill。Claude 原生會發現 skill；其他 agent 依 `AGENTS.md` 中的連結，把 `SKILL.md` 當一般 Markdown 讀取。
- Skill：
  - `rfc-create` — 階段 1（R8）：討論、草稿與拷問；`/rfc-create NNNN` 重新拷問既有草稿；
  - `rfc-cascade` — 將 RFC 推進到下一道關卡（R23），只能由人呼叫：
    - 對 `draft`：接受它，接著執行階段 2–4 並撰寫階段 5 的報告；若為 `gates: accept`，也設定 `implemented`（R22）；
    - 對工作未完成（測試失敗、缺少文件）的 `accepted` RFC：繼續完成；
    - 對工作已完成的 `accepted` RFC：顯示階段 5 的報告，並在人確認後才設定 `implemented`，因此接續工作絕不會意外通過最後一道關卡；
  - `translate` — 撰寫翻譯並蓋上雜湊（R2）。
- 壓縮（R25）可在每個工作階段節省 agent 的 context。`/caveman-compress` 會保留 front-matter、標題、程式碼、指令、路徑與連結不變，因此 skill 名稱、需求編號與指令都能保留。它作用於 `AGENTS.md`，絕不透過 `CLAUDE.md` 符號連結執行。其可讀的備份存放在儲存庫之外；之後的修改以相同的壓縮風格撰寫。它需要 caveman Claude Code 外掛；沒有該外掛時，請手動以壓縮風格撰寫。
- `disable-model-invocation` 旗標只約束會遵守它的 agent；其餘由 `AGENTS.md` 中的規則（R23）涵蓋。
- `docs:check` 略過 `.claude/`（其中放 worktree），但 `.claude/skills/` 除外。

## 替代方案
- 手動維護的狀態索引：與 front-matter 重複，容易不一致（改由 R19 產生並檢查）。
- 另設「輕量 RFC」類型：為了三個通常是空白的章節，需要兩套範本與規則；改以可省略的章節加上 `gates` 達到相同效果。
- 一經接受即凍結：會阻礙實作期間的修訂（改採 PEP 式更新，發布後僅能新增）。
- 由 `@path` 行組成的獨立 `CLAUDE.md` 索引：兩個入口需要同步維護。
- 將作業程序寫成 `.agents/*.md` 主題檔：一律載入，且無法阻止 agent 自行執行關卡階段。
- 每個階段一個 skill，另設核准用的 skill：同樣兩道關卡卻需要更多指令；呼叫 `rfc-cascade` 本身就是核准。
- 將拷問放進 `rfc-cascade`：對草稿呼叫它即為核准，無法同時代表「審查這份」；且拷問必須讓 agent 也能使用，只能由人呼叫的 skill 做不到。
- 翻譯也作為來源：兩個真相；不採用。

## 遷移與相容性
僅適用於新的工作。本 RFC 也走自己的流程；`docs:check`（R14）即為其實作。在不支援符號連結的環境（Windows 且 `core.symlinks=false`）中，`CLAUDE.md` 會是內容為 `AGENTS.md` 的文字檔；該環境中的 agent 應直接讀取 `AGENTS.md`。

## 驗證
未標註 *(manual)* 的需求由 `tests/docs-check/` 中的測試涵蓋（以 `npm test` 執行）；範本（0000）本身沒有需求。標註 *(manual)* 的需求由人工審查者在 R12 時檢查。

## 未決問題
無。（給人看的文件除連結外，不檢查是否相對於程式碼過期；交由 R12 審查。）

## 勘誤
