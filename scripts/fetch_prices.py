"""
proj_147 — 拉取 Demo 用歷史股價數據
輸出格式對齊 plan.md §5.1 統一格式
"""
import json
import os
import yfinance as yf

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

STOCKS = {
    "0001.HK": {"symbol": "HKEX:0001", "name": "CK Hutchison",     "exchange": "HKEX", "currency": "HKD", "tz": "Asia/Hong_Kong", "start": "2013-01-01", "end": "2021-01-01"},
    "1113.HK": {"symbol": "HKEX:1113", "name": "CK Asset",          "exchange": "HKEX", "currency": "HKD", "tz": "Asia/Hong_Kong", "start": "2015-06-01", "end": "2021-01-01"},
    "1205.HK": {"symbol": "HKEX:1205", "name": "CITIC Resources",   "exchange": "HKEX", "currency": "HKD", "tz": "Asia/Hong_Kong", "start": "2007-01-01", "end": "2010-01-01"},
    "0939.HK": {"symbol": "HKEX:0939", "name": "CCB",               "exchange": "HKEX", "currency": "HKD", "tz": "Asia/Hong_Kong", "start": "2008-06-01", "end": "2011-01-01"},
    "0700.HK": {"symbol": "HKEX:0700", "name": "Tencent",           "exchange": "HKEX", "currency": "HKD", "tz": "Asia/Hong_Kong", "start": "2017-06-01", "end": "2020-06-01"},
    "0388.HK": {"symbol": "HKEX:0388", "name": "HKEX",              "exchange": "HKEX", "currency": "HKD", "tz": "Asia/Hong_Kong", "start": "2015-01-01", "end": "2017-01-01"},
    "^HSI":    {"symbol": "INDEX:HSI",  "name": "Hang Seng Index",   "exchange": "HKEX", "currency": "HKD", "tz": "Asia/Hong_Kong", "start": "2015-01-01", "end": "2020-06-01"},
}

for yf_ticker, info in STOCKS.items():
    print(f"Fetching {yf_ticker} ({info['name']})...")
    try:
        df = yf.download(yf_ticker, start=info["start"], end=info["end"], progress=False)
        if df.empty:
            print(f"  WARNING: No data for {yf_ticker}")
            continue

        # yfinance returns MultiIndex columns when single ticker, flatten
        if hasattr(df.columns, 'levels'):
            df.columns = df.columns.get_level_values(0)

        records = []
        prev_close = None
        for date, row in df.iterrows():
            o = round(float(row["Open"]), 4)
            h = round(float(row["High"]), 4)
            l = round(float(row["Low"]), 4)
            c = round(float(row["Close"]), 4)
            v = int(row["Volume"])
            adj = round(float(row.get("Adj Close", c)), 4)

            change = round(c - prev_close, 4) if prev_close else 0
            change_pct = round(change / prev_close * 100, 2) if prev_close else 0

            records.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": o, "high": h, "low": l, "close": c,
                "volume": v,
                "adj_close": adj,
                "prev_close": round(prev_close, 4) if prev_close else None,
                "change": change,
                "change_pct": change_pct
            })
            prev_close = c

        output = {
            "meta": {
                "symbol": info["symbol"],
                "name": info["name"],
                "exchange": info["exchange"],
                "currency": info["currency"],
                "timezone": info["tz"],
                "price_precision": 2,
                "data_range": {"start": info["start"], "end": info["end"]},
                "source": "Yahoo Finance (yfinance)",
                "fetched_at": __import__("datetime").datetime.now().isoformat()
            },
            "data": records
        }

        # filename: price_{exchange}_{code}.json
        code = info["symbol"].split(":")[1]
        fname = f"price_{info['exchange']}_{code}.json"
        fpath = os.path.join(OUTPUT_DIR, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"  OK: {len(records)} records → {fname}")

    except Exception as e:
        print(f"  ERROR: {e}")

print("\nDone!")
