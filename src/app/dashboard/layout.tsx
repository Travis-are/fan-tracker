import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/nav/sidebar';
import TopBar from '@/components/nav/topbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isAdmin={profile?.role === 'admin'} />
      <div className="flex flex-1 flex-col md:pl-64">
        <TopBar userName={profile?.full_name || profile?.email || 'User'} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
