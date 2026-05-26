import AvatarSVG from '@/components/AvatarSVG';
import PigeonIcon from '@/components/PigeonIcon';
import { jsonToConfig } from '@/lib/avatar';

const AVATAR_SIZE = 40;

export default function LeaderboardGuestCell({
  displayName,
  avatarConfig,
  isPigeon,
  isYou,
  youLabel,
}: {
  displayName: string;
  avatarConfig: unknown;
  isPigeon: boolean;
  isYou?: boolean;
  youLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex-shrink-0">
        {isPigeon ? (
          <PigeonIcon size={AVATAR_SIZE} className="block" title="Pigeon" />
        ) : avatarConfig ? (
          <AvatarSVG config={jsonToConfig(avatarConfig)} size={AVATAR_SIZE} pose="stand" />
        ) : (
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a]"
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 0 }}
            aria-hidden
          />
        )}
      </div>
      <span className="truncate font-mono text-[14px] leading-snug" title={displayName}>
        {displayName}
        {isYou && youLabel ? (
          <span className="ml-1.5 text-[#e8c84a] text-[12px]">({youLabel})</span>
        ) : null}
      </span>
    </div>
  );
}
