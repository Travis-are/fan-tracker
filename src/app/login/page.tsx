import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginForm from '@/components/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(searchParams.redirectTo || '/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">
            Celebrity Fan Demand Intelligence
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to access your dashboard
          </p>
        </div>
        <LoginForm redirectTo={searchParams.redirectTo} />
      </div>
    </div>
  );
}
