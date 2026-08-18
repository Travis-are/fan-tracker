import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/dashboard/settings-form';
import { Settings as SettingsIcon } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-accent-soft" />
        <div>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-muted">Manage your account</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted">Account Role</span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
              profile?.role === 'admin' ? 'bg-accent/15 text-accent-soft' : 'bg-white/5 text-muted'
            }`}
          >
            {profile?.role ?? 'member'}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted">Email</span>
          <span className="text-sm text-white">{profile?.email}</span>
        </div>
      </div>

      <SettingsForm initialFullName={profile?.full_name ?? ''} />
    </div>
  );
}
