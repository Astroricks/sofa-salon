import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT, localeFromValue } from '@/lib/i18n';
import HistoricalAttendanceRegister from '@/components/HistoricalAttendanceRegister';

export const dynamic = 'force-dynamic';

export default async function ProfileHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirect=/profile/history');
  }

  const cookieStore = await cookies();
  const locale = localeFromValue(cookieStore.get('sofa-salon-locale')?.value);
  const t = getT(locale);

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto">
        <Link
          href="/profile"
          className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-4 inline-block"
        >
          {t.historyCatalog.backToProfile}
        </Link>
        <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
          {APP_NAME_PARTS[0]}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
        </h1>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
          {t.historyCatalog.title}
        </p>
        <HistoricalAttendanceRegister />
      </div>
    </div>
  );
}
