import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminDashboardClient from '@/components/admin/admin-dashboard-client';

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Server-side re-check, independent of the sidebar link visibility and
  // independent of middleware — this page enforces its own authorization.
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return <AdminDashboardClient />;
}
