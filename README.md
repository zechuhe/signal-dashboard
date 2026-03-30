# Signal Dashboard — 消息面 × 股價關聯分析

可視化「消息事件」與「股價變動」的對應關係，追蹤不同類型消息對股價的影響力。

## 快速開始

```bash
# 1. 下載/Clone 本專案
git clone <repo-url>
cd proj_147_stock_signal_dashboard

# 2. 啟動本地伺服器（需 Python 3）
python -m http.server 8000

# 3. 開啟瀏覽器
# http://localhost:8000
```

> 由於使用 `fetch()` 載入 JSON 資料，無法以 `file://` 協議直接開啟，必須用 HTTP server。

## 功能

- **5 組真實公開案例**：李嘉誠撤資、杜軍內幕交易案、Tiger Asia 案、中美貿易戰、2015 人民幣貶值
- **K 線圖**：蠟燭圖 + MA5/10/20/60 均線（富途風格深色主題）
- **事件標記**：彩色 pin 標記 + 垂直虛線，hover 顯示摘要
- **點擊展開**：右側 Panel 顯示完整事件資訊（來源連結、標籤、影響評估、擴展資訊）
- **雙股票疊圖**：案例涉及多支股票時，第二支以紫色虛線 overlay
- **成交量**：底部紅漲綠跌柱狀圖
- **縮放拖拉**：滾輪縮放 + 拖拽平移 + 底部滑塊
- **時間範圍切換**：3M / 6M / 1Y / 3Y / 全部
- **分類色標**：私人消息（紅）/ 企業公告（青）/ 宏觀事件（黃）/ 政策法規（紫）/ 法律訴訟（橙）

## 檔案結構

```
├── index.html              # 主頁面（單檔，零依賴安裝）
├── data/
│   ├── events.json         # 事件數據（含 5 組案例 + 輸入格式範本）
│   ├── price_HKEX_0001.json  # CK Hutchison 日線
│   ├── price_HKEX_1113.json  # CK Asset 日線
│   ├── price_HKEX_1205.json  # 中信資源 日線
│   ├── price_HKEX_0939.json  # 建設銀行 日線
│   ├── price_HKEX_0700.json  # 騰訊 日線
│   ├── price_HKEX_0388.json  # 港交所 日線
│   └── price_INDEX_HSI.json  # 恆生指數 日線
├── scripts/
│   └── fetch_prices.py     # 股價數據拉取腳本（yfinance）
├── plan.md                 # 專案計畫
└── README.md               # 本檔
```

## 數據格式

### 股價數據（`price_*.json`）

```json
{
  "meta": {
    "symbol": "HKEX:0001",
    "name": "CK Hutchison",
    "exchange": "HKEX",
    "currency": "HKD",
    "timezone": "Asia/Hong_Kong",
    "price_precision": 2
  },
  "data": [
    {
      "date": "2018-03-16",
      "open": 97.50,
      "high": 98.20,
      "low": 93.10,
      "close": 93.85,
      "volume": 28450000,
      "adj_close": 93.85,
      "prev_close": 97.30,
      "change": -3.45,
      "change_pct": -3.55
    }
  ]
}
```

**交易所代碼**：

| exchange | 市場 | 代碼範例 | Yahoo 後綴 |
|----------|------|---------|-----------|
| HKEX | 港股 | 0001, 0700 | .HK |
| NYSE / NASDAQ | 美股 | AAPL, MSFT | 無 |
| TWSE / TPEx | 台股 | 2330, 0050 | .TW / .TWO |
| SSE | A 股上海 | 600519 | .SS |
| SZSE | A 股深圳 | 000001 | .SZ |

### 事件數據（`events.json`）

```json
{
  "event_id": "evt_001",
  "date": "YYYY-MM-DD",
  "title": "事件標題（20字內）",
  "description": "詳細描述",
  "category": "insider_private | public_corporate | public_macro | public_policy | public_legal",
  "source_type": "private | news | government | company_ir | social_media | court_record",
  "source_url": "https://...",
  "related_stocks": ["EXCHANGE:CODE"],
  "expected_impact": "negative | positive | neutral",
  "confidence": 0.8,
  "tags": ["關鍵字"],
  "metadata": {
    "person": "相關人物",
    "person_level": "founder | c_suite | vp | director | manager",
    "company_market_cap_hkd": 0,
    "business_segment_ratio": 0.15,
    "deal_value_hkd": 0,
    "event_scale": "small | medium | large | landmark"
  }
}
```

## 新增數據

### 新增股票
1. 執行 `scripts/fetch_prices.py`（修改 `STOCKS` dict 加入新標的）
2. 或手動建立符合上述格式的 `price_{exchange}_{code}.json`

### 新增事件
編輯 `data/events.json`，在對應 case 的 `events` 陣列中新增條目。

### 新增案例
在 `events.json` 的 `cases` 陣列中新增一組 case，並確保 `related_stocks` 對應的股價 JSON 存在。

## 技術棧

- **圖表**：[ECharts 5.5](https://echarts.apache.org/)（CDN 載入）
- **資料**：靜態 JSON
- **股價來源**：[yfinance](https://github.com/ranaroussi/yfinance)（Yahoo Finance）
- **UI**：富途牛牛風格深色主題

## 擴充方向

| 方向 | 接口預留 |
|------|---------|
| 多市場（台股/美股/A股） | `meta.exchange` + `meta.currency` 已定義 |
| 自動新聞抓取 | `source_type` 欄位 + `source_url` |
| LLM 影響力分析 | `metadata` 中公司體量/業務占比/人員層級 |
| 私人消息輸入 | `category: insider_private` + 輸入表單 |
| 即時股價 | 替換靜態 JSON 為 API 呼叫 |

## 授權

本專案僅供內部分析研究用途。事件資料來自公開新聞報導及法庭紀錄。
