'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { randomAvatarConfig, type AvatarConfig } from '@/lib/avatar';
import AvatarSVG from '@/components/AvatarSVG';
import { useLocale } from '@/components/LocaleProvider';

interface Props {
  initialConfig: AvatarConfig;
  onSave?: (config: AvatarConfig) => void;
}

export default function AvatarRegen({ initialConfig, onSave }: Props) {
  const { t } = useLocale();
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  const regenerate = async () => {
    const newConfig = randomAvatarConfig();
    setConfig(newConfig);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ avatar_config: newConfig })
        .eq('id', user.id);
      onSave?.(newConfig);
    }
    setSaving(false);
  };

  return (
    <div className="w-full">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
        {t.profile.avatarPreview}
      </p>
      <div className="flex gap-4 items-end flex-wrap">
        <div className="flex flex-col items-center gap-1">
          <AvatarSVG config={config} size={48} pose="stand" />
          <span className="font-mono text-[10px] text-[#444444]">{t.profile.avatarStand}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <AvatarSVG config={config} size={48} pose="sit" />
          <span className="font-mono text-[10px] text-[#444444]">{t.profile.avatarSit}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={regenerate}
        disabled={saving}
        className="w-full mt-4 bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase px-6 py-3 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
        style={{ borderRadius: 0 }}
      >
        {t.profile.avatarRegenerate}
      </button>
      <p className="font-mono text-[10px] text-[#444444] mt-2 text-center">
        {t.profile.avatarRegenerateHint}
      </p>
    </div>
  );
}
