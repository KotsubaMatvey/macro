from .calendar_data import get_calendar_event, list_calendar_events
from .db import fetch_all
from .insights_service import build_reactions_payload
from .news_service import list_news_for_workstation


def list_events(search=None, family=None, days_back=30, days_forward=60):
 return list_calendar_events(
  search=search,
  family=family,
  days_back=days_back,
  days_forward=days_forward,
 )


def _reaction_rows(reactions):
 rows = []
 for row in reactions.get("summary", {}).get("windowStats", []):
  rows.append(
   {
    "window": row["window"],
    "avgMovePct": row["meanMovePct"],
    "consistency": row["positiveHitRate"],
    "narrative": "Historical reaction summary built from real market history for the event family.",
   }
  )
 return rows


def _briefings(item, asset):
 rows = fetch_all(
  "select b.id, b.slug, b.title, b.kind, b.published_at, b.summary, u.name as analyst_name, b.takeaways, b.asset_symbols from briefings b join users u on u.id = b.analyst_user_id where b.event_id = %s or b.asset_symbols ? %s order by b.published_at desc",
  (item["id"], asset),
 )
 return [
  {
   "id": row["id"],
   "slug": row["slug"],
   "title": row["title"],
   "kind": row["kind"],
   "publishedAt": row["published_at"].isoformat(),
   "summary": row["summary"],
   "analystName": row["analyst_name"],
   "takeaways": row["takeaways"],
   "assetSymbols": row["asset_symbols"],
  }
  for row in rows
 ]


def _news(item):
 rows = list_news_for_workstation(limit=60)
 linked = []
 for row in rows:
  related_event_id = row.get("relatedEventId")
  row_category = row.get("category")
  if related_event_id == item["id"] or row_category == item["category"]:
   linked.append(
    {
     "id": row["id"],
     "slug": row["slug"],
     "title": row["title"],
     "source": row["source"],
     "publishedAt": row["publishedAt"],
     "summary": row["summary"],
     "category": row["category"],
     "sentiment": row.get("sentiment", "Neutral"),
     "relatedEventId": row.get("relatedEventId"),
    }
   )
 return linked[:12]


def event_detail(event_id):
 item = get_calendar_event(event_id)
 if not item:
  return None
 asset = item["relatedAssets"][0] if item.get("relatedAssets") else "SPX"
 try:
  reactions = build_reactions_payload(
   family=item["family"],
   asset=asset,
   country=item["country"],
   currency=item["currency"],
  )
 except Exception:
  fallback_rows = fetch_all("select reaction_window, avg_move_pct, consistency, narrative from event_reaction_windows where event_id = %s order by reaction_window", (item["id"],))
  reactions = {"summary": {"windowStats": [{"window": row["reaction_window"], "meanMovePct": float(row["avg_move_pct"]), "positiveHitRate": float(row["consistency"])} for row in fallback_rows]}}
 detail = dict(item)
 detail["historicalReactions"] = _reaction_rows(reactions)
 detail["linkedBriefings"] = _briefings(item, asset)
 detail["linkedNews"] = _news(item)
 return detail



