import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT, localeFromValue } from '@/lib/i18n';
import {
  ADMIN_PAST_PAGE_SIZE,
  ADMIN_SCREENING_LIST_SELECT,
} from '@/lib/admin-screenings-list';
import AdminEvents from './AdminEvents';
import AdminAnnouncement from './AdminAnnouncement';

export default async function AdminPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale = localeFromValue(cookieStore.get('sofa-salon-locale')?.value);
  const t = getT(locale);
  const now = new Date().toISOString();
  const [{ data: { user } }, { data: futureScreenings }, { data: initialPastScreenings }, { count: pastTotalCount }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('screenings')
        .select(ADMIN_SCREENING_LIST_SELECT)
        .gte('screening_at', now)
        .order('screening_at', { ascending: true }),
      supabase
        .from('screenings')
        .select(ADMIN_SCREENING_LIST_SELECT)
        .lt('screening_at', now)
        .order('screening_at', { ascending: false })
        .range(0, ADMIN_PAST_PAGE_SIZE - 1),
      supabase
        .from('screenings')
        .select('id', { count: 'exact', head: true })
        .lt('screening_at', now),
    ]);
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return (
        <div className="p-8 font-mono text-[13px] text-[#f87171]">
        {t.admin.adminOnly}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-[#0f0f0f]">
      <h1 className="font-mono text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]}{APP_NAME_PARTS.slice(1).join('')}{' '}
        <span className="text-[#e8c84a]">{t.admin.title}</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.eventsAndWaitlist}
      </p>
      <div className="flex gap-4 mb-8 flex-wrap">
        <Link
          href="/admin"
          className="bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:opacity-85 transition-opacity"
          style={{ borderRadius: 0 }}
        >
          {t.admin.events}
        </Link>
        <Link
          href="/admin/rooms"
          className="border border-[#2a2a2a] text-[#888888] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.rooms}
        </Link>
        <Link
          href="/admin/ratings"
          className="border border-[#2a2a2a] text-[#888888] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.ratingsReport}
        </Link>
        <Link
          href="/admin/ticker"
          className="border border-[#2a2a2a] text-[#888888] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.tickerManage}
        </Link>
        <Link
          href="/admin/feedback"
          className="border border-[#2a2a2a] text-[#888888] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.feedback}
        </Link>
        <Link
          href="/admin/settings"
          className="border border-[#2a2a2a] text-[#888888] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.settings}
        </Link>
        <Link
          href="/admin/test"
          className="border border-[#2a2a2a] text-[#888888] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.testFeatures}
        </Link>
      </div>
      <div className="mb-6">
        <Link
          href="/admin/screenings/new"
          className="inline-block bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:opacity-85 transition-opacity"
          style={{ borderRadius: 0 }}
        >
          {t.admin.newEvent}
        </Link>
      </div>
      <AdminAnnouncement />
      <AdminEvents
        futureScreenings={futureScreenings ?? []}
        initialPastScreenings={initialPastScreenings ?? []}
        pastTotalCount={pastTotalCount ?? 0}
        pastPageSize={ADMIN_PAST_PAGE_SIZE}
      />
    </div>
  );
}
