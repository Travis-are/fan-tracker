import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profile as { role: string } | null)?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  const supabase = createClient();
  const check = await requireAdmin(supabase);
  if (check.error) return check.error;

  const db = createAdminClient();

  const [
    { count: totalCelebrities },
    { count: totalDiscussions },
    { count: totalUsers },
    { data: dataSources },
    { data: recentJobs },
    { count: errorLogCount },
  ] = await Promise.all([
    db.from('celebrities').select('*', { count: 'exact', head: true }),
    db.from('public_discussions').select('*', { count: 'exact', head: true }),
    db.from('user_profiles').select('*', { count: 'exact', head: true }),
    db.from('data_sources').select('*, social_platforms(display_name)').order('created_at', { ascending: false }),
    db.from('ingestion_jobs').select('*').order('created_at', { ascending: false }).limit(10),
    db
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'error')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const demoMode =
    process.env.DEMO_MODE === 'true' ||
    !process.env.REDDIT_CLIENT_ID ||
    !process.env.GEMINI_API_KEY;

  return NextResponse.json({
    data: {
      totalCelebrities: totalCelebrities ?? 0,
      totalDiscussions: totalDiscussions ?? 0,
      totalUsers: totalUsers ?? 0,
      demoMode,
      aiProvider: {
        name: 'gemini',
        configured: !!process.env.GEMINI_API_KEY,
      },
      dataSources: dataSources ?? [],
      recentIngestionJobs: recentJobs ?? [],
      errorLogCountLast7Days: errorLogCount ?? 0,
    },
  });
}
