import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { APP_NAME_PARTS } from '@/lib/config';
import { t } from '@/lib/i18n';
import AdminEvents from './AdminEvents';

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: screenings }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('screenings')
      .select(`
        id,
        title,
        screening_at,
        waitlist_mode,
        room_id,
        rooms ( name )
      `)
      .order('screening_at', { ascending: false })
      .limit(20),
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
      <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]}{' '}
        <span className="text-[#e8c84a]">Admin</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.eventsAndWaitlist}
      </p>
      <div className="flex gap-4 mb-8 flex-wrap">
        <Link
          href="/admin/rooms"
          className="border border-[#2a2a2a] text-[#888888] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.rooms}
        </Link>
        <Link
          href="/admin/screenings/new"
          className="bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase hover:opacity-85 transition-opacity"
          style={{ borderRadius: 0 }}
        >
          {t.admin.newEvent}
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
      </div>
      <AdminEvents screenings={screenings ?? []} />
    </div>
  );
}
