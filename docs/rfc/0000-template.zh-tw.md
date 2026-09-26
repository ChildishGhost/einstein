<!-- source-sha256: 0a4eb9b5031f26ab0eb7b5b2384c520d9a9543bf44ae309aa897949b8b0d6d82 -->

> 本文為 [0000-template.md](0000-template.md) 的翻譯，內容以英文版為準。

---
rfc: 0000
title: RFC template
status: implemented
created: 2026-09-26
references: []
---

# RFC 0000：RFC 範本

複製本檔為 `NNNN-kebab-title.md`（取下一個可用編號），填寫章節並刪除說明文字。以下章節僅在需要時加入：*替代方案*、*遷移與相容性*、*未決問題*（放在驗證之前）、*勘誤*（放在最後，接受之後才加入）。

---

```yaml
---
rfc: NNNN
title: <簡短標題>
status: draft            # 見 RFC 0001
created: YYYY-MM-DD
references: [0001]       # 僅能引用編號較小的 RFC
supersedes: []           # 選填
superseded-by: null      # 僅由之後的 RFC 設定
retroactive: null        # commit 雜湊，僅用於記錄既有程式碼的 RFC
gates: accept, verify    # 小型決策可設為 `accept`（只有一道人工關卡）
---
```

# RFC NNNN：<標題>

## 摘要
一段話：改變什麼、為什麼。

## 動機
要解決的問題，以及為何是現在。

## 需求
編號、可測試的敘述。其他地方以 `RFC-NNNN/Rn` 引用。僅能人工審查的需求，在編號後標註 `*(manual)*`。敘述系統做什麼；否定句只用於可測試的限制（RFC-0001/R26）。

- **R1** — …
- **R2** — …

## 設計
如何滿足需求。必要時附圖。

## 與較早 RFC 的關係
當本 RFC 變更較早的行為時必填。列出涉及的每一項較早需求：`RFC-NNNN/Rn` — 保留 | 變更（原因）。

## 驗證
每項需求如何檢查（測試、`docs:check`、人工）。
