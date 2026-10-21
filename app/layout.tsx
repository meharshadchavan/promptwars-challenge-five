import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fête & Folio — Celebration & Event Planning Assistant',
  description:
    'Enterprise-grade GenAI celebration and event planning workspace for weddings, birthdays, and community events with dynamic budget balancing, chronological run-sheets, vendor checklists, and culturally inclusive creative curation.',
  openGraph: {
    title: 'Fête & Folio — Celebration & Event Planning Assistant',
    description:
      'Enterprise-grade GenAI celebration and event planning workspace for weddings, birthdays, and community events with dynamic budget balancing, chronological run-sheets, vendor checklists, and culturally inclusive creative curation.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fête & Folio — Celebration & Event Planning Assistant',
    description:
      'Enterprise-grade GenAI celebration and event planning workspace for weddings, birthdays, and community events with dynamic budget balancing, chronological run-sheets, vendor checklists, and culturally inclusive creative curation.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#FAF9F6] text-slate-900 antialiased selection:bg-slate-900 selection:text-white font-sans"
      >
        {children}
      </body>
    </html>
  );
}
