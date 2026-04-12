alter table if exists news_items add column if not exists source_type text not null default 'discovery';
alter table if exists news_items add column if not exists source_tier text not null default 'secondary';
alter table if exists news_items add column if not exists source_url text;
alter table if exists news_items add column if not exists topic text not null default 'Macro';
alter table if exists news_items add column if not exists region text not null default 'Global';
alter table if exists news_items add column if not exists country text not null default 'Global';
alter table if exists news_items add column if not exists currency text not null default '';
alter table if exists news_items add column if not exists event_family text not null default '';
alter table if exists news_items add column if not exists affected_assets jsonb not null default '[]'::jsonb;
alter table if exists news_items add column if not exists importance_score numeric(8,4) not null default 0;
alter table if exists news_items add column if not exists urgency_score numeric(8,4) not null default 0;
alter table if exists news_items add column if not exists confidence_score numeric(8,4) not null default 0.5;
alter table if exists news_items add column if not exists mode text not null default 'fallback';
alter table if exists news_items add column if not exists freshness text not null default 'degraded';
alter table if exists news_items add column if not exists source_label text not null default 'News wire';
alter table if exists news_items add column if not exists source_note text not null default '';
alter table if exists news_items add column if not exists provider_key text not null default 'seed';
alter table if exists news_items add column if not exists cluster_id text;
alter table if exists news_items add column if not exists cluster_count integer not null default 1;
alter table if exists news_items add column if not exists canonical boolean not null default true;
alter table if exists news_items add column if not exists why_it_matters text not null default '';
alter table if exists news_items add column if not exists related_event_slug text;
alter table if exists news_items add column if not exists related_dashboard_asset text;
alter table if exists news_items add column if not exists provider_payload jsonb not null default '{}'::jsonb;
alter table if exists news_items add column if not exists enriched_summary text;
alter table if exists news_items add column if not exists enriched_why_it_matters text;
alter table if exists news_items add column if not exists ai_mode text not null default 'deterministic';
alter table if exists news_items add column if not exists discovered_at timestamptz not null default now();
alter table if exists news_items add column if not exists updated_at timestamptz not null default now();

update news_items
set source_type = case when source_type is null or source_type = '' then 'seeded' else source_type end,
    source_tier = case when source_tier is null or source_tier = '' then 'secondary' else source_tier end,
    topic = case when topic is null or topic = '' then category else topic end,
    region = case when region is null or region = '' then 'Global' else region end,
    country = case when country is null or country = '' then 'Global' else country end,
    source_label = case when source_label is null or source_label = '' then 'News wire' else source_label end,
    mode = case when mode is null or mode = '' then 'fallback' else mode end,
    freshness = case when freshness is null or freshness = '' then 'degraded' else freshness end,
    cluster_count = case when cluster_count is null or cluster_count < 1 then 1 else cluster_count end,
    updated_at = coalesce(updated_at, now());

create table if not exists news_clusters (
 id text primary key,
 topic text not null default 'Macro',
 category text not null default 'Macro',
 region text not null default 'Global',
 cluster_size integer not null default 1,
 canonical_item_id text references news_items(id) on delete set null,
 published_at timestamptz,
 updated_at timestamptz not null default now()
);

create table if not exists news_item_assets (
 news_id text not null references news_items(id) on delete cascade,
 symbol text not null,
 relevance_score numeric(8,4) not null default 0.5,
 primary key (news_id, symbol)
);

create table if not exists news_provider_runs (
 id text primary key,
 provider_key text not null,
 source_type text not null,
 status text not null,
 fetched_count integer not null default 0,
 normalized_count integer not null default 0,
 deduped_count integer not null default 0,
 error_message text,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists news_enrichment (
 news_id text primary key references news_items(id) on delete cascade,
 summary text not null,
 why_it_matters text not null,
 confidence_score numeric(8,4) not null default 0.5,
 method text not null default 'deterministic',
 updated_at timestamptz not null default now()
);

create index if not exists idx_news_items_published on news_items(published_at desc);
create index if not exists idx_news_items_mode on news_items(mode);
create index if not exists idx_news_items_source_type on news_items(source_type);
create index if not exists idx_news_items_cluster on news_items(cluster_id);
create index if not exists idx_news_items_event on news_items(event_id);
create index if not exists idx_news_item_assets_symbol on news_item_assets(symbol);
create index if not exists idx_news_provider_runs_created on news_provider_runs(created_at desc);
