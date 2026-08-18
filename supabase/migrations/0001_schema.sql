-- ============================================
-- 0001_schema.sql
-- Core schema for Celebrity Fan Demand Intelligence
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- USERS (profile table, mirrors auth.users)
-- ============================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- CELEBRITIES
-- ============================================
create table if not exists public.celebrities (
  id uuid primary key default uuid_generate_v4(),
  canonical_name text not null,
  category text not null check (category in
    ('actor','musician','athlete','influencer','creator','public_figure','other')),
  country text,
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','unverified')),
  primary_image_url text,
  fan_demand_score numeric(5,2) not null default 0,
  score_level text not null default 'very_low'
    check (score_level in ('very_low','low','moderate','high','very_high')),
  total_discussions integer not null default 0,
  trend text not null default 'stable' check (trend in ('up','down','stable')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists celebrities_canonical_name_idx
  on public.celebrities (lower(canonical_name));

-- ============================================
-- CELEBRITY ALIASES (handles, nicknames, misspellings)
-- ============================================
create table if not exists public.celebrity_aliases (
  id uuid primary key default uuid_generate_v4(),
  celebrity_id uuid not null references public.celebrities(id) on delete cascade,
  alias text not null,
  alias_type text not null default 'nickname'
    check (alias_type in ('username','handle','hashtag','nickname','misspelling')),
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists celebrity_aliases_celebrity_id_idx
  on public.celebrity_aliases (celebrity_id);
create index if not exists celebrity_aliases_alias_idx
  on public.celebrity_aliases (lower(alias));

-- ============================================
-- SOCIAL PLATFORMS (lookup)
-- ============================================
create table if not exists public.social_platforms (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  display_name text not null,
  is_active boolean not null default true
);

insert into public.social_platforms (name, display_name)
values ('reddit', 'Reddit'), ('youtube', 'YouTube')
on conflict (name) do nothing;

-- ============================================
-- DATA SOURCES
-- ============================================
create table if not exists public.data_sources (
  id uuid primary key default uuid_generate_v4(),
  platform_id uuid references public.social_platforms(id),
  source_type text not null check (source_type in ('api','demo')),
  status text not null default 'inactive'
    check (status in ('active','inactive','error')),
  last_synced_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================
-- INGESTION JOBS
-- ============================================
create table if not exists public.ingestion_jobs (
  id uuid primary key default uuid_generate_v4(),
  data_source_id uuid references public.data_sources(id),
  status text not null default 'pending'
    check (status in ('pending','running','completed','failed')),
  items_processed integer not null default 0,
  items_created integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- PUBLIC DISCUSSIONS (raw ingested + linked items)
-- ============================================
create table if not exists public.public_discussions (
  id uuid primary key default uuid_generate_v4(),
  celebrity_id uuid references public.celebrities(id) on delete set null,
  platform_id uuid references public.social_platforms(id),
  source_url text,
  external_id text,
  author_handle text,
  content_excerpt text not null,
  engagement_count integer default 0,
  posted_at timestamptz,
  is_demo boolean not null default false,
  ingestion_job_id uuid references public.ingestion_jobs(id),
  created_at timestamptz not null default now()
);

create index if not exists public_discussions_celebrity_id_idx
  on public.public_discussions (celebrity_id);
create index if not exists public_discussions_posted_at_idx
  on public.public_discussions (posted_at);
create unique index if not exists public_discussions_external_unique
  on public.public_discussions (platform_id, external_id) where external_id is not null;

-- ============================================
-- DISCUSSION CATEGORIES (classification results)
-- ============================================
create table if not exists public.discussion_categories (
  id uuid primary key default uuid_generate_v4(),
  discussion_id uuid not null references public.public_discussions(id) on delete cascade,
  category text not null check (category in
    ('fan_card_request','fan_card_question','fan_card_waiting','fan_card_complaint',
     'membership_request','fan_club_request','vip_membership','membership_question',
     'meet_greet_want','meet_greet_question','vip_experience_question','fan_event_question',
     'no_response','waiting_for_reply','request_unanswered','asking_for_response',
     'general_frustration','general_confusion','negative_experience','delayed_communication')),
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create index if not exists discussion_categories_discussion_id_idx
  on public.discussion_categories (discussion_id);
create index if not exists discussion_categories_category_idx
  on public.discussion_categories (category);

-- ============================================
-- SENTIMENT ANALYSIS
-- ============================================
create table if not exists public.sentiment_analysis (
  id uuid primary key default uuid_generate_v4(),
  discussion_id uuid not null references public.public_discussions(id) on delete cascade,
  sentiment text not null check (sentiment in ('positive','neutral','negative','frustrated')),
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create unique index if not exists sentiment_analysis_discussion_unique
  on public.sentiment_analysis (discussion_id);

-- ============================================
-- AI ANALYSIS (raw model output + summaries, audit trail)
-- ============================================
create table if not exists public.ai_analysis (
  id uuid primary key default uuid_generate_v4(),
  discussion_id uuid references public.public_discussions(id) on delete cascade,
  celebrity_id uuid references public.celebrities(id) on delete cascade,
  analysis_type text not null check (analysis_type in
    ('classification','sentiment','entity_extraction','summary','score_reasoning')),
  model_name text not null,
  ai_output jsonb not null,
  is_inference boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- DEMAND METRICS (aggregated per celebrity per period)
-- ============================================
create table if not exists public.demand_metrics (
  id uuid primary key default uuid_generate_v4(),
  celebrity_id uuid not null references public.celebrities(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_discussions integer not null default 0,
  fan_card_count integer not null default 0,
  membership_count integer not null default 0,
  meet_greet_count integer not null default 0,
  unanswered_count integer not null default 0,
  complaint_count integer not null default 0,
  fan_card_pct numeric(5,2),
  membership_pct numeric(5,2),
  meet_greet_pct numeric(5,2),
  unanswered_pct numeric(5,2),
  complaint_pct numeric(5,2),
  created_at timestamptz not null default now()
);

create index if not exists demand_metrics_celebrity_id_idx
  on public.demand_metrics (celebrity_id);

-- ============================================
-- TREND METRICS (time series points for charts)
-- ============================================
create table if not exists public.trend_metrics (
  id uuid primary key default uuid_generate_v4(),
  celebrity_id uuid not null references public.celebrities(id) on delete cascade,
  metric_date date not null,
  fan_card_demand integer not null default 0,
  membership_demand integer not null default 0,
  meet_greet_demand integer not null default 0,
  complaints integer not null default 0,
  unanswered_requests integer not null default 0,
  total_volume integer not null default 0,
  fan_demand_score numeric(5,2),
  created_at timestamptz not null default now()
);

create unique index if not exists trend_metrics_celebrity_date_unique
  on public.trend_metrics (celebrity_id, metric_date);

-- ============================================
-- WATCHLISTS
-- ============================================
create table if not exists public.watchlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  celebrity_id uuid not null references public.celebrities(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists watchlists_user_celebrity_unique
  on public.watchlists (user_id, celebrity_id);

-- ============================================
-- ALERTS
-- ============================================
create table if not exists public.alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  celebrity_id uuid references public.celebrities(id) on delete cascade,
  alert_type text not null check (alert_type in
    ('fan_card_increase','membership_increase','meet_greet_threshold',
     'unanswered_increase','score_threshold')),
  threshold_value numeric(6,2) not null,
  status text not null default 'active' check (status in ('active','triggered','disabled')),
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists alerts_user_id_idx on public.alerts (user_id);

-- ============================================
-- SYSTEM LOGS
-- ============================================
create table if not exists public.system_logs (
  id uuid primary key default uuid_generate_v4(),
  level text not null check (level in ('info','warning','error')),
  source text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_logs_created_at_idx on public.system_logs (created_at);
