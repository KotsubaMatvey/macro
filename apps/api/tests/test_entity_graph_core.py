from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.entity_graph as entity_graph


def test_materialize_geoboard_links_expands_and_dedupes(monkeypatch):
 entities = []
 scores = []
 links = []

 def fake_upsert_entity(**kwargs):
  entities.append(kwargs)
  return kwargs['entity_type'] + ':' + kwargs['ref_id']

 def fake_upsert_score(**kwargs):
  scores.append(kwargs)
  return 'score-id'

 def fake_link_entities(**kwargs):
  links.append(kwargs)
  return 'link-id'

 monkeypatch.setattr(entity_graph, 'upsert_entity', fake_upsert_entity)
 monkeypatch.setattr(entity_graph, 'upsert_score', fake_upsert_score)
 monkeypatch.setattr(entity_graph, 'link_entities', fake_link_entities)

 payload = [
  {
   'id': 'feed-geo-1',
   'sourceId': 'geo-1',
   'title': 'Geo risk signal',
   'feedType': 'GEO_RISK',
   'sourceLayer': 'geo',
   'regionCode': 'MENA',
   'regionGroup': 'Middle East',
   'linkedEventId': 'event-cpi-mar',
   'relatedNewsIds': ['news-1', 'news-1'],
   'relatedNewsClusterIds': ['cluster-a'],
   'linkedAssetSymbols': ['OIL', 'DXY', 'OIL'],
   'linkedReports': ['weekly-macro-brief'],
   'linkedReactions': ['GEO_RISK', 'GEO_RISK'],
   'sourceMeta': {
    'label': 'GDELT discovery stream',
    'providerKey': 'gdelt',
    'sourceType': 'discovery',
    'sourceTier': 'secondary',
    'mode': 'live',
    'freshness': 'fresh',
    'sourceUrl': 'https://example.com/gdelt',
   },
   'ranking': {
    'importanceScore': 0.8,
    'urgencyScore': 0.7,
    'confidenceScore': 0.6,
    'marketRelevanceScore': 0.7,
    'deskRelevanceScore': 0.5,
    'rankScore': 0.72,
    'rationale': ['test'],
   },
  }
 ]

 result = entity_graph.materialize_geoboard_links(payload)

 assert result['entities'] == 1
 assert scores
 link_types = {item['link_type'] for item in links}
 assert 'linked_asset' in link_types
 assert 'linked_event' in link_types
 assert 'linked_news' in link_types
 assert 'linked_region' in link_types
 assert 'linked_report' in link_types
 assert 'linked_reaction' in link_types

 linked_asset_refs = [item['to_entity_id'] for item in links if item['link_type'] == 'linked_asset']
 assert len(linked_asset_refs) == len(set(linked_asset_refs))


def test_materialize_news_links_adds_reaction_and_report_edges(monkeypatch):
 entities = []
 links = []

 monkeypatch.setattr(
  entity_graph,
  'fetch_all',
  lambda _query, _params: [
   {
    'id': 'news-1',
    'title': 'US CPI cools',
    'source': 'Federal Reserve',
    'source_type': 'official',
    'source_tier': 'primary',
    'source_url': 'https://example.com/news-1',
    'mode': 'live',
    'freshness': 'fresh',
    'confidence_score': 0.85,
    'importance_score': 0.88,
    'urgency_score': 0.79,
    'market_relevance_score': 0.80,
    'desk_relevance_score': 0.73,
    'rank_score': 0.82,
    'affected_assets': ['SPX', 'DXY'],
    'event_id': 'event-cpi-mar',
    'event_family': 'US CPI',
    'region': 'US',
    'country': 'United States',
    'cluster_id': 'cluster-cpi',
   }
  ],
 )

 monkeypatch.setattr(entity_graph, 'upsert_score', lambda **_kwargs: 'score-1')

 def fake_upsert_entity(**kwargs):
  entities.append(kwargs)
  return kwargs['entity_type'] + ':' + kwargs['ref_id']

 def fake_link_entities(**kwargs):
  links.append(kwargs)
  return 'link-id'

 monkeypatch.setattr(entity_graph, 'upsert_entity', fake_upsert_entity)
 monkeypatch.setattr(entity_graph, 'link_entities', fake_link_entities)

 result = entity_graph.materialize_news_links(limit=10)

 assert result['entities'] == 1
 link_types = {item['link_type'] for item in links}
 assert 'linked_asset' in link_types
 assert 'linked_event' in link_types
 assert 'linked_region' in link_types
 assert 'linked_news_cluster' in link_types
 assert 'linked_reaction' in link_types
 assert 'linked_report' in link_types

 entity_types = {item['entity_type'] for item in entities}
 assert 'reaction_family' in entity_types
 assert 'report' in entity_types
