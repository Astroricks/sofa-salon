'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AvatarRegen from '@/components/AvatarRegen';
import { jsonToConfig, type AvatarConfig } from '@/lib/avatar';

interface Props {
  initialDisplayName: string;
  initialWechatId: string;
  initialAvatarConfig: unknown;
}

export default function ProfileSetupForm({
  initialDisplayName,
  initialWechatId,
  initialAvatarConfig,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [wechatId, setWechatId] = useState(initialWechatId);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
    jsonToConfig(initialAvatarConfig)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const wechat = String(wechatId).trim();
    if (!wechat) {
      setError('WeChat ID is required.');
      return;
    }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in.');
      setSaving(false);
      return;
    }
    const { error: e } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          display_name: displayName.trim() || (user.email?.split('@')[0] ?? 'Guest'),
          wechat_id: wechat,
          avatar_config: avatarConfig,
        },
        { onConflict: 'id' }
      );
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-6"
    >
      <div>
        <label
          htmlFor="displayName"
          className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2"
        >
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] transition-colors placeholder:text-[#444444]"
          style={{ borderRadius: 0 }}
          placeholder="Your name"
        />
      </div>
      <div>
        <label
          htmlFor="wechatId"
          className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2"
        >
          WeChat ID / 微信号 <span className="text-[#f87171]">*</span>
        </label>
        <input
          id="wechatId"
          type="text"
          value={wechatId}
          onChange={(e) => setWechatId(e.target.value)}
          className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] transition-colors placeholder:text-[#444444]"
          style={{ borderRadius: 0 }}
          placeholder="WeChat ID"
          required
        />
      </div>
      <AvatarRegen
        initialConfig={avatarConfig}
        onSave={(config) => setAvatarConfig(config)}
      />
      {error && (
        <p className="font-mono text-[13px] text-[#f87171]">{error}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
        style={{ borderRadius: 0 }}
      >
        Save
      </button>
    </form>
  );
}
