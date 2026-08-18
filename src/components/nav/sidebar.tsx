'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Star,
  Bell,
  Settings,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/discover', label: 'Discover', icon: Compass },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: Star },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background-surface md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <TrendingUp className="h-6 w-6 text-accent" />
        <span className="text-sm font-semibold leading-tight text-white">
          Fan Demand
          <br />
          Intelligence
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? 'bg-accent/15 text-white shadow-glow'
                  : 'text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-border" />
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                pathname === '/dashboard/admin'
                  ? 'bg-accent/15 text-white shadow-glow'
                  : 'text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
