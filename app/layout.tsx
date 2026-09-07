import './tokens.css';
import './globals.css';
import type { Metadata } from 'next';
import { Fraunces, Inter, Montserrat } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700', '900'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TalkTrack — WhatsApp CRM',
  description:
    'The WhatsApp CRM for growing Indian businesses — shared inbox, campaigns, automations, catalogue and orders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
