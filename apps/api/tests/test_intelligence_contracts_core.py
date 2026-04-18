from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.intelligence_contracts import build_evaluation_metadata, build_intelligence_contract, build_linked_references
from app.intelligence_semantics import normalize_freshness, normalize_mode, normalize_score, normalize_source_type
from app.source_meta import build_source_metadata, derive_freshness


def test_semantics_normalize_mode_freshness_and_scores():
 assert normalize_mode('LIVE') == 'live'
 assert normalize_mode('unknown-mode') == 'fallback'
 assert normalize_freshness('', mode='fallback') == 'degraded'
 assert normalize_freshness('', mode='live') == 'fresh'
 assert normalize_source_type('OFFICIAL') == 'official'
 assert normalize_source_type('??') == 'discovery'
 assert normalize_score(1.2) == 1.0
 assert normalize_score(-1.0) == 0.0
 assert normalize_score(float('inf')) == 1.0
 assert normalize_score(float('-inf')) == 0.0
 assert normalize_score(float('nan')) == 0.0


def test_build_source_metadata_uses_shared_semantics():
 meta = build_source_metadata(
  'News feed',
  'Macro Access News Pipeline',
  mode='LIVE',
  freshness='invalid-freshness',
  note='  source note  ',
 )
 assert meta['mode'] == 'live'
 assert meta['freshness'] == 'degraded'
 assert meta['note'] == 'source note'



def test_build_linked_references_dedupes_and_normalizes():
 links = build_linked_references(
  linked_assets=['SPX', 'SPX', ' DXY '],
  linked_events=['event-1', '', 'event-1'],
  linked_regions=['US', 'US', 'Europe'],
 )
 assert links['linkedAssets'] == ['SPX', 'DXY']
 assert links['linkedEvents'] == ['event-1']
 assert links['linkedRegions'] == ['US', 'Europe']


def test_build_evaluation_metadata_includes_outcome_fields():
 evaluation = build_evaluation_metadata(
  surface='news',
  signal_type='ranking',
  signal_ref='news-feed',
  sample_size=20,
  coverage=0.8,
  ranking_usefulness=0.71,
  source_quality_alignment=0.62,
  mode='replay',
  note='Outcome-grounded replay metric.',
  outcome_coverage=0.55,
  outcome_sample_size=11,
  realization_horizon='1d/5d event reaction windows',
  outcome_grounded=True,
  snapshot_ref='ssnap-123',
 )
 assert evaluation['outcomeCoverage'] == 0.55
 assert evaluation['outcomeSampleSize'] == 11
 assert evaluation['realizationHorizon'] == '1d/5d event reaction windows'
 assert evaluation['outcomeGrounded'] is True
 assert evaluation['snapshotRef'] == 'ssnap-123'


def test_build_intelligence_contract_normalizes_scores_and_fallback():
 contract = build_intelligence_contract(
  source='  Reuters  ',
  source_type='DISCOVERY',
  source_tier='SECONDARY',
  source_url=' https://example.com ',
  mode='fallback',
  freshness='invalid',
  scores={
   'importanceScore': 1.5,
   'urgencyScore': -1,
   'confidenceScore': 0.55,
   'marketRelevanceScore': 0.7,
   'deskRelevanceScore': 0.6,
   'rankScore': 0.9,
   'rationale': [' first ', '', 'second'],
   'componentScores': {'sourceQualityScore': 0.8},
  },
  links=build_linked_references(linked_assets=['SPX'], linked_events=['event-cpi']),
  derived_from=['provider-a', 'provider-a', 'cluster-1'],
  fallback_reason=' provider degraded ',
  evaluation={'surface': 'news', 'signalType': 'ranking', 'signalRef': 'news-feed', 'mode': 'replay'},
 )
 assert contract['source'] == 'Reuters'
 assert contract['sourceType'] == 'discovery'
 assert contract['sourceTier'] == 'secondary'
 assert contract['freshness'] == 'degraded'
 assert contract['importance'] == 1.0
 assert contract['urgency'] == 0.0
 assert contract['derivedFrom'] == ['provider-a', 'cluster-1']
 assert contract['fallbackReason'] == 'provider degraded'
 assert contract['evaluation']['mode'] == 'replay'


def test_live_contract_clears_fallback_reason():
 contract = build_intelligence_contract(
  source='Federal Reserve',
  source_type='official',
  source_tier='primary',
  source_url=None,
  mode='live',
  freshness='fresh',
  scores={'importanceScore': 0.9, 'urgencyScore': 0.7, 'confidenceScore': 0.85, 'marketRelevanceScore': 0.8, 'deskRelevanceScore': 0.76, 'rankScore': 0.82},
  links=build_linked_references(),
  fallback_reason='should be removed',
 )
 assert contract['mode'] == 'live'
 assert contract['fallbackReason'] == ''
 assert derive_freshness(None, mode='fallback') == 'degraded'
