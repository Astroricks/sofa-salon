import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT, localeFromValue } from '@/lib/i18n';
import AdminRoomRow from './AdminRoomRow';

export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale = localeFromValue(cookieStore.get('sofa-salon-locale')?.value);
  const t = getT(locale);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return (
      <div className="p-8 font-mono text-[13px] text-[#f87171]">{t.admin.adminOnly}</div>
    );
  }

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-[#0f0f0f]">
      <Link
        href="/admin"
        className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block transition-colors"
      >
        {t.admin.backToAdmin}
      </Link>
      <h1 className="font-mono text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]}{APP_NAME_PARTS.slice(1).join('')}{' '}
        <span className="text-[#e8c84a]">{t.admin.rooms}</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.savedLayouts}
      </p>
      <Link
        href="/admin/rooms/new"
        className="inline-block bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase mb-6 hover:opacity-85 transition-opacity"
        style={{ borderRadius: 0 }}
      >
        {t.admin.newRoom}
      </Link>
      <ul className="space-y-2">
        {(rooms ?? []).map((room) => (
          <AdminRoomRow key={room.id} room={room} />
        ))}
      </ul>
    </div>
  );
}
