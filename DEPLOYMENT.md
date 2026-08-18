# Deployment Guide (Vercel)

This walks through deploying the already-built app to Vercel. It assumes
you've already completed the local setup in `README.md` (Supabase project
created, migrations run, `.env.local` working, app runs with `npm run dev`).

**Note on ownership of this step**: this app deploys to Vercel via GitHub
integration — you connect your GitHub repo to Vercel, and Vercel builds/
deploys it. There's no separate "deploy command" you run from this codebase.

## 1. Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial commit: Celebrity Fan Demand Intelligence"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Double-check `.env.local` is **not** in this commit — it should be excluded
by `.gitignore` (file 9). Run `git status` before committing and confirm you
don't see `.env.local` listed.

## 2. Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Select "Import Git Repository" and choose your GitHub repo.
3. Vercel will auto-detect Next.js — leave the default build settings
   (`npm run build`, output directory auto-detected).
4. **Do not deploy yet** — first add environment variables (next step),
   otherwise the first build will fail on missing env vars.

## 3. Add environment variables in Vercel

In the Vercel project's **Settings → Environment Variables**, add every
variable from your `.env.local`:

| Variable | Value source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret) |
| `GEMINI_API_KEY` | Google AI Studio |
| `GEMINI_MODEL` | `gemini-1.5-flash` (or leave unset for the default) |
| `REDDIT_CLIENT_ID` | Reddit app settings (optional) |
| `REDDIT_CLIENT_SECRET` | Reddit app settings (optional) |
| `REDDIT_USER_AGENT` | e.g. `celebrity-fan-demand-intel/1.0` |
| `DEMO_MODE` | `false` (or `true` to force demo data) |
| `CRON_SECRET` | Generate a long random string yourself (e.g. `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL, e.g. `https://your-app.vercel.app` (you'll know this after the first deploy — update it after) |

Set each for **Production**, and optionally **Preview**, environments.

**Never** paste `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`,
`REDDIT_CLIENT_SECRET`, or `CRON_SECRET` anywhere outside this Vercel
environment variable settings page — not in code, not in `vercel.json`, not
in a committed file.

## 4. Deploy

Click **Deploy**. Vercel will build and deploy. Watch the build logs — if it
fails, it's almost always a missing/misnamed environment variable or a
TypeScript error; the log will tell you which file.

## 5. Update Supabase redirect URLs

Once deployed, go back to **Supabase → Authentication → URL Configuration**
and add your real Vercel URL's callback:

```
https://your-app.vercel.app/auth/callback
```

Also update `NEXT_PUBLIC_APP_URL` in Vercel's env vars to match, then
redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new value takes effect.

## 6. Configure Vercel Cron (important plan caveat)

`vercel.json` (file 44) currently schedules `/api/cron` every 6 hours:

```json
"schedule": "0 */6 * * *"
```

**If you're on Vercel's free Hobby plan, cron jobs are limited to once per
day.** A more-frequent schedule will either fail silently or be rejected at
deploy time. If you're on Hobby, change the schedule before deploying to:

```json
"schedule": "0 6 * * *"
```

(runs once daily at 6am UTC). If you're on Vercel Pro, the every-6-hours
schedule works as-is.

## 7. Promote yourself to admin (production)

Same as local setup — sign up through your live app, then in Supabase's SQL
Editor:

```sql
update public.user_profiles set role = 'admin' where email = 'you@example.com';
```

## 8. Verify

- Visit your production URL, sign up, confirm login works
- Check `/dashboard/admin` shows your system status (demo mode vs live mode
  will reflect whichever credentials you actually configured)
- Manually trigger `/api/cron` once (with the `Authorization: Bearer
  YOUR_CRON_SECRET` header) to confirm ingestion + analytics run without
  errors, then check `/dashboard` populates with celebrities and discussions

## Troubleshooting

- **Build fails on a Supabase type error**: confirm `src/lib/supabase/types.ts`
  wasn't accidentally modified/truncated when pasting.
- **500 errors on any `/api/*` route in production but not locally**: almost
  always a missing Vercel env var — check the function logs in Vercel's
  dashboard (Deployments → your deployment → Functions).
- **Cron never runs**: confirm `CRON_SECRET` is set in Vercel and that your
  plan supports the schedule you set in `vercel.json`.
- **"Insufficient data" everywhere and no celebrities appear**: you haven't
  triggered ingestion yet — hit `/api/cron` once manually, or wait for the
  scheduled run.
