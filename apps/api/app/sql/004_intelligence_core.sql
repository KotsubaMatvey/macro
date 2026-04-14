alter table if exists news_items add column if not exists market_relevance_score numeric(8,4) not null default 0;
alter table if exists news_items add column if not exists desk_relevance_score numeric(8,4) not null default 0;
alter table if exists news_items add column if not exists rank_score numeric(8,4) not null default 0;
alter table if exists news_items add column if not exists score_rationale jsonb not null default '[]'::jsonb;

alter table if exists events add column if not exists market_relevance_score numeric(8,4) not null default 0;
alter table if exists events add column if not exists desk_relevance_score numeric(8,4) not null default 0;
alter table if exists events add column if not exists confidence_score numeric(8,4) not null default 0.5;

create table if not exists intelligence_entities (
 id text primary key,
 entity_type text not null,
 ref_id text not null,
 title text not null default '',
 source text not null default '',
 source_type text not null default 'derived',
 source_tier text not null default 'secondary',
 source_url text,
 mode text not null default 'fallback',
 freshness text not null default 'degraded',
 confidence_score numeric(8,4) not null default 0,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (entity_type, ref_id)
);

create table if not exists intelligence_scores (
 id text primary key,
 entity_id text not null references intelligence_entities(id) on delete cascade,
 importance_score numeric(8,4) not null default 0,
 urgency_score numeric(8,4) not null default 0,
 confidence_score numeric(8,4) not null default 0,
 market_relevance_score numeric(8,4) not null default 0,
 desk_relevance_score numeric(8,4) not null default 0,
 rank_score numeric(8,4) not null default 0,
 rationale jsonb not null default '[]'::jsonb,
 factors jsonb not null default '{}'::jsonb,
 computed_at timestamptz not null default now()
);

create table if not exists intelligence_links (
 id text primary key,
 from_entity_id text not null references intelligence_entities(id) on delete cascade,
 to_entity_id text not null references intelligence_entities(id) on delete cascade,
 link_type text not null,
 confidence_score numeric(8,4) not null default 0,
 rationale text not null default '',
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique (from_entity_id, to_entity_id, link_type)
);

create table if not exists signal_snapshots (
 id text primary key,
 surface text not null,
 signal_type text not null,
 signal_ref text not null,
 as_of timestamptz not null,
 payload jsonb not null default '{}'::jsonb,
 mode text not null default 'fallback',
 freshness text not null default 'degraded',
 created_at timestamptz not null default now()
);

create table if not exists signal_evaluations (
 id text primary key,
 surface text not null,
 signal_type text not null,
 signal_ref text not null,
 window text not null,
 sample_size integer not null default 0,
 coverage numeric(8,4),
 direction_accuracy numeric(8,4),
 magnitude_error numeric(12,6),
 false_positive_rate numeric(8,4),
 calibration numeric(8,4),
 ranking_usefulness numeric(8,4),
 source_quality_alignment numeric(8,4),
 realized_move numeric(12,6),
 mode text not null default 'replay',
 note text not null default '',
 created_at timestamptz not null default now()
);

create index if not exists idx_intelligence_entities_type_ref on intelligence_entities(entity_type, ref_id);
create index if not exists idx_intelligence_scores_entity_time on intelligence_scores(entity_id, computed_at desc);
create index if not exists idx_intelligence_links_from on intelligence_links(from_entity_id, link_type);
create index if not exists idx_intelligence_links_to on intelligence_links(to_entity_id, link_type);
create index if not exists idx_signal_snapshots_surface_ref on signal_snapshots(surface, signal_type, signal_ref, created_at desc);
create index if not exists idx_signal_evaluations_surface_ref on signal_evaluations(surface, signal_type, signal_ref, created_at desc);
create index if not exists idx_news_items_rank_score on news_items(rank_score desc, published_at desc);
