import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import ProfileSetupForm from './ProfileSetupForm';

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirect=/profile/setup');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, wechat_id, avatar_config')
    .eq('id', user.id)
    .single();

  const wechatFilled =
    profile?.wechat_id != null && String(profile.wechat_id).trim() !== '';
  if (wechatFilled) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 safe-area-inset-bottom">
      <div className="max-w-md mx-auto">
        <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
          {APP_NAME_PARTS[0]}{' '}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join(' ')}</span>
        </h1>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-8">
          Complete your profile to reserve seats
        </p>
        <ProfileSetupForm
          initialDisplayName={profile?.display_name ?? ''}
          initialWechatId={profile?.wechat_id ?? ''}
          initialAvatarConfig={profile?.avatar_config ?? {}}
        />
      </div>
    </div>
  );
}
