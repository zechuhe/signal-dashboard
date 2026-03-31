# Signal Dashboard 架構說明

## 版本: v2.0
## 更新日期: 2026-03-31

---

## 文件導覽

| 文件 | 讀完你會知道 |
|------|-------------|
| **本文 ARCHITECTURE.md** | 整個系統怎麼運作、模組間怎麼溝通 |
| 開發指南.md | 怎麼新增市場/分類/數據源/頁面功能 |
| 維護手冊.md | 怎麼部署、config 設定、日常維護 |
| TODO.md | 未完成功能（P5.4/P8）+ 接手指引 |
| ../README.md | 快速開始 + 功能列表 |
| ../CHANGELOG.md | 版本變更紀錄 |

---

## 系統全貌

```
┌─────────────────────────────────────────────────────────────────┐
│                    index.html (入口)                              │
│  載入 CSS + 8 個 JS 模組 + KLineChart CDN                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────────────────────────────┐
    │                  前端模組層 (js/)                      │
    │                                                      │
    │  ┌─────────────────────────────────────────────┐     │
    │  │           utils.js (基礎層)                   │     │
    │  │  - loadAppConfig() → 讀 config/app.json      │     │
    │  │  - CATEGORIES / LS_EVENTS / LS_LOG           │     │
    │  │  - getImpactStyle() / getChartConfig()       │     │
    │  │  - getUserEvents() / saveUserEvents()        │     │
    │  │  - getMergedEvents() / addLog()              │     │
    │  └──────────┬──────────────────────────────────┘     │
    │             │ 被所有模組依賴                           │
    │  ┌──────────▼──────────────────────────────────┐     │
    │  │  chart.js    — KLineChart 渲染 + ▲▼ 標記     │     │
    │  │  search.js   — 搜尋 + 模糊比對               │     │
    │  │  tabs.js     — 多股票分頁管理                 │     │
    │  │  events.js   — 事件列表 + 側邊詳情            │     │
    │  │  forms.js    — 新增/編輯表單                  │     │
    │  │  admin.js    — 管理面板                       │     │
    │  └──────────┬──────────────────────────────────┘     │
    │             │                                        │
    │  ┌──────────▼──────────────────────────────────┐     │
    │  │           app.js (入口)                       │     │
    │  │  - 全域狀態 (chart / openStocks / ...)       │     │
    │  │  - init() 啟動流程                           │     │
    │  │  - 鍵盤快捷鍵                               │     │
    │  └─────────────────────────────────────────────┘     │
    └──────────────────────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────────────────────────────┐
    │                  配置層 (config/)                      │
    │  app.json     — UI 配置（分類/圖表/搜尋/交易所）      │
    │  sources.json — 外部 API endpoint                     │
    └──────────────────────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────────────────────────────┐
    │                  數據層 (data/)                        │
    │  stock_list.json   — 股票代碼清單                     │
    │  events.json       — Demo 事件                        │
    │  price_*.json      — 股價數據                         │
    │  public_*.json     — 自動撈取的公開事件               │
    │  analysis_*.json   — LLM 分析結果                     │
    └──────────────────────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────────────────────────────┐
    │                  後端腳本 (scripts/)                   │
    │  fetch_prices.py    — yfinance 股價拉取               │
    │  fetch_news.py      — HKEX/Google/東方財富 新聞撈取   │
    │  analyze_impact.py  — Gemini LLM 影響力分析           │
    └──────────────────────────────────────────────────────┘
```

---

## 模組依賴關係

```
utils.js ← chart.js ← tabs.js
         ← search.js ← tabs.js
         ← events.js ← tabs.js, forms.js
         ← forms.js
         ← admin.js
         ← app.js (imports all)
```

載入順序（index.html）：
1. utils.js（必須第一個，提供 CATEGORIES 等常量）
2. chart.js / search.js / tabs.js / events.js / forms.js / admin.js（互不依賴）
3. app.js（最後載入，宣告全域狀態 + 呼叫 init()）

---

## 全域狀態（app.js）

| 變數 | 類型 | 說明 |
|------|------|------|
| `chart` | KLineChart instance | 圖表實例 |
| `openStocks` | Array | 已開啟的股票 tab [{symbol, name, exchange, code, priceData, events}] |
| `activeTabIdx` | number | 當前選中的 tab index |
| `activeCategories` | Set | 當前啟用的事件分類 |
| `editingId` | string/null | 正在編輯的事件 ID |
| `stockList` | Array | 搜尋用的股票代碼清單 |
| `APP_CONFIG` | Object | config/app.json 的內容（utils.js 載入） |

---

## 數據流

### 股價數據
```
yfinance → fetch_prices.py → data/price_{exchange}_{code}.json → 前端 fetch → chart.applyNewData()
```

### 私人消息
```
用戶表單 → forms.js submitEvent() → localStorage → getMergedEvents() → chart overlay
```

### 公開事件
```
HKEX/Google/東方財富 → fetch_news.py → JSON → 前端「載入事件」按鈕 → stock.events[] → chart overlay
```

### LLM 分析
```
events.json + price.json → analyze_impact.py → analysis.json → 前端「載入分析」按鈕 → 事件詳情面板
```

---

## Config 架構

### config/app.json（前端 UI 配置）

| 區塊 | 用途 | 修改場景 |
|------|------|---------|
| `categories` | 事件分類定義（名稱/顏色） | 新增事件類型 |
| `impact` | 影響力樣式（利好/利空/中性的顏色/標記/偏移） | 調整視覺效果 |
| `chart` | KLineChart 設定（蠟燭色/MA 參數/VOL 高度） | 調整圖表參數 |
| `timeRanges` | 時間範圍按鈕定義 | 新增/修改時間範圍 |
| `search` | 搜尋設定（maxResults/stockListUrl） | 調整搜尋行為 |
| `storage` | localStorage key | 多實例場景 |
| `exchanges` | 交易所定義（名稱/Yahoo 後綴/幣種） | 新增市場 |
| `cdn` | CDN 依賴 URL | 升級 KLineChart |
| `app.port` | HTTP server port | 網路環境限制 |

### config/sources.json（後端 API 配置）

| 區塊 | 用途 |
|------|------|
| `sources.hkex` | 港交所公告 API |
| `sources.google_news` | Google News RSS |
| `sources.eastmoney` | 東方財富搜索 API |
| `fetch_settings` | 請求延遲/重試/timeout |

---

## 更新規則

1. **功能修改**：修改對應 js 模組 → 測試 → 更新 CHANGELOG.md
2. **Config 修改**：只改 config/*.json，不動代碼
3. **新增分類**：改 config/app.json `categories` → 自動生效（filter bar + 表單 + 標記）
4. **新增市場**：改 config/app.json `exchanges` + 補 stock_list.json
5. **新增數據源**：改 config/sources.json + 寫對應 Python fetcher
6. **版號規則**：Major.Minor（v1.0/v2.0），CHANGELOG 按日期倒序
