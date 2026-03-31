# Signal Dashboard 變更日誌

## [2026-03-31] v2.0 — KLineChart + 模組化架構 + 參數 config 化

### 架構重構
- **圖表引擎**：ECharts → KLineChart v9.8.12（零依賴 40KB，內建技術指標）
- **模組化拆分**：單檔 1177 行 → 10 個模組（css/js/config 分離）
- **參數 config 化**：所有 UI 配置外部化至 `config/app.json`，修改不需動代碼

### 新功能
- **股票搜尋**：模糊比對（代碼+公司名），預載 17,898 支股票清單
- **分頁式多股票**：搜一支開一個 tab，可同時開多支
- **事件分類選擇器**：新增事件時可選任意分類（不再限定私人消息）
- **管理面板**：齒輪按鈕 → 事件管理 / 操作日誌 / 數據源狀態
- **事件搜尋**：事件列表即時關鍵字篩選
- **LLM 分析**：analyze_impact.py 支援 Gemini 影響力評估
- **公開新聞撈取**：fetch_news.py 三源（HKEX + Google News + 東方財富）

### Bug 修復
- 事件列表無法展開（flex 佈局下 max-height 動畫失效）
- 事件標記可拖曳（加 lock:true 禁止）
- 管理面板和事件詳情 overlay 互相干擾

### 修改檔案
- `index.html` — HTML 骨架（162 行，原 1177 行）
- `css/main.css` — 全部樣式（330 行）
- `js/*.js` — 8 個模組（utils/chart/search/tabs/events/forms/admin/app）
- `config/app.json` — UI 配置
- `config/sources.json` — API endpoint 配置
- `start.bat` — auto port + Python 路徑偵測

## [2026-03-30] v1.0 — Demo HTML（P1-P4）

### 新功能
- 5 組真實公開案例（李嘉誠撤資/杜軍案/Tiger Asia/貿易戰/人民幣貶值）
- ECharts K 線圖 + 事件標記 + 互動展開
- 私人消息輸入表單 + localStorage
- 事件圖層 checkbox 開關
- 事件編輯/刪除 + 操作日誌
- 匯出/匯入 JSON
- GitHub Pages 部署

### 修改檔案
- `index.html`（單檔，含全部 CSS/JS）
- `data/events.json`（5 組案例 23 個事件）
- `data/price_*.json`（7 支股票歷史日線）
- `scripts/fetch_prices.py`
- `scripts/fetch_news.py`
- `scripts/analyze_impact.py`
