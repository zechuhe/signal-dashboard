"""
proj_147 P3 — 公開訊息自動撈取腳本
從 HKEX 公告 + Google News + 東方財富 抓取新聞，輸出為 events.json 格式

用法：
  python fetch_news.py --stock 0700 --days 30
  python fetch_news.py --stock 0700 --from 2024-01-01 --to 2024-03-31
  python fetch_news.py --stock 0700 --days 30 --output data/public_events.json
"""

import json
import os
import sys
import time
import re
import argparse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from urllib.parse import quote, urlencode

# Config
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "config.json")

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    CONFIG = json.load(f)

try:
    import requests
except ImportError:
    print("ERROR: requests 未安裝。執行: pip install requests")
    sys.exit(1)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": CONFIG["fetch_settings"]["user_agent"]})
DELAY = CONFIG["fetch_settings"]["request_delay_sec"]
TIMEOUT = CONFIG["fetch_settings"]["timeout_sec"]


# ===== HKEX =====
_hkex_stock_map = None

def _load_hkex_stock_map():
    """載入 HKEX 股票代碼 → 內部 ID 對照表"""
    global _hkex_stock_map
    if _hkex_stock_map is not None:
        return _hkex_stock_map

    cache_path = os.path.join(SCRIPT_DIR, ".hkex_stock_cache.json")
    # Use cache if less than 7 days old
    if os.path.isfile(cache_path):
        age = time.time() - os.path.getmtime(cache_path)
        if age < 7 * 86400:
            with open(cache_path, "r") as f:
                _hkex_stock_map = json.load(f)
                return _hkex_stock_map

    url = CONFIG["sources"]["hkex"]["endpoints"]["stock_list"]
    print(f"  Fetching HKEX stock list from {url}...")
    resp = SESSION.get(url, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    _hkex_stock_map = {}
    for item in data:
        code = item.get("c", "").lstrip("0") or "0"
        _hkex_stock_map[item["c"]] = {"id": item["i"], "name": item.get("n", "")}
        # Also map without leading zeros
        _hkex_stock_map[code] = {"id": item["i"], "name": item.get("n", "")}

    with open(cache_path, "w") as f:
        json.dump(_hkex_stock_map, f)
    return _hkex_stock_map


def fetch_hkex(stock_code, from_date, to_date, max_results=20):
    """從港交所抓取公告"""
    if not CONFIG["sources"]["hkex"]["enabled"]:
        return []

    stock_map = _load_hkex_stock_map()
    padded = stock_code.zfill(5)
    info = stock_map.get(padded) or stock_map.get(stock_code)
    if not info:
        print(f"  WARNING: HKEX 找不到股票代碼 {stock_code}")
        return []

    cfg = CONFIG["sources"]["hkex"]
    params = {
        "sortDir": 0,
        "sortByOrder": "DateTime",
        "category": 0,
        "market": cfg["defaults"]["market"],
        "stockId": info["id"],
        "documentType": cfg["defaults"]["document_type"],
        "fromDate": from_date.strftime("%Y%m%d"),
        "toDate": to_date.strftime("%Y%m%d"),
        "rowRange": min(max_results, cfg["defaults"]["row_range"]),
        "lang": cfg["defaults"]["lang"],
    }

    url = cfg["endpoints"]["search"]
    print(f"  HKEX: Fetching announcements for {padded} ({info['name']})...")
    resp = SESSION.get(url, params=params, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()

    # result is a JSON string inside JSON — double parse
    result_str = data.get("result", "[]")
    if isinstance(result_str, str):
        filings = json.loads(result_str)
    else:
        filings = result_str

    events = []
    for f in filings:
        title = f.get("SHORT_TEXT") or f.get("TITLE", "")
        title = re.sub(r"<[^>]+>", "", title).strip()
        dt_str = f.get("DATE_TIME", "")
        try:
            dt = datetime.strptime(dt_str, "%d/%m/%Y %H:%M")
            date_iso = dt.strftime("%Y-%m-%d")
        except ValueError:
            date_iso = to_date.strftime("%Y-%m-%d")

        file_link = f.get("FILE_LINK", "")
        source_url = cfg["endpoints"]["file_base"] + file_link if file_link else ""

        events.append({
            "event_id": f"hkex_{f.get('NEWS_ID', int(time.time()))}",
            "date": date_iso,
            "title": title[:30] if len(title) > 30 else title,
            "description": title,
            "category": "public_corporate",
            "source_type": "company_ir",
            "source_url": source_url,
            "related_stocks": [f"HKEX:{padded}"],
            "expected_impact": "neutral",
            "confidence": 0.6,
            "tags": ["hkex_filing", "auto_fetched"],
            "metadata": {
                "source": "HKEX News",
                "file_type": f.get("FILE_TYPE", ""),
                "fetched_at": datetime.now().isoformat()
            }
        })

    time.sleep(DELAY)
    return events


# ===== Google News =====
def fetch_google_news(query, max_results=10):
    """從 Google News RSS 抓取相關新聞"""
    if not CONFIG["sources"]["google_news"]["enabled"]:
        return []

    cfg = CONFIG["sources"]["google_news"]
    params = {
        "q": query,
        "hl": cfg["defaults"]["hl"],
        "gl": cfg["defaults"]["gl"],
        "ceid": cfg["defaults"]["ceid"]
    }
    url = cfg["endpoints"]["rss"] + "?" + urlencode(params)

    print(f"  Google News: Searching '{query}'...")
    resp = SESSION.get(url, timeout=TIMEOUT)
    resp.raise_for_status()

    root = ET.fromstring(resp.content)
    items = root.findall(".//item")

    events = []
    for item in items[:max_results]:
        title = item.findtext("title", "")
        link = item.findtext("link", "")
        pub_date = item.findtext("pubDate", "")
        desc = item.findtext("description", "")
        # Clean HTML from description
        desc_clean = re.sub(r"<[^>]+>", "", desc).strip()

        # Parse date
        try:
            dt = datetime.strptime(pub_date[:25], "%a, %d %b %Y %H:%M:%S")
            date_iso = dt.strftime("%Y-%m-%d")
        except (ValueError, IndexError):
            date_iso = datetime.now().strftime("%Y-%m-%d")

        events.append({
            "event_id": f"gnews_{abs(hash(link)) % 10**10}",
            "date": date_iso,
            "title": title[:30] if len(title) > 30 else title,
            "description": f"{title}\n\n{desc_clean[:200]}",
            "category": "public_macro",
            "source_type": "news",
            "source_url": link,
            "related_stocks": [],  # Needs manual mapping
            "expected_impact": "neutral",
            "confidence": 0.5,
            "tags": ["google_news", "auto_fetched"],
            "metadata": {
                "source": "Google News",
                "original_title": title,
                "fetched_at": datetime.now().isoformat()
            }
        })

    time.sleep(DELAY)
    return events


# ===== Eastmoney =====
def fetch_eastmoney(stock_code, max_results=10):
    """從東方財富抓取相關新聞"""
    if not CONFIG["sources"]["eastmoney"]["enabled"]:
        return []

    cfg = CONFIG["sources"]["eastmoney"]
    padded = stock_code.zfill(5)

    param = {
        "uid": "",
        "keyword": padded,
        "type": ["cmsArticleWebOld"],
        "client": "web",
        "clientType": "web",
        "clientVersion": "curr",
        "param": {
            "cmsArticleWebOld": {
                "searchScope": "default",
                "sort": "default",
                "pageIndex": 1,
                "pageSize": min(max_results, cfg["defaults"]["page_size"])
            }
        }
    }

    url = cfg["endpoints"]["search"]
    params = {"cb": "callback", "param": json.dumps(param, ensure_ascii=False)}

    print(f"  Eastmoney: Searching {padded}...")
    resp = SESSION.get(url, params=params, timeout=TIMEOUT)
    resp.raise_for_status()

    # Strip JSONP wrapper
    text = resp.text
    if text.startswith("callback("):
        text = text[len("callback("):-1]

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        print(f"  WARNING: Eastmoney response parse failed")
        return []

    articles = data.get("result", {}).get("cmsArticleWebOld", {}).get("list", [])

    events = []
    for a in articles:
        title = re.sub(r"<[^>]+>", "", a.get("title", "")).strip()
        content = re.sub(r"<[^>]+>", "", a.get("content", "")).strip()
        date_str = a.get("date", "")
        try:
            dt = datetime.strptime(date_str[:19], "%Y-%m-%d %H:%M:%S")
            date_iso = dt.strftime("%Y-%m-%d")
        except (ValueError, IndexError):
            date_iso = datetime.now().strftime("%Y-%m-%d")

        events.append({
            "event_id": f"em_{a.get('code', int(time.time()))}",
            "date": date_iso,
            "title": title[:30] if len(title) > 30 else title,
            "description": f"{title}\n\n{content[:300]}",
            "category": "public_corporate",
            "source_type": "news",
            "source_url": a.get("url", ""),
            "related_stocks": [f"HKEX:{padded}"],
            "expected_impact": "neutral",
            "confidence": 0.5,
            "tags": ["eastmoney", "auto_fetched"],
            "metadata": {
                "source": a.get("mediaName", "東方財富"),
                "fetched_at": datetime.now().isoformat()
            }
        })

    time.sleep(DELAY)
    return events


# ===== Main =====
def main():
    parser = argparse.ArgumentParser(description="Signal Dashboard P3 — 公開訊息自動撈取")
    parser.add_argument("--stock", required=True, help="股票代碼 (如 0700)")
    parser.add_argument("--days", type=int, default=30, help="往回查幾天 (預設 30)")
    parser.add_argument("--from", dest="from_date", help="起始日期 YYYY-MM-DD")
    parser.add_argument("--to", dest="to_date", help="結束日期 YYYY-MM-DD")
    parser.add_argument("--output", default=None, help="輸出 JSON 路徑")
    parser.add_argument("--sources", default="hkex,google,eastmoney", help="資料來源 (逗號分隔)")
    args = parser.parse_args()

    # Date range
    if args.from_date and args.to_date:
        from_dt = datetime.strptime(args.from_date, "%Y-%m-%d")
        to_dt = datetime.strptime(args.to_date, "%Y-%m-%d")
    else:
        to_dt = datetime.now()
        from_dt = to_dt - timedelta(days=args.days)

    sources = [s.strip().lower() for s in args.sources.split(",")]
    all_events = []

    print(f"Stock: {args.stock} | Range: {from_dt.date()} ~ {to_dt.date()} | Sources: {sources}")
    print()

    if "hkex" in sources:
        all_events.extend(fetch_hkex(args.stock, from_dt, to_dt))
        print(f"  → HKEX: {sum(1 for e in all_events if 'hkex' in e['event_id'])} events")

    if "google" in sources:
        stock_name = args.stock
        hkex_map = _load_hkex_stock_map()
        padded = args.stock.zfill(5)
        if padded in hkex_map:
            stock_name = hkex_map[padded]["name"]
        query = f"{stock_name} {padded}.HK stock"
        gnews = fetch_google_news(query)
        # Tag related stocks
        for e in gnews:
            e["related_stocks"] = [f"HKEX:{padded}"]
        all_events.extend(gnews)
        print(f"  → Google News: {len(gnews)} events")

    if "eastmoney" in sources:
        em = fetch_eastmoney(args.stock)
        all_events.extend(em)
        print(f"  → Eastmoney: {len(em)} events")

    # Deduplicate by similar title + same date
    seen = set()
    unique = []
    for e in all_events:
        key = (e["date"], e["title"][:15])
        if key not in seen:
            seen.add(key)
            unique.append(e)
    all_events = unique

    # Sort by date desc
    all_events.sort(key=lambda e: e["date"], reverse=True)

    print(f"\nTotal: {len(all_events)} unique events")

    # Output
    output = {
        "fetch_info": {
            "stock": args.stock,
            "from": from_dt.strftime("%Y-%m-%d"),
            "to": to_dt.strftime("%Y-%m-%d"),
            "sources": sources,
            "fetched_at": datetime.now().isoformat(),
            "count": len(all_events)
        },
        "events": all_events
    }

    if args.output:
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"Saved to {args.output}")
    else:
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
