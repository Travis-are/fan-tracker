import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const patchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['member', 'admin']),
});

async function requireAdmin() {
  const supabase = createClient();
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

  return { userId: user.id };
}

export async function GET() {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const db = createAdminClient();
  const { data, error } = await db
    .from('user_profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('user_profiles')
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() } as never)
    .eq('id', parsed.data.userId)
    .select('id, email, role')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
