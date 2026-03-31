# Signal Dashboard — 未完成功能 + 接手指引

## 更新日期: 2026-03-31

---

## 完成狀態

| Phase | 名稱 | 狀態 | 說明 |
|-------|------|------|------|
| P1 | Demo 可視化 | ✅ | 5 組公開案例 + ECharts |
| P2 | 手動輸入 + 互動 | ✅ | 表單 + 編輯/刪除 + LOG |
| P3 | 公開訊息撈取 | ✅ | HKEX + Google News + 東方財富 |
| P4 | LLM 分析 | ✅ | Gemini 影響力評估 |
| P5 | 即時數據 + 搜尋 | ✅ | KLineChart + 17,898 股票 + tabs |
| P5.4 | 即時股價 | ❌ | 需後端 proxy |
| P6 | 管理面板 | ✅ | 事件/日誌/數據源 |
| P7 | 事件 UX + 架構 | ✅ | ▲▼標記 + 搜尋 + 模組化 + config化 |
| P8 | 進階功能 | ❌ | Alert/多股對比/狀態面板 |

---

## P5.4 — 即時股價接入（未完成）

### 問題
目前股價是靜態 JSON（用 fetch_prices.py 預拉取）。要即時或每日自動更新，需要：
1. 前端直接 fetch Yahoo Finance → **CORS 被擋**
2. 需要一個後端 proxy 或定時任務

### 建議方案（三選一）

**方案 A：GitHub Actions 定時更新（最簡單）**
```yaml
# .github/workflows/update-prices.yml
name: Update Stock Prices
on:
  schedule:
    - cron: '0 10 * * 1-5'  # 每個交易日 UTC 10:00（港股收盤後）
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install yfinance
      - run: python scripts/fetch_prices.py
      - run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add data/price_*.json
          git commit -m "auto: update stock prices" || true
          git push
```
- 優點：零後端，GitHub 免費
- 缺點：每日一次，非即時；需要先修 fetch_prices.py 讓它從 config 讀股票清單

**方案 B：Cloudflare Worker 做 proxy**
```javascript
// worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');
    const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d`);
    return new Response(resp.body, {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
```
- 優點：即時數據，免費（10 萬次/天）
- 缺點：需要 Cloudflare 帳號

**方案 C：本地 Python server 帶 API**
把 `start.bat` 的 `python -m http.server` 換成一個 Flask/FastAPI server，同時提供靜態檔案和 `/api/price?ticker=0700.HK` 接口。
- 優點：完全控制
- 缺點：需安裝 Flask，部署複雜度增加

### 前端改動
不論哪個方案，`js/tabs.js` 的 `openStock()` 需改為：
1. 先嘗試 fetch 本地 `data/price_{exchange}_{code}.json`
2. 如果 404 → fetch proxy API 拉即時數據
3. 拉到後存入 data/ 或 localStorage cache

---

## P8 — 進階功能（未完成）

### P8.1 多股票對比模式

**目標**：勾選多個 tab → 進入對比模式 → 同圖疊加走勢（歸一化 base=100）

**實作要點**：
- `js/tabs.js` 加入多選邏輯（Ctrl+Click 或 checkbox）
- `js/chart.js` 的 `renderChart()` 支援多 stock overlay
- 歸一化公式：`normalized = (price / first_price) * 100`
- KLineChart 支援多 overlay series

**預估工作量**：~200 行 JS

### P8.2 股價 Alert

**目標**：設定「當 XX 股票漲/跌超過 Y% 時通知」

**實作要點**：
- 需要即時股價（依賴 P5.4）
- Alert 規則存 localStorage
- 通知方式：瀏覽器 Notification API 或頁面內 toast
- 私人消息輸入後自動 watch 相關股票

**預估工作量**：~300 行 JS + 需 P5.4 先完成

### P8.3 數據來源狀態面板

**目標**：各撈取源的健康度（綠/黃/紅燈）

**實作要點**：
- admin.js `renderAdminConfig()` 已有基礎框架
- 需要後端定期跑 fetch_news.py 並記錄成功/失敗
- 在 `data/` 下維護 `source_status.json`
- 前端定期 fetch 顯示

**預估工作量**：~150 行 JS + ~50 行 Python

---

## 已知技術債

| 項目 | 嚴重度 | 說明 |
|------|--------|------|
| 跨模組直接呼叫 | 中 | forms.js 直接呼叫 renderChart()，無事件匯流排 |
| 全域變數 | 中 | 6 個全域變數在 app.js，所有模組直接存取 |
| 無 ES Modules | 低 | 用 script tag 載入順序控制，非 import/export |
| 無 TypeScript | 低 | 數據結構靠文件定義，無編譯時檢查 |
| scripts/config.json 重疊 | 低 | 和 config/sources.json 部分重複，可合併 |

### 建議重構路徑（如果要長期維護）
1. 引入 ES Modules（`type="module"`），消除全域變數
2. 用事件匯流排（Event Bus）替代直接跨模組呼叫
3. 合併 scripts/config.json 和 config/sources.json
4. 如果要加即時數據，考慮改用 Vite 或 webpack 做 bundler

---

## 接手 Checklist

- [ ] 讀 docs/ARCHITECTURE.md 了解系統全貌
- [ ] 讀 docs/開發指南.md 了解擴充方式
- [ ] 雙擊 start.bat 確認本地能跑
- [ ] 點 Demo 按鈕確認圖表功能正常
- [ ] 試輸入一筆私人消息，確認表單/標記/列表正常
- [ ] 試匯出 JSON，確認數據完整
- [ ] 跑 `python scripts/fetch_news.py --stock 0700 --days 7` 確認後端腳本正常
- [ ] 讀 config/app.json 了解可配置項
- [ ] 讀 CHANGELOG.md 了解歷史變更
- [ ] 讀本文件了解未完成功能
