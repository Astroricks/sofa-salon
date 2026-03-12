'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getT, type Locale } from '@/lib/i18n';
import { getStoredLocale, setStoredLocale } from '@/lib/i18n';

type T = ReturnType<typeof getT>;

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: T;
} | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    if (typeof document !== 'undefined') {
      document.cookie = `sofa-salon-locale=${stored}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);
  const setLocale = useCallback((next: Locale) => {
    setStoredLocale(next);
    setLocaleState(next);
  }, []);
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
      locale: 'en' as Locale,
      setLocale: () => {},
      t: getT('en'),
    };
  }
  return ctx;
}
