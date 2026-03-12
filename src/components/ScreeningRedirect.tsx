'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MOBILE_BREAKPOINT = 640;

interface Props {
  screeningId: string;
  children: React.ReactNode;
}

export default function ScreeningRedirect({ screeningId, children }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      router.replace(`/?open=${encodeURIComponent(screeningId)}`);
    }
  }, [screeningId, router]);

  return <>{children}</>;
}
