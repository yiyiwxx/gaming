"""KPL 2026 赛季数据入库脚本 (Python 版本)
从 tga-openapi.tga.qq.com 获取 KPL 2026 夏季赛 + 春季赛赛程并写入 SQLite DB
"""
import sqlite3
import json
import os
import re
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "prisma", "prisma", "dev.db")
CACHE_DIR = os.path.join(PROJECT_DIR, "data")

TZ_SHANGHAI = timezone(timedelta(hours=8))

SEASONS = [
    {"seasonid": "KPL2026S2", "label": "2026 夏季赛"},
    {"seasonid": "KPL2026S1", "label": "2026 春季赛"},
    {"seasonid": "KCC2026", "label": "2026 挑战者杯"},
]

API_URL = "https://tga-openapi.tga.qq.com/web/tgabank/getSchedules?seasonid={seasonid}&is_people=1"


def fetch_json(url):
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://pvp.qq.com/",
    })
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    all_matches = []

    for season in SEASONS:
        print(f"\n[KPL] Fetching {season['label']} ({season['seasonid']})...")
        try:
            data = fetch_json(API_URL.format(seasonid=season["seasonid"]))
        except Exception as e:
            print(f"[KPL] {season['label']} error: {e}")
            continue

        items = data.get("data")
        if not items or not isinstance(items, list):
            print(f"[KPL] {season['label']}: no data")
            continue

        print(f"[KPL] {season['label']}: {len(items)} matches from API")

        for item in items:
            match_time_str = item.get("match_time", "")
            try:
                match_dt = datetime.strptime(match_time_str, "%Y-%m-%d %H:%M:%S")
                match_dt = match_dt.replace(tzinfo=TZ_SHANGHAI)
            except ValueError:
                print(f"  [SKIP] Bad datetime: {match_time_str}")
                continue

            match_state = item.get("match_state", 0)
            if match_state == 4:
                status = "finished"
            elif match_state == 3:
                status = "live"
            else:
                status = "scheduled"

            host_score = item.get("host_score")
            guest_score = item.get("guest_score")
            has_score = (host_score is not None and guest_score is not None and status == "finished")

            season_str = item.get("season", "")
            year_match = re.search(r"(\d{4})", season_str)
            year = year_match.group(1) if year_match else "2026"

            if "夏季" in season_str:
                tournament = f"KPL {year} 夏季赛"
            elif "春季" in season_str:
                tournament = f"KPL {year} 春季赛"
            elif "挑战者杯" in season_str:
                tournament = f"KPL {year} 挑战者杯"
            elif "年度总决赛" in season_str:
                tournament = f"KPL {year} 年度总决赛"
            elif "世界冠军杯" in season_str:
                tournament = f"KPL {year} 世界冠军杯"
            else:
                tournament = f"KPL {year}"

            scheduleid = item.get("scheduleid", "")
            match_id = f"kpl-{scheduleid}".lower()

            bo_total = item.get("bo_total")
            fmt = f"BO{bo_total}" if bo_total else None

            summary = None
            if has_score:
                summary = f"{item['hname']} {host_score}-{guest_score} {item['gname']}"

            now_iso = datetime.now(timezone.utc).isoformat()

            all_matches.append({
                "id": match_id,
                "game": "hok",
                "gameName": "王者荣耀",
                "league": tournament,
                "tournament": tournament,
                "stage": item.get("stage_name") or None,
                "teamA": item.get("hname", ""),
                "teamB": item.get("gname", ""),
                "startTime": match_dt.isoformat(),
                "format": fmt,
                "status": status,
                "source": "kpl",
                "sourceUrl": "https://kpl.qq.com/#/Schedule",
                "summary": summary,
                "lastSyncedAt": now_iso,
                "updatedAt": now_iso,
            })

    # Print summary
    print(f"\n=== Total KPL matches: {len(all_matches)} ===")
    by_date = {}
    for m in all_matches:
        d = m["startTime"][:10]
        by_date.setdefault(d, []).append(m)

    dates = sorted(by_date.keys())
    show_dates = dates[:5] + (["..."] if len(dates) > 10 else []) + dates[-5:]
    for d in show_dates:
        if d == "...":
            print("  ...")
            continue
        for m in by_date[d]:
            print(f"  {d} {m['teamA']} {m.get('summary') or 'vs'} {m['teamB']} | {m.get('stage', '')}")

    # Summary by tournament
    by_tournament = {}
    for m in all_matches:
        t = m["tournament"]
        by_tournament[t] = by_tournament.get(t, 0) + 1
    print("\n=== By tournament ===")
    for t, c in by_tournament.items():
        print(f"  {t}: {c} matches")

    if not all_matches:
        print("[KPL] No matches to insert!")
        return

    # Upsert to DB
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    ins = 0
    upd = 0
    for m in all_matches:
        cur.execute("SELECT id FROM Match WHERE id = ?", (m["id"],))
        existing = cur.fetchone()
        if existing:
            cur.execute("""
                UPDATE Match SET
                    game=?, gameName=?, league=?, tournament=?, stage=?,
                    teamA=?, teamB=?, startTime=?, format=?, status=?,
                    source=?, sourceUrl=?, summary=?, lastSyncedAt=?, updatedAt=?
                WHERE id=?
            """, (
                m["game"], m["gameName"], m["league"], m["tournament"], m["stage"],
                m["teamA"], m["teamB"], m["startTime"], m["format"], m["status"],
                m["source"], m["sourceUrl"], m["summary"], m["lastSyncedAt"], m["updatedAt"],
                m["id"],
            ))
            upd += 1
        else:
            cur.execute("""
                INSERT INTO Match (id, game, gameName, league, tournament, stage,
                    teamA, teamB, startTime, format, status, source, sourceUrl,
                    summary, lastSyncedAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                m["id"], m["game"], m["gameName"], m["league"], m["tournament"], m["stage"],
                m["teamA"], m["teamB"], m["startTime"], m["format"], m["status"],
                m["source"], m["sourceUrl"], m["summary"], m["lastSyncedAt"], m["updatedAt"],
            ))
            ins += 1

    conn.commit()
    print(f"\n[DB] {ins} inserted, {upd} updated (source: kpl)")

    cur.execute("SELECT COUNT(*) FROM Match")
    total = cur.fetchone()[0]
    print(f"[DB] Total matches across all sources: {total}")

    conn.close()

    # Save cache for runtime connector
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(CACHE_DIR, "kpl-cache.json")
    cache_data = {
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(all_matches),
        "matches": all_matches,
    }
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)
    print(f"[KPL] Cache saved to {cache_path}")


if __name__ == "__main__":
    main()
