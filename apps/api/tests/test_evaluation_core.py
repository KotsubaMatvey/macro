from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.evaluation_service as evaluation_service


def test_latest_evaluation_metadata_maps_outcome_fields(monkeypatch):
 monkeypatch.setattr(
  evaluation_service,
  'latest_evaluation',
  lambda surface, signal_type, signal_ref: {
   'sample_size': 12,
   'coverage': 0.75,
   'direction_accuracy': 0.61,
   'magnitude_error': 0.22,
   'false_positive_rate': 0.18,
   'calibration': 0.64,
   'ranking_usefulness': 0.69,
   'source_quality_alignment': 0.57,
   'mode': 'replay',
   'note': 'evaluation note',
   'outcome_coverage': 0.5,
   'outcome_sample_size': 6,
   'realization_horizon': '1d/5d event reaction windows',
   'outcome_grounded': True,
   'snapshot_ref': 'ssnap-1',
  },
 )
 meta = evaluation_service.latest_evaluation_metadata('news', 'ranking', 'news-feed')
 assert meta['outcomeCoverage'] == 0.5
 assert meta['outcomeSampleSize'] == 6
 assert meta['outcomeGrounded'] is True
 assert meta['snapshotRef'] == 'ssnap-1'


def test_evaluate_news_ranking_records_outcome_grounding(monkeypatch):
 rows = [
  {'rank_score': 0.85, 'importance_score': 0.88, 'urgency_score': 0.80, 'confidence_score': 0.82, 'source_type': 'official', 'realized_move_pct': 1.6, 'realized_consistency': 0.66},
  {'rank_score': 0.42, 'importance_score': 0.50, 'urgency_score': 0.35, 'confidence_score': 0.40, 'source_type': 'discovery', 'realized_move_pct': 0.2, 'realized_consistency': 0.51},
  {'rank_score': 0.31, 'importance_score': 0.38, 'urgency_score': 0.30, 'confidence_score': 0.44, 'source_type': 'discovery', 'realized_move_pct': None, 'realized_consistency': None},
 ]
 calls = []

 monkeypatch.setattr(evaluation_service, 'fetch_all', lambda query, params: rows)
 monkeypatch.setattr(evaluation_service, 'fetch_one', lambda query, *args: {'id': 'ssnap-news-1'} if 'signal_snapshots' in query else None)
 monkeypatch.setattr(evaluation_service, 'record_signal_evaluation', lambda **kwargs: calls.append(kwargs) or 'seval-1')
 monkeypatch.setattr(evaluation_service, 'latest_evaluation_metadata', lambda *_args, **_kwargs: {'mode': 'replay', 'outcomeCoverage': calls[0]['outcome_coverage'] if calls else None})

 meta = evaluation_service.evaluate_news_ranking(lookback_hours=96)

 assert calls
 assert calls[0]['mode'] == 'replay'
 assert calls[0]['outcome_grounded'] is True
 assert calls[0]['outcome_sample_size'] == 2
 assert calls[0]['realization_horizon'] == '1d/5d event reaction windows'
 assert calls[0]['snapshot_ref'] == 'ssnap-news-1'
 assert meta['outcomeCoverage'] > 0


def test_evaluate_geoboard_ranking_records_outcome_grounding(monkeypatch):
 rows = [
  {'rank_score': 0.83, 'importance_score': 0.78, 'urgency_score': 0.81, 'confidence_score': 0.72, 'market_relevance_score': 0.74, 'desk_relevance_score': 0.68, 'realized_move_pct': 1.2, 'realized_consistency': 0.62},
  {'rank_score': 0.47, 'importance_score': 0.52, 'urgency_score': 0.44, 'confidence_score': 0.50, 'market_relevance_score': 0.46, 'desk_relevance_score': 0.42, 'realized_move_pct': None, 'realized_consistency': None},
 ]
 calls = []

 monkeypatch.setattr(evaluation_service, 'fetch_all', lambda query, params: rows)
 monkeypatch.setattr(evaluation_service, 'fetch_one', lambda query, *args: {'id': 'ssnap-geo-1'} if 'signal_snapshots' in query else None)
 monkeypatch.setattr(evaluation_service, 'record_signal_evaluation', lambda **kwargs: calls.append(kwargs) or 'seval-1')
 monkeypatch.setattr(evaluation_service, 'latest_evaluation_metadata', lambda *_args, **_kwargs: {'mode': 'replay', 'outcomeCoverage': calls[0]['outcome_coverage'] if calls else None})

 meta = evaluation_service.evaluate_geoboard_ranking(lookback_hours=96)

 assert calls
 assert calls[0]['mode'] == 'replay'
 assert calls[0]['outcome_grounded'] is True
 assert calls[0]['outcome_sample_size'] == 1
 assert calls[0]['snapshot_ref'] == 'ssnap-geo-1'
 assert meta['outcomeCoverage'] > 0


def test_evaluate_news_ranking_empty_rows_stays_replay_honest(monkeypatch):
 calls = []
 monkeypatch.setattr(evaluation_service, 'fetch_all', lambda query, params: [])
 monkeypatch.setattr(evaluation_service, 'record_signal_evaluation', lambda **kwargs: calls.append(kwargs) or 'seval-empty')

 meta = evaluation_service.evaluate_news_ranking(lookback_hours=24)

 assert calls
 assert calls[0]['sample_size'] == 0
 assert calls[0]['mode'] == 'replay'
 assert calls[0]['outcome_grounded'] is False
 assert meta['mode'] == 'replay'
