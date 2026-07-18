create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  main_file text not null,
  snapshot jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  style_profile jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx
  on projects (owner_id, updated_at desc);
