import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT, localeFromValue } from '@/lib/i18n';
import { hasProfileContact } from '@/lib/contact-platform';
import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const supabase = await createClient();
  const { redirect: redirectParam } = await searchParams;
  const goTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wechat_id, contact_platform, contact_id')
      .eq('id', user.id)
      .single();
    if (!hasProfileContact(profile)) {
      redirect(`/profile/setup?redirect=${encodeURIComponent(goTo)}`);
    }
    redirect(goTo);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 safe-area-inset-bottom">
      <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1 text-center">
        {APP_NAME_PARTS[0]}
        <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-10">
        {getT(localeFromValue(cookies().get('sofa-salon-locale')?.value)).auth.loginSubtitle}
      </p>
      <LoginForm redirectTo={goTo} />
    </div>
  );
}
