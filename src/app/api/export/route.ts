import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  type: z.enum(['celebrities', 'discussions']).default('celebrities'),
  format: z.enum(['json', 'csv']).default('json'),
  celebrityId: z.string().uuid().optional(),
});

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
    format: searchParams.get('format') ?? undefined,
    celebrityId: searchParams.get('celebrityId') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { type, format, celebrityId } = parsed.data;

  let rows: Record<string, unknown>[] = [];
  let filename = 'export';

  if (type === 'celebrities') {
    let query = supabase
      .from('celebrities')
      .select(
        'canonical_name, category, country, verification_status, fan_demand_score, score_level, total_discussions, trend, is_demo, updated_at'
      );
    if (celebrityId) query = query.eq('id', celebrityId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    rows = data ?? [];
    filename = 'celebrities_export';
  } else {
    let query = supabase
      .from('public_discussions')
      .select(
        'celebrity_id, source_url, author_handle, content_excerpt, engagement_count, posted_at, is_demo'
      )
      .order('posted_at', { ascending: false })
      .limit(5000); // hard cap so a single export can't run away on a large dataset

    if (celebrityId) query = query.eq('celebrity_id', celebrityId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    rows = data ?? [];
    filename = 'discussions_export';
  }

  if (format === 'csv') {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  return NextResponse.json({ data: rows });
}
