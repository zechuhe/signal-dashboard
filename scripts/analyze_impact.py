"""
proj_147 P4 — LLM 事件影響力分析
使用 Gemini API 分析事件對股價的潛在影響力

用法：
  python analyze_impact.py --events data/events.json --prices data/price_HKEX_0700.json
  python analyze_impact.py --events data/events.json --prices data/price_HKEX_0700.json --output data/analysis_results.json
"""

import json
import os
import sys
import argparse
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "config.json")

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    CONFIG = json.load(f)

# ===== Load Gemini API Key =====
def _get_gemini_key():
    # Try env var first, then .env
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    env_paths = [
        os.path.join(SCRIPT_DIR, "..", ".env"),
        os.path.join(os.path.expanduser("~"), "Antigravity", ".env"),
    ]
    for p in env_paths:
        if os.path.isfile(p):
            with open(p, "r") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip()
    return None


# ===== Stock Price Impact Calculator =====
def calc_price_impact(price_data, event_date, windows=[1, 3, 5, 10, 20]):
    """計算事件前後的股價變動"""
    dates = [r["date"] for r in price_data]

    # Find nearest trading day
    target = event_date
    idx = -1
    for i, d in enumerate(dates):
        if d >= target:
            idx = i
            break
    if idx == -1:
        # Event date is after all price data
        idx = len(dates) - 1

    if idx < 0 or idx >= len(dates):
        return None

    base_price = price_data[idx]["close"]
    result = {
        "event_date": event_date,
        "nearest_trading_date": dates[idx],
        "base_price": base_price,
        "windows": {}
    }

    for w in windows:
        # Before event
        before_idx = max(0, idx - w)
        before_price = price_data[before_idx]["close"]
        before_chg = round((base_price - before_price) / before_price * 100, 2)

        # After event
        after_idx = min(len(dates) - 1, idx + w)
        after_price = price_data[after_idx]["close"]
        after_chg = round((after_price - base_price) / base_price * 100, 2)

        result["windows"][f"{w}d_before"] = {
            "date": dates[before_idx],
            "price": before_price,
            "change_pct": before_chg
        }
        result["windows"][f"{w}d_after"] = {
            "date": dates[after_idx],
            "price": after_price,
            "change_pct": after_chg
        }

    return result


# ===== Private → Public Matching =====
def match_private_to_public(events):
    """匹配私人消息和後續變成的公開消息，計算時間窗口"""
    private = [e for e in events if e.get("category") == "insider_private"]
    public = [e for e in events if e.get("category") != "insider_private"]

    matches = []
    for priv in private:
        priv_stocks = set(priv.get("related_stocks", []))
        priv_tags = set(priv.get("tags", []))
        priv_date = priv["date"]

        best_match = None
        best_score = 0

        for pub in public:
            pub_stocks = set(pub.get("related_stocks", []))
            if not priv_stocks.intersection(pub_stocks):
                continue
            if pub["date"] < priv_date:
                continue  # Public event before private = not a match

            # Score: stock overlap + tag overlap + title similarity
            stock_score = len(priv_stocks.intersection(pub_stocks))
            tag_score = len(priv_tags.intersection(set(pub.get("tags", []))))

            # Simple title similarity (shared words)
            priv_words = set(priv.get("title", "").lower().split())
            pub_words = set(pub.get("title", "").lower().split())
            title_score = len(priv_words.intersection(pub_words))

            score = stock_score * 3 + tag_score * 2 + title_score
            if score > best_score:
                best_score = score
                best_match = pub

        if best_match and best_score >= 3:
            days_diff = (datetime.strptime(best_match["date"], "%Y-%m-%d") -
                        datetime.strptime(priv_date, "%Y-%m-%d")).days
            matches.append({
                "private_event": priv["event_id"],
                "private_title": priv.get("title", ""),
                "private_date": priv_date,
                "public_event": best_match["event_id"],
                "public_title": best_match.get("title", ""),
                "public_date": best_match["date"],
                "time_window_days": days_diff,
                "match_score": best_score
            })

    return matches


# ===== LLM Impact Analysis =====
def analyze_with_llm(event, price_impact, company_info=None):
    """用 Gemini 分析事件影響力"""
    key = _get_gemini_key()
    if not key:
        return {"error": "GEMINI_API_KEY not found", "impact_level": "unknown"}

    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
    except ImportError:
        return {"error": "google-generativeai not installed", "impact_level": "unknown"}

    # Build prompt
    impact_text = ""
    if price_impact:
        for window, data in price_impact.get("windows", {}).items():
            impact_text += f"  {window}: {data['change_pct']:+.2f}%\n"

    prompt = f"""你是一位港股市場分析師。請分析以下事件對相關股票的影響力。

事件資訊：
- 標題：{event.get('title', '')}
- 描述：{event.get('description', '')}
- 日期：{event.get('date', '')}
- 類別：{event.get('category', '')}
- 相關股票：{', '.join(event.get('related_stocks', []))}
- 預期影響方向：{event.get('expected_impact', '')}
- 信心度：{event.get('confidence', '')}

股價反應（事件前後實際走勢）：
{impact_text if impact_text else '（無股價數據）'}

請回傳 JSON 格式（不要 markdown code block）：
{{
  "impact_level": "high | medium | low | negligible",
  "impact_score": 0-100,
  "reasoning": "50字內分析理由",
  "category_refined": "人事變動 | 資產處置 | 併購重組 | 政策法規 | 宏觀經濟 | 法律訴訟 | 財務表現 | 供應鏈 | 其他",
  "expected_duration_days": 數字（影響持續天數估計）,
  "comparable_events": "歷史上類似事件的簡述（如有）"
}}"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Try to parse JSON
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        result["event_id"] = event.get("event_id", "")
        result["analyzed_at"] = datetime.now().isoformat()
        return result
    except Exception as e:
        return {
            "event_id": event.get("event_id", ""),
            "error": str(e),
            "impact_level": "unknown",
            "analyzed_at": datetime.now().isoformat()
        }


# ===== Main =====
def main():
    parser = argparse.ArgumentParser(description="Signal Dashboard P4 — LLM 事件影響力分析")
    parser.add_argument("--events", required=True, help="事件 JSON 路徑")
    parser.add_argument("--prices", help="股價 JSON 路徑（可選，用於計算實際股價反應）")
    parser.add_argument("--output", default=None, help="輸出 JSON 路徑")
    parser.add_argument("--llm", action="store_true", help="啟用 LLM 分析（需 Gemini API key）")
    parser.add_argument("--case", default=None, help="只分析指定 case_id")
    args = parser.parse_args()

    # Load events
    with open(args.events, "r", encoding="utf-8") as f:
        events_data = json.load(f)

    # Support both formats
    if "cases" in events_data:
        all_events = []
        for case in events_data["cases"]:
            if args.case and case.get("case_id") != args.case:
                continue
            all_events.extend(case.get("events", []))
    elif "events" in events_data:
        all_events = events_data["events"]
    else:
        all_events = events_data

    # Load prices
    price_data = None
    if args.prices:
        with open(args.prices, "r", encoding="utf-8") as f:
            pd = json.load(f)
            price_data = pd.get("data", [])

    print(f"Loaded {len(all_events)} events" + (f", {len(price_data)} price records" if price_data else ""))

    # 1. Calculate price impact for each event
    print("\n=== Price Impact Analysis ===")
    impact_results = []
    for evt in all_events:
        if price_data:
            impact = calc_price_impact(price_data, evt["date"])
            if impact:
                after_5d = impact["windows"].get("5d_after", {}).get("change_pct", 0)
                arrow = "+" if after_5d >= 0 else ""
                print(f"  {evt['date']} | {evt['title'][:25]} | 5d: {arrow}{after_5d}%")
                impact_results.append({"event": evt["event_id"], "impact": impact})
        else:
            print(f"  {evt['date']} | {evt['title'][:25]} | (no price data)")

    # 2. Private → Public matching
    print("\n=== Private → Public Matching ===")
    matches = match_private_to_public(all_events)
    if matches:
        for m in matches:
            print(f"  [{m['private_title'][:20]}] → [{m['public_title'][:20]}] | 時間窗口: {m['time_window_days']} 天")
    else:
        print("  (無匹配)")

    # 3. LLM Analysis (optional)
    llm_results = []
    if args.llm:
        print("\n=== LLM Impact Analysis ===")
        for evt in all_events:
            pi = next((r["impact"] for r in impact_results if r["event"] == evt["event_id"]), None)
            print(f"  Analyzing: {evt['title'][:30]}...")
            result = analyze_with_llm(evt, pi)
            llm_results.append(result)
            level = result.get("impact_level", "?")
            score = result.get("impact_score", "?")
            print(f"    → {level} ({score}/100): {result.get('reasoning', '')[:50]}")
            import time; time.sleep(1)  # Rate limit

    # Output
    output = {
        "analysis_info": {
            "events_count": len(all_events),
            "has_price_data": price_data is not None,
            "llm_enabled": args.llm,
            "analyzed_at": datetime.now().isoformat()
        },
        "price_impacts": impact_results,
        "private_public_matches": matches,
        "llm_assessments": llm_results
    }

    if args.output:
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to {args.output}")
    else:
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
