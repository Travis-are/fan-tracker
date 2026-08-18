import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TrendingUp, CreditCard, Handshake, AlertTriangle, ArrowRight } from 'lucide-react';

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-accent" />
          <span className="text-sm font-semibold text-white">Fan Demand Intelligence</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg border border-border px-4 py-2 text-sm text-white transition hover:border-accent/50"
        >
          Sign In
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-20 text-center md:px-12">
        <h1 className="text-3xl font-semibold leading-tight text-white md:text-5xl">
          Which public figures have the
          <span className="text-accent-soft"> strongest fan demand</span> right now?
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted md:text-lg">
          AI-powered intelligence tracking public demand for fan cards, memberships, and
          meet-and-greets — and where fans are publicly reporting unanswered requests.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-glow transition hover:bg-accent-glow"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card p-6 text-left">
            <CreditCard className="mb-3 h-5 w-5 text-accent-soft" />
            <h3 className="mb-1 text-sm font-semibold text-white">Fan Card & Membership Demand</h3>
            <p className="text-xs text-muted">
              Track public requests for fan cards, VIP memberships, and fan club access.
            </p>
          </div>
          <div className="glass-card p-6 text-left">
            <Handshake className="mb-3 h-5 w-5 text-accent-soft" />
            <h3 className="mb-1 text-sm font-semibold text-white">Meet & Greet Signals</h3>
            <p className="text-xs text-muted">
              Surface public interest in meet-and-greets and fan events as they emerge.
            </p>
          </div>
          <div className="glass-card p-6 text-left">
            <AlertTriangle className="mb-3 h-5 w-5 text-accent-soft" />
            <h3 className="mb-1 text-sm font-semibold text-white">Unanswered Request Tracking</h3>
            <p className="text-xs text-muted">
              Identify where fans report requests going unanswered, from public sources only.
            </p>
          </div>
        </div>

        <p className="mt-12 text-xs text-muted">
          Built on permitted public data sources only. AI analysis is clearly labeled and
          distinguished from verified facts.
        </p>
      </main>
    </div>
  );
}
