import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import { t } from '@/lib/i18n';

export default async function AdminRoomsPage() {
  const supabase = await createClient();
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
      <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]}{' '}
        <span className="text-[#e8c84a]">Rooms</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        Saved layouts
      </p>
      <Link
        href="/admin/rooms/new"
        className="inline-block bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase mb-6 hover:opacity-85 transition-opacity"
        style={{ borderRadius: 0 }}
      >
        New room
      </Link>
      <ul className="space-y-2">
        {(rooms ?? []).map((room) => (
          <li key={room.id}>
            <Link
              href={`/admin/rooms/${room.id}`}
              className="block border border-[#2a2a2a] bg-[#161616] p-4 hover:border-[#e8c84a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              <span className="font-mono text-[13px] text-[#e8e4dc]">{room.name}</span>
              <span className="font-mono text-[13px] text-[#444444] ml-2">
                {new Date(room.created_at).toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
