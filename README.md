# ☕ 摸啡人生｜雙北咖啡廳 LLM Wiki

> 想讓你找到雙北最讚的摸啡地點 ( •ω•)ノ☕

「摸啡」取自台語「摸飛」（moo-hui，摸魚的意思）。這是我一個人在台北、新北跑咖啡廳的筆記網站。我只負責提供隨手筆記、Google Maps 連結和照片，AI 依照 [`AGENTS.md`](AGENTS.md) 的規則整理成店家頁、地區頁、標籤頁與報告，網站會自動讀取並顯示。

- 🌐 網站：https://<你的帳號>.github.io/<repo 名稱>/
- 📘 AI 規則：[AGENTS.md](AGENTS.md)（Claude Code 透過 [CLAUDE.md](CLAUDE.md) 讀取同一份）

## 功能

- **首頁**：「🎲 今天去哪摸啡？」隨機推薦，店家卡片可依縣市、行政區、標籤、關鍵字篩選，也能依 Google 評分、安靜度、讀書工作排序
- **店家頁**：封面照片、Google 評分、「📍 點我看位置！」、我的體感（咖啡、甜點、氣氛、安靜度、讀書工作）、心得
- **探索**：地區、標籤詞彙表、AI 產生的分析報告
- **關於**：名稱由來、評分方式、參考網站

## 資料流程

```
筆記＋Google 連結＋評分＋照片
        │  (AI 依 AGENTS.md ingest)
        ▼
raw/notes/  raw/photos/ ──▶ wiki/shops/*.md、wiki/areas/*.md、wiki/log.md
                            assets/img/shops/<id>/cover.jpg（scripts/cover.py）
        │  node scripts/build.js（驗證）
        ▼
wiki/index.json ──▶ 網站
```

## 新增一家店

1. 複製 `inbox/_範本.md`，檔名改成店名，填好筆記、**Google Maps 連結**、**Google 評分**（缺一不可）
2. 把**照片**也丟進 `inbox/`
3. 跟 AI 說：「處理 inbox」
4. AI 把資料存進 `raw/`、產生封面、建立店家頁、更新地區頁、執行 build、寫 log，最後清空 inbox
5. `git push`，GitHub Pages 自動更新

## 本機預覽

執行 `node scripts/build.js` 後，直接點兩下 `index.html` 就能在瀏覽器看到網站（需要連網載入字型與 Markdown 套件）。

## 技術

純 HTML / CSS / JavaScript，無框架、無建置工具。marked 12.0.2（Markdown 渲染）、Node.js 驗證腳本（無外部套件）、Python + Pillow 封面處理。
