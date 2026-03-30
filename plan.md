# proj_147 — 消息面×股價關聯分析 Dashboard（Demo HTML）

## Changelog
| 版本 | 日期 | 變更原因 | 變更摘要 |
|------|------|---------|---------|
| v1 | 2026-03-30 | 初版 | — |
| v1.1 | 2026-03-30 | API 格式調研 | 新增 §5.1 統一數據格式（對齊 Yahoo/Fugle/Tushare 實際格式）、§8 更新富途 UI 設計規範 |

## 1. 目標

產出一份獨立運行的 Demo HTML（單檔或少量檔案），包含真實公開案例的 demo data，展示「消息事件×股價」關聯可視化。部署到 GitHub，供 CEO 團隊接手開發。

**非目標（MVP 排除）**：自動抓取新聞、LLM 影響力分析、多市場即時數據、私人消息輸入介面。這些在架構中預留擴充點，但 Demo 不實作。

## 2. 等級判定

**M 級**（跨多檔、增強型）— 需產出 HTML/JS/CSS + demo data + GitHub repo。

## 3. 技術選型

| 層 | 選擇 | 理由 |
|----|------|------|
| 圖表庫 | **ECharts** (CDN) | 免費、功能強、支援大量標記點/tooltip/縮放、中文社群大 |
| 資料格式 | JSON | 前端直接載入，CEO 團隊易懂 |
| 股價數據 | **yfinance** 預拉取 → JSON | Demo 用靜態數據，免即時 API 依賴 |
| 前端框架 | 純 HTML/JS | 零依賴，雙擊開啟即可用 |
| 部署 | GitHub Pages | CEO 團隊有瀏覽器就能看 |

## 4. Demo 案例（5 組公開真實案例）

### 案例 1：李嘉誠撤資大陸（2013-2020）
- **股票**：CK Hutchison (0001.HK) / CK Asset (1113.HK)
- **事件**：出售廣州西城都薈（2013-08）、上海陸家嘴物業（2013-10）、屈臣氏 25% 股權（2014）、長實重組遷冊開曼（2015-01）、上海世紀匯 200 億（2016）、中環中心 402 億（2017）、李嘉誠退休（2018-03-16）
- **來源**：Reuters、SCMP、財新網 `https://topics.caixin.com/likashing/`

### 案例 2：杜軍內幕交易案（2007）— 港史最長刑期
- **股票**：中信資源 (1205.HK)
- **事件**：摩根士丹利前 MD 在擔任收購顧問期間透過親屬帳戶買入，公布後漲 ~50%
- **來源**：SFC 執法公告、DCCC 830/2008 判決

### 案例 3：Tiger Asia 配售內幕交易（2008-2009）
- **股票**：中國建設銀行 (0939.HK)
- **事件**：知悉配股折讓訊息後提前沽空，獲利 3,850 萬港元
- **來源**：SFC 公告、FACV 15/2012 終審法院判決

### 案例 4：中美貿易戰衝擊（2018-2019）
- **股票**：騰訊 (0700.HK) + 恆指 (^HSI)
- **事件**：Trump 簽署關稅備忘錄（2018-03-22）、首批關稅生效（2018-07-06）、2000 億追加（2018-09）
- **來源**：Reuters 貿易戰時間線

### 案例 5：2015 人民幣貶值 Black Monday
- **股票**：港交所 (0388.HK) + 恆指 (^HSI)
- **事件**：人行意外貶值（2015-08-11）、黑色星期一 HSI 單日 -5.2%（2015-08-24）
- **來源**：Bloomberg、Reuters

## 5. 事件數據格式（擴充用）

```json
{
  "event_id": "evt_001",
  "date": "2013-08-15",
  "title": "李嘉誠出售廣州西城都薈",
  "description": "長實系出售廣州西城都薈商場及停車場，約 30 億港元，輿論首次大規模關注撤資",
  "category": "insider_private | public_corporate | public_macro | public_policy | public_legal",
  "source_type": "private | news | government | company_ir | social_media",
  "source_url": "https://...",
  "related_stocks": ["0001.HK", "1113.HK"],
  "expected_impact": "negative | positive | neutral",
  "confidence": 0.8,
  "tags": ["asset_disposal", "executive", "real_estate"],
  "metadata": {
    "company_market_cap_hkd": 300000000000,
    "business_segment_ratio": 0.15,
    "person_level": "founder",
    "event_scale": "large"
  }
}
```

## 5.1 統一股價數據格式（對齊實際 API）

調研 Yahoo Finance / Alpha Vantage / TWSE / Fugle / Tushare / AKShare / Futu OpenAPI / Tiger 後，統一格式如下：

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
      "turnover": 2710000000,
      "adj_close": 93.85,
      "prev_close": 97.30,
      "change": -3.45,
      "change_pct": -3.55
    }
  ]
}
```

**設計決策（對齊主流 API 的交集）**：
| 決策 | 理由 |
|------|------|
| `open/high/low/close/volume` 欄位名 | Yahoo/Fugle/Tiger 共用，最通用 |
| Symbol 格式 `{exchange}:{code}` | 避免歧義（如 `0001` 在 HK/TW 不同意義），Futu 用 `HK.00700` 類似概念 |
| 日期 ISO 8601 `YYYY-MM-DD` | Fugle/AKShare 原生格式，Yahoo 用 Unix timestamp 需轉換，TWSE 用民國年需轉換，Tushare 用 YYYYMMDD 需加 hyphen |
| 值一律 number | TWSE/Alpha Vantage 回傳 string，需轉換 |
| volume 以「股」為單位 | Tushare 以「手（100 股）」計，需 ×100 |
| turnover 以原始貨幣為單位 | Tushare 以「千」計需 ×1000 |
| currency 顯式標記 | 多市場必要，Yahoo meta.currency 有此欄位 |

**交易所代碼對照（擴充用）**：
| exchange | 市場 | 代碼範例 | Yahoo 後綴 |
|----------|------|---------|-----------|
| HKEX | 港股 | 0001, 0700 | .HK |
| NYSE / NASDAQ | 美股 | AAPL, MSFT | 無後綴 |
| TWSE / TPEx | 台股 | 2330, 0050 | .TW / .TWO |
| SSE | A 股上海 | 600519 | .SS |
| SZSE | A 股深圳 | 000001 | .SZ |

## 6. 檔案結構

```
proj_147_stock_signal_dashboard/
├── index.html              # 主頁面（ECharts 圖表 + 事件標記 + 互動）
├── data/
│   ├── events.json         # 全部事件數據
│   ├── price_0001HK.json   # CK Hutchison 日線
│   ├── price_1113HK.json   # CK Asset 日線
│   ├── price_1205HK.json   # 中信資源 日線
│   ├── price_0939HK.json   # 建設銀行 日線
│   ├── price_0700HK.json   # 騰訊 日線
│   ├── price_0388HK.json   # 港交所 日線
│   └── price_HSI.json      # 恆生指數 日線
├── README.md               # 繁體中文（安裝/操作/架構說明）
└── plan.md                 # 本計畫
```

## 7. 執行步驟

| # | 步驟 | 產出 |
|---|------|------|
| 1 | 用 yfinance 拉取 7 支股票/指數歷史日線 → 存 JSON | `data/price_*.json` |
| 2 | 整理 5 組案例事件數據 → 存 JSON | `data/events.json` |
| 3 | 開發 index.html（ECharts 圖表 + 事件標記 + Tooltip + 切換案例） | `index.html` |
| 4 | 功能驗證：自測所有案例切換、Tooltip 展開、縮放拖拉 | 測試紀錄 |
| 5 | 撰寫 README.md | `README.md` |
| 6 | 建 GitHub repo + push + 開 Pages | repo URL |

## 8. Dashboard 互動設計

- **案例切換**：頂部 Tab 或下拉選單，切換 5 組案例
- **股價折線**：日 K 線（收盤價），X 軸為日期，Y 軸為價格
- **事件標記**：在對應日期位置顯示旗幟/箭頭圖標
- **Hover Tooltip**：顯示事件標題 + 日期 + 簡述 + 來源連結
- **點擊展開**：側邊 Panel 或 Modal，顯示完整事件資訊（含 metadata、影響評估）
- **縮放**：ECharts dataZoom 元件，可拖拉聚焦特定時間段
- **事件分類色標**：不同 category 用不同顏色標記

## 9. 擴充預留（架構設計，MVP 不實作）

| 擴充方向 | 預留方式 |
|---------|---------|
| 多市場 | events.json 中 `related_stocks` 支援任意代碼格式；price loader 可依代碼後綴判斷市場 |
| 自動輸入源 | `source_type` 欄位已定義；未來加 fetcher 模組即可 |
| LLM 分析 | `metadata` 中預留公司體量/業務占比/人員層級；未來送 LLM 做分類 |
| 私人消息 | `category: insider_private` 已定義；加輸入表單即可 |

## 10. 預估 Token / 時間

| Phase | 預估 Token |
|-------|-----------|
| P0 開案 + P1 計畫 | ~15k |
| P2 數據拉取 + 事件整理 | ~20k |
| P3 HTML 開發 | ~40k |
| P4 測試 + README + GitHub | ~15k |
| **合計** | **~90k** |

## 11. 修改檔案清單（PDCA 預授權）

| 檔案 | 操作 |
|------|------|
| `Projects/proj_147_stock_signal_dashboard/index.html` | 新建 |
| `Projects/proj_147_stock_signal_dashboard/data/*.json` | 新建（8 檔） |
| `Projects/proj_147_stock_signal_dashboard/README.md` | 新建 |
| `.agent/claude-dashboard/data/tasks/task_proj_147.js` | 更新步驟/狀態 |

Bash 指令類型：`python`（yfinance 拉資料）、`git`（init/commit/push）、`start`（開 HTML 預覽）
