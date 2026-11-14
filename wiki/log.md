# 變更紀錄

> 新紀錄加在最上面。格式見 AGENTS.md 5.7。

## [2026-11-15] update | 標籤說明改成給讀者看的口吻、地區與標籤頁文字加寬
- 10 個標籤的說明與判定標準重寫，移除欄位名稱（time_limit、dessert 分數）與「我的筆記有寫」等整理過程用語
- 地區頁、標籤頁、報告的文字與店家卡片同寬，關於頁維持較窄
- AGENTS.md 5.9 新增「網站文字是寫給讀者看的」，build 新增欄位名稱檢查

## [2026-11-15] structure | 修正中文斷行
- 新增 wrapCJK()：用 Intl.Segmenter 斷詞，只在詞與詞之間或標點後換行，修正「草／莓」「說／話」被拆開
- 取消 text-wrap: balance，改回一般寬度排版

## [2026-11-15] structure | 依「想改的地方 3」調整網站
- 刪除六丁目的「再訪紀錄」段落，規則改為不寫再訪紀錄（造訪資訊只記在 visited、visits）
- 店家資訊的價位只顯示 $ 符號，價位說明保留在首頁與關於頁
- 探索頁標籤卡片的家數改成淺咖色
- 文字自動平衡換行，避免最後一行只剩一兩個字
- 修正標籤頁「判定標準」粗體顯示成星號的問題，build 新增粗體格式檢查
- 用 Chrome 以電腦與手機寬度實際截圖檢查版面

## [2026-11-15] structure | 依「想改的地方 2」調整網站
- 探索頁：副標題去掉句號；台北市、新北市兩個框等大；標籤與報告改成可點擊的卡片
- 標籤：刪除 photogenic、quiet、specialty、pet-friendly；wifi 改名「有 Wi-Fi」（判定改為有提供即可），360咖啡廳、羊毛與花加上 wifi
- 店家頁：封面大圖＋內文照片合併成一個照片區（全部照片一排、箭頭＋圓點、點擊放大）；cover.py 改為一次產生封面與全部照片
- 我的體感刪除「咖啡」；價位改以「一份餐點＋一杯飲料」估算，首頁、店家頁、關於頁都有價位說明
- 全站連結去掉底線，改成按鈕／卡片／標籤樣式，滑鼠碰到換顏色；關於頁參考網站改成卡片
- 所有頁面內容去掉句號、移除內文連結與內文圖片；新增 AGENTS.md 5.9 寫作格式，build 會檢查

## [2026-11-14] ingest | 360咖啡廳、Cong Caphe 台北總店、Douceur Café 暖日、Coffee loopy、六丁目、羊毛與花 ‧ 永康
- 新增 wiki/shops/：360-cafe、cong-caphe-zhongzheng、douceur-cafe、coffee-loopy、liudingmu、yangmao-yu-hua-yongkang
- 新增 wiki/areas/：taipei-songshan、taipei-daan、newtaipei-zhonghe、newtaipei-yonghe；改寫 taipei-zhongzheng
- 新增標籤 chat（💬 適合聊天，4 家使用）
- raw/photos 資料夾由店名改為 shop-id；封面與內文照片由 scripts/cover.py 產生
- 刪除測試資料 test-cafe；清空 inbox
- 缺漏欄位：price（coffee-loopy、cong-caphe-zhongzheng、liudingmu、yangmao-yu-hua-yongkang）、time_limit（coffee-loopy、cong-caphe-zhongzheng、douceur-cafe）

## [2026-11-14] structure | 新增 inbox 投遞區、允許 share.google 連結
- 新增 inbox/ 與 _範本.md；ingest 流程改為從 inbox 讀取
- cover.py 支援內文照片（01.jpg、02.jpg）

## [2026-11-14] structure | 改名摸啡人生、移除地圖、改用 Google 評分
- 網站名稱改為「摸啡人生」，新標語與頁尾，關於頁加入名稱由來與參考網站
- 移除地圖與 lat/lng；新增必填 map_url（📍 點我看位置！）、google_rating、rating_checked、cover
- 移除 overall，主要評分改為 Google 評分；五項體感分數保留
- 新增 scripts/cover.py、首頁「🎲 今天去哪摸啡？」、顏文字規則（AGENTS.md 5.8）

## [2026-11-14] structure | 建立專案
- 建立 AGENTS.md、CLAUDE.md、資料夾結構、templates、標籤詞彙表（13 個）、build 腳本與網站頁面
