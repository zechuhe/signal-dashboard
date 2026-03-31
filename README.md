# Signal Dashboard — 消息面 × 股價關聯分析

追蹤「私人消息」→「公開消息」→「股價反應」的時間差和影響力。不是看盤工具，是消息影響力評估系統。

## 快速開始

### Windows
```
雙擊 start.bat
```
自動偵測可用 port 並開啟瀏覽器。如需指定 port：`start.bat 9000`

### 手動啟動
```bash
git clone https://github.com/zechuhe/signal-dashboard.git
cd signal-dashboard
python -m http.server 8443
# 開啟 http://localhost:8443
```

> 由於使用 `fetch()` 載入 JSON 資料，無法以 `file://` 協議直接開啟，必須用 HTTP server。

### Port 配置
- 預設 port: `8443`
- 修改方式：`start.bat <port>` 或 `set PORT=9000 && start.bat`
- start.bat 會自動嘗試備選 port（8443/9443/8080/9000/5000/3000/4000）

## 功能

### 圖表（KLineChart 引擎）
- K 線蠟燭圖 + MA5/10/20/60 均線
- 成交量子圖（紅漲綠跌）
- 滾輪縮放 + 拖拽平移
- 十字游標 + OHLCV 即時顯示
- 時間範圍切換：3M / 6M / 1Y / 3Y / 全部

### 事件標記
- ▲ 紅色利多 / ▼ 綠色利空 / ◆ 灰色中性
- 5 種分類色標：私人消息（紅）/ 企業公告（青）/ 宏觀事件（黃）/ 政策法規（紫）/ 法律訴訟（橙）
- 分類 checkbox 可勾選顯示/隱藏

### 股票搜尋
- 模糊比對（代碼前綴 + 公司名）
- 預載 17,898 支股票（HKEX 完整 + US/TW/A 精選）
- 分頁式多股票 tabs（搜一支開一個 tab）

### 事件管理
- 新增/編輯/刪除私人消息（結構化表單）
- 事件列表（按時間排序 + 搜尋篩選）
- 操作日誌（新增/編輯/刪除 LOG）
- 匯出/匯入 JSON

### 管理面板（齒輪按鈕）
- 事件管理：全部事件 CRUD + source 標籤
- 操作日誌：完整 LOG 查看
- 數據源：HKEX / Google News / 東方財富 狀態

### 後端腳本
- `scripts/fetch_prices.py` — 拉取歷史股價（yfinance）
- `scripts/fetch_news.py` — 自動撈取公開新聞（HKEX + Google News + 東方財富）
- `scripts/analyze_impact.py` — LLM 影響力分析（Gemini API）

## 架構

```
signal-dashboard/
├── index.html                  # 主入口（HTML 骨架）
├── start.bat                   # 雙擊啟動（auto port）
│
├── css/
│   └── main.css                # 樣式（深色主題）
│
├── js/                         # 前端模組
│   ├── utils.js                # 常量 + localStorage 工具
│   ├── chart.js                # KLineChart 渲染 + 事件標記
│   ├── search.js               # 股票搜尋 + 模糊比對
│   ├── tabs.js                 # 多股票分頁管理
│   ├── events.js               # 事件列表 + 匯入匯出 + Demo
│   ├── forms.js                # 新增/編輯事件表單
│   ├── admin.js                # 管理面板（事件/日誌/數據源）
│   └── app.js                  # 初始化 + 狀態 + 鍵盤快捷鍵
│
├── config/
│   └── sources.json            # 外部 API endpoint 配置
│
├── data/
│   ├── stock_list.json         # 股票代碼清單（17,898 支）
│   ├── events.json             # Demo 事件數據
│   └── price_*.json            # 股價數據
│
├── scripts/                    # 後端 Python 腳本
│   ├── config.json             # 腳本用 API 配置
│   ├── fetch_prices.py         # 股價拉取
│   ├── fetch_news.py           # 新聞撈取
│   └── analyze_impact.py       # LLM 影響力分析
│
└── docs/
    └── analysis_user_feedback_v1.md
```

## 數據格式

### 股價（price_*.json）
```json
{
  "meta": { "symbol": "HKEX:0001", "name": "CK Hutchison", "exchange": "HKEX", "currency": "HKD" },
  "data": [{ "date": "2024-01-02", "open": 50.0, "high": 51.0, "low": 49.5, "close": 50.5, "volume": 1000000 }]
}
```

### 事件（events.json）
```json
{
  "event_id": "evt_001",
  "date": "2024-01-15",
  "title": "事件標題",
  "description": "詳細描述",
  "category": "insider_private | public_corporate | public_macro | public_policy | public_legal",
  "source_type": "private | news | government | company_ir | court_record",
  "source_url": "https://...",
  "related_stocks": ["HKEX:0001"],
  "expected_impact": "negative | positive | neutral",
  "confidence": 0.8,
  "tags": ["keyword"],
  "metadata": { "person": "...", "person_level": "founder | c_suite | vp | manager" }
}
```

### 交易所代碼
| exchange | 市場 | 代碼範例 | Yahoo 後綴 |
|----------|------|---------|-----------|
| HKEX | 港股 | 0001, 0700 | .HK |
| NYSE / NASDAQ | 美股 | AAPL, MSFT | 無 |
| TWSE | 台股 | 2330, 0050 | .TW |
| SSE | A股上海 | 600519 | .SS |
| SZSE | A股深圳 | 000001 | .SZ |

## 後端腳本用法

```bash
# 拉取股價
python scripts/fetch_prices.py

# 撈取公開新聞
python scripts/fetch_news.py --stock 0700 --days 30 --output data/public_events_0700.json

# LLM 影響力分析
python scripts/analyze_impact.py --events data/events.json --prices data/price_HKEX_0001.json --llm --output data/analysis.json
```

## 技術棧
- 圖表：[KLineChart v9.8.12](https://github.com/klinecharts/KLineChart)（零依賴 40KB）
- 資料：靜態 JSON + localStorage
- 股價來源：[yfinance](https://github.com/ranaroussi/yfinance)
- 新聞來源：HKEX News / Google News / 東方財富
- LLM：Gemini 2.5 Flash

## 授權
本專案僅供內部分析研究用途。
