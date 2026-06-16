import type { Metadata } from 'next';
import { DM_Mono, Instrument_Serif, Press_Start_2P } from 'next/font/google';
import './globals.css';
import Ticker from '@/components/Ticker';
import NavBar from '@/components/NavBar';
import FaqChatbot from '@/components/FaqChatbot';
import { LocaleProvider } from '@/components/LocaleProvider';
import { APP_NAME, APP_TAGLINE } from '@/lib/config';
import { cookies } from 'next/headers';
import { localeFromValue } from '@/lib/i18n';

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = localeFromValue(
    cookieStore.get('sofa-salon-locale')?.value
  );

  return (
    <html
      lang={initialLocale === 'zh' ? 'zh-CN' : 'en'}
      className={`${dmMono.variable} ${pressStart.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=VT323&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Silkscreen:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/gh/SolidZORO/zpix-pixel-font@master/dist/zpix.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased">
        <LocaleProvider initialLocale={initialLocale}>
          <div className="header-and-ticker-fixed">
            <NavBar />
            <Ticker />
          </div>
          <div className="header-ticker-spacer" aria-hidden="true" />
          <main className="min-h-[60vh]">{children}</main>
          <FaqChatbot />
        </LocaleProvider>
      </body>
    </html>
  );
}
