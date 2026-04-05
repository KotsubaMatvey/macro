create table if not exists macro_reports (
 id text primary key,
 slug text not null unique,
 title text not null,
 status text not null,
 mode text not null,
 week_start date not null,
 week_end date not null,
 summary text not null,
 body jsonb not null default '{}'::jsonb,
 source_meta jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists idx_macro_reports_week on macro_reports(week_start desc, created_at desc);
