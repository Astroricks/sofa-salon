import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { roomCapacity, type FurniturePiece } from '@/lib/furniture';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, furniture_json')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    rooms: (data ?? []).map((room) => ({
      id: room.id,
      name: room.name,
      capacity: roomCapacity(
        (room.furniture_json as FurniturePiece[] | null) ?? []
      ),
    })),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const {
    id,
    name,
    furniture,
    decorations,
    canvasW,
    canvasH,
    roomBackgroundId,
  } = body;

  if (!name || !Array.isArray(furniture) || !Array.isArray(decorations)) {
    return NextResponse.json(
      { error: 'name, furniture, decorations required' },
      { status: 400 }
    );
  }

  if (id) {
    const update: Record<string, unknown> = {
      name,
      furniture_json: furniture,
      decorations_json: decorations,
      canvas_w: canvasW ?? undefined,
      canvas_h: canvasH ?? undefined,
      updated_at: new Date().toISOString(),
    };
    if (typeof roomBackgroundId === 'string' && roomBackgroundId.trim()) {
      update.room_background_id = roomBackgroundId.trim();
    }
    const { data, error } = await supabase
      .from('rooms')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ room: data });
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name,
      furniture_json: furniture,
      decorations_json: decorations,
      canvas_w: canvasW ?? 600,
      canvas_h: canvasH ?? 400,
      owner_id: user.id,
      room_background_id: typeof roomBackgroundId === 'string' && roomBackgroundId.trim() ? roomBackgroundId.trim() : 'warm',
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ room: data });
}
