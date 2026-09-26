<!-- source-sha256: 2e791470e1195d2b632912f277ce2d847770afecb9689c23747c3677ec1fd8b6 -->

> 本文為 [README.md](README.md) 的翻譯，內容以英文版為準。

# RFC

Einstein 的每項決策都從這裡開始——新增或變更的行為、介面、架構、重要的相依套件、流程本身。錯誤修正、重構、相依套件版本更新與文件更正不需要 RFC，但不得與 RFC 牴觸。流程由 [RFC 0001](0001-rfc-process.md) 定義；新的 RFC 從[範本](0000-template.md)開始。

## 流程

1. **草擬** — 與程式 agent 一起執行 `/rfc-create <topic>`：先對目的取得共識、從選項中挑選，再由 agent 與你一起拷問草稿。手動方式：`npm run rfc:new -- <kebab-title>`。無論哪種方式，都要加上 `.zh-tw.md` 翻譯。
2. **接受** — 你執行 `/rfc-cascade NNNN` 即為核准：設為 `status: accepted`；新增會失敗、並引用每項需求（`RFC-NNNN/Rn`）的測試，標註 *(manual)* 的人工審查需求除外；在 `AGENTS.md` 撰寫 agent 指示，並在 `.claude/skills/` 撰寫 skill。
3. **實作** — 撰寫程式碼，直到 `npm test` 與 `npm run docs:check` 通過。
4. **文件** — 在 `README.md` 與 `docs/` 撰寫給人看的文件，每份皆附 `.zh-tw.md`。
5. **驗證** — agent 回報每項需求如何被涵蓋；你審查後再次執行 `/rfc-cascade NNNN` 並確認：設為 `status: implemented`。小型決策設定 `gates: accept`，略過此核准。

對草稿執行 `/rfc-cascade NNNN` 後，agent 會自行完成階段 2–4。只有人能執行 `/rfc-cascade`；agent 無法通過關卡。手動方式：`npm run rfc:status -- NNNN <status>` 可變更狀態。

原則：
- RFC 只能引用編號較小的 RFC，並列出保留或變更了哪些較早的需求。
- RFC 在發布（進入 `dev`，或位於非草稿 pull request）之前，一律直接修改原文。發布之後：`accepted` 的 RFC 只能新增內容；`implemented` 的 RFC 只能修改狀態與勘誤。
- 英文為來源；翻譯檔記錄來源的 SHA-256，來源一變更即視為過期。
- *追溯式* RFC 記錄程式碼中既有的決策。

## 索引

由 `npm run docs:index` 產生——請勿手動修改。

<!-- rfc-index:start -->
| RFC | Title | Status |
|---|---|---|
| [0000](0000-template.md) | RFC template | implemented |
| [0001](0001-rfc-process.md) | RFC-driven development process | accepted |
<!-- rfc-index:end -->
