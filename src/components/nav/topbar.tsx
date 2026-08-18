'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Search } from 'lucide-react';
import Link from 'next/link';

export default function TopBar({ userName }: { userName: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-background-surface/80 px-4 py-4 backdrop-blur md:px-8">
      <Link
        href="/dashboard/search"
        className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-muted transition hover:border-accent/50"
      >
        <Search className="h-4 w-4" />
        Search celebrities, platforms, complaint types...
      </Link>

      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-muted sm:inline">{userName}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-negative/50 hover:text-negative"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </header>
  );
}
