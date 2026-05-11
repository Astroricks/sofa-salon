import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT } from '@/lib/i18n';
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
      .select('wechat_id')
      .eq('id', user.id)
      .single();
    const wechatEmpty =
      profile?.wechat_id == null || String(profile?.wechat_id ?? '').trim() === '';
    if (wechatEmpty) redirect(`/profile/setup?redirect=${encodeURIComponent(goTo)}`);
    redirect(goTo);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 safe-area-inset-bottom">
      <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1 text-center">
        {APP_NAME_PARTS[0]}
        <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-10">
        {getT(cookies().get('sofa-salon-locale')?.value === 'zh' ? 'zh' : 'en').auth.loginSubtitle}
      </p>
      <LoginForm redirectTo={goTo} />
    </div>
  );
}
