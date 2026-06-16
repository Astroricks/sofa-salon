'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, getT, type Locale } from '@/lib/i18n';
import { getStoredLocale, setStoredLocale } from '@/lib/i18n';

type T = ReturnType<typeof getT>;

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: T;
} | null>(null);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useEffect(() => {
    const stored = getStoredLocale(initialLocale);
    setLocaleState(stored);
    if (typeof document !== 'undefined') {
      document.cookie = `sofa-salon-locale=${stored}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [initialLocale]);
  const setLocale = useCallback((next: Locale) => {
    setStoredLocale(next);
    setLocaleState(next);
    router.refresh();
  }, [router]);
  const t = getT(locale);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: getT(DEFAULT_LOCALE),
    };
  }
  return ctx;
}
