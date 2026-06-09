'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { APP_NAME_PARTS, APP_TAGLINE } from '@/lib/config';
import { useLocale } from '@/components/LocaleProvider';
import AvatarSVG from '@/components/AvatarSVG';
import PigeonIcon from '@/components/PigeonIcon';
import { jsonToConfig } from '@/lib/avatar';
import { getBadgeLevel } from '@/lib/badges';
import { fetchAttendanceCountForUser } from '@/lib/attendance';

function AvatarAndBadge({
  noShowCount,
  attendanceCount,
  profile,
  size,
}: {
  noShowCount: number;
  attendanceCount: number;
  profile: { display_name: string; avatar_config: unknown; is_admin?: boolean } | null;
  size: number;
}) {
  const isPigeon = noShowCount >= 3;
  const badge = getBadgeLevel(attendanceCount);

  return (
    <div className="flex items-center gap-1.5">
      {isPigeon ? (
        <PigeonIcon size={44} className="flex-shrink-0" title="Pigeon" />
      ) : profile?.avatar_config ? (
        <AvatarSVG config={jsonToConfig(profile.avatar_config)} size={size} pose="stand" />
      ) : (
        <div className="bg-cinema-s2 border border-cinema-border flex-shrink-0" style={{ width: size, height: size, borderRadius: 0 }} />
      )}
      {badge && (
        <span className="text-sm leading-none" title={`${badge.labelEn} (${badge.label})`}>
          {badge.emoji}
        </span>
      )}
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const [profile, setProfile] = useState<{
    display_name: string;
    avatar_config: unknown;
    is_admin?: boolean;
    no_show_count?: number | null;
  } | null>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAttendanceCount(0);
      return;
    }
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('display_name, avatar_config, is_admin, no_show_count')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data ?? null));
    fetchAttendanceCountForUser(supabase, user.id).then((n) => setAttendanceCount(n));
  }, [user, pathname]);

  const signOut = async () => {
    setMobileMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const linkClass = (active: boolean) =>
    `font-mono text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-[#e8c84a] block py-2 ${
      active ? 'text-[#e8c84a]' : 'text-[#888888]'
    }`;

  const pastScreeningsNavLink = (extraClass = '', onNavigate?: () => void) => {
    const href = t.nav.pastScreeningsHref;
    const isExternal = href.startsWith('http://') || href.startsWith('https://');
    const className = linkClass(!isExternal && !!pathname?.startsWith(href)) + extraClass;
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={onNavigate}
        >
          {t.nav.pastScreenings}
        </a>
      );
    }
    return (
      <Link href={href} className={className} onClick={onNavigate}>
        {t.nav.pastScreenings}
      </Link>
    );
  };

  return (
    <header className="border-b border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 flex items-center justify-between sticky top-0 z-50 safe-area-inset-top">
      <Link href="/" className="font-pixel text-sm text-[#e8e4dc] no-underline flex flex-col min-w-0">
          <span>
          {APP_NAME_PARTS[0]}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
        </span>
        <span className="font-mono text-[9px] tracking-widest uppercase text-[#666] mt-0.5 truncate">
          {APP_TAGLINE}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <div className="flex font-mono text-[10px] tracking-wider uppercase">
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-2 py-1 min-h-[44px] flex items-center transition-colors ${
              locale === 'en' ? 'text-[#e8c84a]' : 'text-[#666] hover:text-[#888888]'
            }`}
            aria-label="English"
          >
            EN
          </button>
          <span className="text-[#2a2a2a]">|</span>
          <button
            type="button"
            onClick={() => setLocale('zh')}
            className={`px-2 py-1 min-h-[44px] flex items-center transition-colors ${
              locale === 'zh' ? 'text-[#e8c84a]' : 'text-[#666] hover:text-[#888888]'
            }`}
            aria-label="中文"
          >
            中文
          </button>
        </div>

        {user ? (
          <>
            <Link
              href="/profile"
              className="hidden md:flex items-center gap-2 min-w-[44px] min-h-[44px] justify-end"
              aria-label={t.nav.profile}
            >
              <AvatarAndBadge
                noShowCount={profile?.no_show_count ?? 0}
                attendanceCount={attendanceCount}
                profile={profile}
                size={32}
              />
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/" className={linkClass(pathname === '/')}>
                {t.nav.home}
              </Link>
              {pastScreeningsNavLink()}
              <Link href="/leaderboard" className={linkClass(!!pathname?.startsWith('/leaderboard'))}>
                {t.nav.leaderboard}
              </Link>
              <Link href="/contact" className={linkClass(!!pathname?.startsWith('/contact'))}>
                {t.nav.contactHost}
              </Link>
              <a
                href={t.nav.developedByHref}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass(false)}
              >
                {t.nav.developedBy}
              </a>
              <Link href="/profile" className={linkClass(!!pathname?.startsWith('/profile'))}>
                {t.nav.profile}
              </Link>
              {profile?.is_admin && (
                <Link href="/admin" className={linkClass(!!pathname?.startsWith('/admin'))}>
                  {t.nav.admin}
                </Link>
              )}
            </nav>
            <button
              type="button"
              onClick={signOut}
              className="hidden md:block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] transition-colors ml-2"
            >
              {t.nav.logOut}
            </button>

            {/* Mobile: hamburger + menu */}
            <div className="md:hidden relative">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1.5 text-[#888888] hover:text-[#e8c84a]"
                aria-expanded={mobileMenuOpen}
                aria-label="Menu"
              >
                <span className="w-5 h-0.5 bg-current" />
                <span className="w-5 h-0.5 bg-current" />
                <span className="w-5 h-0.5 bg-current" />
              </button>
              {mobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 py-2 min-w-[160px] bg-[#0f0f0f] border border-[#2a2a2a] z-50"
                    style={{ borderRadius: 0 }}
                  >
                    <Link
                      href="/"
                      className={linkClass(pathname === '/') + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.home}
                    </Link>
                    {pastScreeningsNavLink(' px-4', () => setMobileMenuOpen(false))}
                    <Link
                      href="/leaderboard"
                      className={linkClass(!!pathname?.startsWith('/leaderboard')) + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.leaderboard}
                    </Link>
                    <Link
                      href="/contact"
                      className={linkClass(!!pathname?.startsWith('/contact')) + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.contactHost}
                    </Link>
                    <a
                      href={t.nav.developedByHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass(false) + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.developedBy}
                    </a>
                    <Link
                      href="/profile"
                      className={linkClass(!!pathname?.startsWith('/profile')) + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.profile}
                    </Link>
                    {profile?.is_admin && (
                      <Link
                        href="/admin"
                        className={linkClass(!!pathname?.startsWith('/admin')) + ' px-4'}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t.nav.admin}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={signOut}
                      className="w-full text-left font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] py-2 px-4 transition-colors"
                    >
                      {t.nav.logOut}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Guest desktop: same row as signed-in md+ layout */}
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/" className={linkClass(pathname === '/')}>
                {t.nav.home}
              </Link>
              {pastScreeningsNavLink()}
              <Link href="/leaderboard" className={linkClass(!!pathname?.startsWith('/leaderboard'))}>
                {t.nav.leaderboard}
              </Link>
              <Link href="/contact" className={linkClass(!!pathname?.startsWith('/contact'))}>
                {t.nav.contactHost}
              </Link>
              <a
                href={t.nav.developedByHref}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass(false)}
              >
                {t.nav.developedBy}
              </a>
              <Link
                href="/auth/login"
                className="bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-6 min-h-[44px] flex items-center hover:opacity-85 active:scale-[0.97] transition-all"
                style={{ borderRadius: 0 }}
              >
                {t.nav.signIn}
              </Link>
            </nav>

            {/* Guest mobile: hamburger only (matches signed-in — no inline nav cramming) */}
            <div className="md:hidden relative">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1.5 text-[#888888] hover:text-[#e8c84a]"
                aria-expanded={mobileMenuOpen}
                aria-label="Menu"
              >
                <span className="w-5 h-0.5 bg-current" />
                <span className="w-5 h-0.5 bg-current" />
                <span className="w-5 h-0.5 bg-current" />
              </button>
              {mobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 py-2 min-w-[160px] bg-[#0f0f0f] border border-[#2a2a2a] z-50"
                    style={{ borderRadius: 0 }}
                  >
                    <Link
                      href="/"
                      className={linkClass(pathname === '/') + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.home}
                    </Link>
                    {pastScreeningsNavLink(' px-4', () => setMobileMenuOpen(false))}
                    <Link
                      href="/leaderboard"
                      className={linkClass(!!pathname?.startsWith('/leaderboard')) + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.leaderboard}
                    </Link>
                    <Link
                      href="/contact"
                      className={linkClass(!!pathname?.startsWith('/contact')) + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.contactHost}
                    </Link>
                    <a
                      href={t.nav.developedByHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass(false) + ' px-4'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.developedBy}
                    </a>
                    <Link
                      href="/auth/login"
                      className="block mx-3 mt-1 mb-1 bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-4 text-center hover:opacity-85 active:scale-[0.97] transition-all"
                      style={{ borderRadius: 0 }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.signIn}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
