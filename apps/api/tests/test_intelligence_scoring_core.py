from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.geoboard_ranking import GeoboardRankInputs, rank_metadata
from app.intelligence_scoring import UnifiedScoreInputs, compute_unified_scores, event_proximity_score, watchlist_overlap_score, asset_breadth_score
from app.news_core.pipeline import _score_row


def test_unified_scoring_outputs_expected_fields_and_bounds():
 scores = compute_unified_scores(
  UnifiedScoreInputs(
   importance=0.82,
   urgency=0.74,
   confidence=0.68,
   source_quality=0.77,
   recency=0.55,
   watchlist_overlap=0.40,
   event_proximity=0.66,
   asset_breadth=0.50,
   regime_relevance=0.62,
   evidence_density=0.58,
  ),
  rationale=['deterministic scoring test'],
 )
 assert 0.0 <= scores['rankScore'] <= 1.0
 assert 0.0 <= scores['marketRelevanceScore'] <= 1.0
 assert 0.0 <= scores['deskRelevanceScore'] <= 1.0
 assert 'sourceQualityScore' in scores['componentScores']
 assert scores['rationale']


def test_news_score_row_respects_watchlist_overlap_signal():
 base_row = {
  'published_at': '2026-04-12T10:00:00+00:00',
  'importance_score': 0.75,
  'urgency_score': 0.70,
  'confidence_score': 0.66,
  'source_type': 'official',
  'source_tier': 'primary',
  'mode': 'live',
  'cluster_count': 3,
  'event_id': 'event-cpi-mar',
  'affected_assets': ['SPX', 'DXY'],
  'category': 'Inflation',
 }
 low = _score_row(base_row, watch_overlap=0)
 high = _score_row(base_row, watch_overlap=3)
 assert high['deskRelevanceScore'] >= low['deskRelevanceScore']
 assert high['rankScore'] >= low['rankScore']
 assert any('Unified news ranking' in line for line in high['rationale'])


def test_geoboard_rank_metadata_reports_model_components():
 ranked = rank_metadata(
  GeoboardRankInputs(
   urgency_score=0.82,
   importance_score=0.76,
   confidence_score=0.71,
   recency_score=0.64,
   source_quality_score=0.69,
   watchlist_overlap_score=0.45,
   catalyst_proximity_score=0.72,
   region_significance_score=0.66,
   regime_relevance_score=0.61,
  ),
  ['geoboard deterministic scoring test'],
 )
 assert 0.0 <= ranked['rankScore'] <= 1.0
 assert ranked['componentScores']['modelVersion'] == 'geoboard-ranking-v2'
 assert ranked['componentScores']['baseRankScore'] >= 0.0
 assert ranked['catalystProximityScore'] == round(0.72, 4)
 assert any('Unified score baseline dominates' in line for line in ranked['rationale'])


def test_unified_scoring_clamps_non_finite_inputs():
 scores = compute_unified_scores(
  UnifiedScoreInputs(
   importance=float('nan'),
   urgency=float('inf'),
   confidence=float('-inf'),
   source_quality=0.7,
   recency=0.6,
   watchlist_overlap=0.2,
   event_proximity=0.3,
   asset_breadth=0.4,
   regime_relevance=0.5,
   evidence_density=0.6,
  ),
  rationale=['non-finite hardening test'],
 )
 assert scores['importanceScore'] == 0.0
 assert scores['urgencyScore'] == 1.0
 assert scores['confidenceScore'] == 0.0
 assert 0.0 <= scores['rankScore'] <= 1.0


def test_helper_scores_tolerate_malformed_numbers():
 assert event_proximity_score('bad') == 0.14
 assert event_proximity_score(float('nan')) == 0.14
 assert event_proximity_score(float('inf')) == 0.14
 assert watchlist_overlap_score('bad') == 0.0
 assert asset_breadth_score('bad') == 0.0
