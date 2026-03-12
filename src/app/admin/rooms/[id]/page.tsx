import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import AdminRoomEditor from './AdminRoomEditor';

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, furniture_json, decorations_json, canvas_w, canvas_h')
    .eq('id', id)
    .single();

  if (!room) notFound();

  const furniture = (room.furniture_json as Array<unknown>) ?? [];
  const decorations = (room.decorations_json as Array<unknown>) ?? [];

  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f]">
      <AdminRoomEditor
        roomId={room.id}
        initialName={room.name}
        initialFurniture={furniture}
        initialDecorations={decorations}
        canvasW={room.canvas_w ?? 600}
        canvasH={room.canvas_h ?? 400}
      />
    </div>
  );
}
