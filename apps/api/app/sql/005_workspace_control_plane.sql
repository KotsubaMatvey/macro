create table if not exists user_workspaces (
 id text primary key,
 user_id text not null references users(id) on delete cascade,
 name text not null,
 preset_key text,
 is_preset boolean not null default false,
 module_keys jsonb not null default '[]'::jsonb,
 filters jsonb not null default '{}'::jsonb,
 layout jsonb not null default '{}'::jsonb,
 routes jsonb not null default '[]'::jsonb,
 active_route text not null default '/app/dashboard',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_used_at timestamptz not null default now()
);

create index if not exists idx_user_workspaces_user_updated on user_workspaces(user_id, updated_at desc);
create unique index if not exists uq_user_workspaces_user_name on user_workspaces(user_id, lower(name));
