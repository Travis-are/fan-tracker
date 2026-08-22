import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const alertTypeEnum = z.enum([
  'fan_card_increase',
  'membership_increase',
  'meet_greet_threshold',
  'unanswered_increase',
  'score_threshold',
]);

const postSchema = z.object({
  celebrityId: z.string().uuid().optional(), // optional: some alert types could be global later
  alertType: alertTypeEnum,
  thresholdValue: z.number().min(0).max(1000),
});

const patchSchema = z.object({
  alertId: z.string().uuid(),
  status: z.enum(['active', 'disabled']),
});

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('*, celebrities(canonical_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.celebrityId) {
    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('id')
      .eq('id', parsed.data.celebrityId)
      .maybeSingle();

    if (!celebrity) {
      return NextResponse.json({ error: 'Celebrity not found' }, { status: 404 });
    }
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: user.id,
      celebrity_id: parsed.data.celebrityId ?? null,
      alert_type: parsed.data.alertType,
      threshold_value: parsed.data.thresholdValue,
      status: 'active',
    } as any)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({ status: parsed.data.status } as any)
    .eq('id', parsed.data.alertId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Alert not found or update failed' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
