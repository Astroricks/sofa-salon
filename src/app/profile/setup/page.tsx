import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT, localeFromValue } from '@/lib/i18n';
import { hasProfileContact } from '@/lib/contact-platform';
import ProfileSetupForm from './ProfileSetupForm';

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const supabase = await createClient();
  const { redirect: redirectParam } = await searchParams;
  const redirectTo =
    redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, wechat_id, contact_platform, contact_id, avatar_config')
    .eq('id', user.id)
    .single();

  if (hasProfileContact(profile)) {
    redirect(redirectTo);
  }

  const t = getT(localeFromValue(cookies().get('sofa-salon-locale')?.value));

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 safe-area-inset-bottom">
      <div className="max-w-md mx-auto">
        <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
          {APP_NAME_PARTS[0]}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
        </h1>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-8">
          {t.profile.setupSubtitle}
        </p>
        <ProfileSetupForm
          initialDisplayName={profile?.display_name ?? ''}
          initialContactPlatform={profile?.contact_platform ?? 'wechat'}
          initialContactId={profile?.contact_id ?? ''}
          initialWechatId={profile?.wechat_id ?? ''}
          initialAvatarConfig={profile?.avatar_config ?? {}}
          redirectTo={redirectTo}
        />
      </div>
    </div>
  );
}
