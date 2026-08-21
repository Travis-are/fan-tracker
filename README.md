# Celebrity Fan Demand Intelligence

AI-powered public fan-demand intelligence platform. Tracks publicly available
discussions to identify demand for fan cards, memberships, and meet-and-greets,
and surfaces where fans publicly report unanswered requests or complaints.

Built with Next.js 14 (App Router), Supabase (PostgreSQL + Auth), and Google
Gemini for AI classification, entity resolution, sentiment analysis, and
summarization. 

## What this is NOT

- Not a scraper that bypasses logins, CAPTCHAs, or rate limits
- Not a private-message or private-account monitoring tool
- Not a source of verified facts from its AI output — AI-generated content is
  always labeled as inference, never presented as verified truth
- Not a claim that the Fan Demand Score measures objective popularity — it's
  an intelligence metric derived from measurable public-discussion signals

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Database**: PostgreSQL via Supabase, with Row Level Security
- **Auth**: Supabase Auth (email/password)
- **AI**: Google Gemini (`gemini-1.5-flash` by default), modular provider
  architecture in `src/lib/ai/` for swapping providers later
- **Data sources**: Reddit API (OAuth client_credentials, public data only),
  with automatic fallback to clearly-labeled demo data
- **Charts**: Recharts
- **Deployment**: Vercel (serverless functions + Vercel Cron)

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd celebrity-fan-demand-intelligence
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL Editor, run the three migration files in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_user_profile_trigger.sql`
3. Go to **Project Settings → API** and copy your Project URL, anon key, and
   service role key.
4. Go to **Authentication → URL Configuration** and add
   `http://localhost:3000/auth/callback` to Redirect URLs (add your production
   URL here too after deploying).

### 3. Get a Gemini API key

Create one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### 4. (Optional) Get Reddit API credentials

Create a "script" app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
for a client ID/secret. Without these, the app automatically runs in demo data
mode — no live ingestion is required for the app to function.

### 5. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every variable — see `.env.example` for what each one is and where to
get it. **Never commit `.env.local`.**

### 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up for an account, then in the Supabase
SQL Editor run:

```sql
update public.user_profiles set role = 'admin' where email = 'you@example.com';
```

to grant yourself admin access to `/dashboard/admin`.

### 7. Trigger your first data ingestion

From the Admin Panel, or manually:

```bash
curl -X GET "http://localhost:3000/api/cron" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This runs ingestion (live or demo, auto-detected), analytics recomputation,
and alert evaluation in one pass.

## Environment Variables Reference

| Variable | Required | Client-exposed? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **No** | Bypasses RLS; server-only, used by ingestion/admin routes |
| `GEMINI_API_KEY` | Yes for live AI | **No** | Server-only, used by `src/lib/ai/gemini.ts` |
| `GEMINI_MODEL` | No | No | Defaults to `gemini-1.5-flash` |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | No | **No** | Enables live Reddit ingestion; without it, demo mode is used |
| `REDDIT_USER_AGENT` | No | No | Required by Reddit's API terms |
| `YOUTUBE_API_KEY` | No | **No** | Reserved for a future YouTube connector (not yet implemented) |
| `DEMO_MODE` | No | No | Set `true` to force demo data regardless of other keys |
| `CRON_SECRET` | Yes | **No** | Authorizes Vercel Cron calls to `/api/cron` |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | Base URL used in server-side context |

## Analytics Formulas

Implemented in `src/lib/analytics/metrics.ts`. All percentages require a
minimum sample size (5) or display `INSUFFICIENT DATA` instead of a
potentially misleading number.

- **Fan Card Demand %** = fan-card discussions ÷ (fan-card + membership +
  meet-greet discussions) × 100
- **Membership Demand %** = membership discussions ÷ (same denominator) × 100
- **Meet & Greet Demand %** = meet-greet discussions ÷ (same denominator) × 100
- **Unanswered Request %** = unanswered discussions ÷ total relevant
  discussions × 100
- **Complaint %** = complaint discussions ÷ total relevant discussions × 100

## Fan Demand Score (0–100)

Implemented in `src/lib/analytics/score.ts`. A weighted, logarithmically-scaled
combination of discussion volume, fan-card/membership/meet-greet request
counts, unanswered requests, growth rate, and complaint volume. This is an
**intelligence metric**, not a measurement of objective popularity — the
scoring rationale is always shown alongside the number (see
`aiProvider.explainScore` and the celebrity detail page).

| Score | Level |
|---|---|
| 0–20 | Very Low |
| 21–40 | Low |
| 41–60 | Moderate |
| 61–80 | High |
| 81–100 | Very High |

## Demo Data Mode

If Reddit or Gemini credentials are missing (or `DEMO_MODE=true` is set), the
app automatically generates clearly-fictional demo data
(`src/lib/ingestion/demo-data.ts`). Every demo-sourced row is flagged
`is_demo: true` in the database and rendered with a visible "Demo Data" badge
throughout the UI. Demo data is never presented as real-world information.

## Deployment (Vercel)

See `DEPLOYMENT.md` for the full step-by-step walkthrough, including required
environment variables and Vercel Cron configuration/plan limitations.

## Project Structure

```
src/
  app/                  Routes (pages + API routes), App Router convention
    api/                Backend API routes
    dashboard/          Authenticated app pages
  components/           React components, grouped by feature area
  lib/
    ai/                 Modular AI provider (Gemini implementation + interface)
    analytics/          Metrics and scoring formulas
    ingestion/          Reddit connector, demo data generator, orchestrator
    alerts/             Alert threshold evaluation
    supabase/           Supabase client factories (browser/server/admin) + types
supabase/
  migrations/           SQL schema, RLS policies, triggers
```
