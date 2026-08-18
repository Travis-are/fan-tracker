import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <TrendingUp className="mb-4 h-8 w-8 text-accent-soft" />
      <h1 className="text-2xl font-semibold text-white">Page Not Found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-accent-glow"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
