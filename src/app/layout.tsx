import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/layout/Providers';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = { title: 'Builtglory — Web App', description: 'Builtglory web app — verified real estate, zero brokerage.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={inter.variable}><body><Providers>{children}</Providers></body></html>;
}
