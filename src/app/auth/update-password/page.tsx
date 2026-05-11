import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UpdatePasswordForm from './UpdatePasswordForm';

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { redirect: redirectParam } = await searchParams;
  const goTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 safe-area-inset-bottom pt-24">
      <UpdatePasswordForm redirectTo={goTo} />
    </div>
  );
}
