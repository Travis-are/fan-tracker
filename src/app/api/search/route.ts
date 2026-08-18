import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['all', 'celebrity', 'platform', 'complaint_type']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  no_response: 'No Response',
  waiting_for_reply: 'Waiting for Reply',
  request_unanswered: 'Request Unanswered',
  asking_for_response: 'Asking for Response',
  fan_card_complaint: 'Fan Card Complaint',
  general_frustration: 'General Frustration',
  general_confusion: 'General Confusion',
  negative_experience: 'Negative Experience',
  delayed_communication: 'Delayed Communication',
};

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
    q: searchParams.get('q') ?? '',
    type: searchParams.get('type') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { q, type, limit } = parsed.data;
  const results: {
    celebrities: any[];
    platforms: any[];
    complaintTypes: any[];
  } = { celebrities: [], platforms: [], complaintTypes: [] };

  // --- Celebrities: match canonical_name OR any alias ---
  if (type === 'all' || type === 'celebrity') {
    const { data: byName } = await supabase
      .from('celebrities')
      .select('id, canonical_name, category, fan_demand_score, score_level, is_demo')
      .ilike('canonical_name', `%${q}%`)
      .limit(limit);

    const { data: aliasMatches } = await supabase
      .from('celebrity_aliases')
      .select('celebrity_id, alias')
      .ilike('alias', `%${q}%`)
      .limit(limit);

    const aliasCelebrityIds = [...new Set((aliasMatches ?? []).map((a) => a.celebrity_id))];
    let byAlias: any[] = [];
    if (aliasCelebrityIds.length > 0) {
      const { data } = await supabase
        .from('celebrities')
        .select('id, canonical_name, category, fan_demand_score, score_level, is_demo')
        .in('id', aliasCelebrityIds);
      byAlias = data ?? [];
    }

    const merged = new Map<string, any>();
    for (const c of [...(byName ?? []), ...byAlias]) {
      merged.set(c.id, c);
    }
    results.celebrities = Array.from(merged.values()).slice(0, limit);
  }

  // --- Platforms ---
  if (type === 'all' || type === 'platform') {
    const { data: platforms } = await supabase
      .from('social_platforms')
      .select('id, name, display_name')
      .ilike('display_name', `%${q}%`)
      .limit(limit);
    results.platforms = platforms ?? [];
  }

  // --- Complaint types (matched against static label map, not a DB query) ---
  if (type === 'all' || type === 'complaint_type') {
    const lowerQ = q.toLowerCase();
    results.complaintTypes = Object.entries(COMPLAINT_TYPE_LABELS)
      .filter(([, label]) => label.toLowerCase().includes(lowerQ))
      .map(([value, label]) => ({ value, label }))
      .slice(0, limit);
  }

  return NextResponse.json({ data: results, query: q });
}
