-- ============================================
-- 0002_rls_policies.sql
-- Row Level Security for Celebrity Fan Demand Intelligence
-- ============================================

-- Enable RLS on every table
alter table public.user_profiles enable row level security;
alter table public.celebrities enable row level security;
alter table public.celebrity_aliases enable row level security;
alter table public.social_platforms enable row level security;
alter table public.data_sources enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.public_discussions enable row level security;
alter table public.discussion_categories enable row level security;
alter table public.sentiment_analysis enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.demand_metrics enable row level security;
alter table public.trend_metrics enable row level security;
alter table public.watchlists enable row level security;
alter table public.alerts enable row level security;
alter table public.system_logs enable row level security;

-- ============================================
-- Helper: is_admin()
-- ============================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================
-- USER_PROFILES
-- ============================================
create policy "users read own profile"
  on public.user_profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "users update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- ============================================
-- CELEBRITIES / ALIASES / PLATFORMS
-- intelligence data: readable by any authenticated user, writes = service role or admin only
-- ============================================
create policy "authenticated read celebrities"
  on public.celebrities for select
  to authenticated
  using (true);

create policy "admin write celebrities"
  on public.celebrities for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "authenticated read aliases"
  on public.celebrity_aliases for select
  to authenticated
  using (true);

create policy "admin write aliases"
  on public.celebrity_aliases for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "authenticated read platforms"
  on public.social_platforms for select
  to authenticated
  using (true);

-- ============================================
-- DATA SOURCES / INGESTION JOBS / SYSTEM LOGS
-- admin-only visibility (operational/internal data)
-- ============================================
create policy "admin read data sources"
  on public.data_sources for select
  using (public.is_admin());

create policy "admin write data sources"
  on public.data_sources for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin read ingestion jobs"
  on public.ingestion_jobs for select
  using (public.is_admin());

create policy "admin read system logs"
  on public.system_logs for select
  using (public.is_admin());

-- ============================================
-- PUBLIC DISCUSSIONS / CATEGORIES / SENTIMENT / AI ANALYSIS
-- readable by any authenticated user (this is the product itself),
-- writes restricted to service role (server-side ingestion only)
-- ============================================
create policy "authenticated read discussions"
  on public.public_discussions for select
  to authenticated
  using (true);

create policy "admin write discussions"
  on public.public_discussions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "authenticated read discussion categories"
  on public.discussion_categories for select
  to authenticated
  using (true);

create policy "authenticated read sentiment"
  on public.sentiment_analysis for select
  to authenticated
  using (true);

create policy "authenticated read ai analysis"
  on public.ai_analysis for select
  to authenticated
  using (true);

-- ============================================
-- DEMAND METRICS / TREND METRICS
-- readable by any authenticated user
-- ============================================
create policy "authenticated read demand metrics"
  on public.demand_metrics for select
  to authenticated
  using (true);

create policy "authenticated read trend metrics"
  on public.trend_metrics for select
  to authenticated
  using (true);

-- ============================================
-- WATCHLISTS — strictly per-user
-- ============================================
create policy "users manage own watchlist"
  on public.watchlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- ALERTS — strictly per-user
-- ============================================
create policy "users manage own alerts"
  on public.alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
