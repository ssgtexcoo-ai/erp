import './globals.css';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { AuthProvider } from '@/components/auth-context';

export const metadata: Metadata = {
  title: 'SAMRUQ ERP',
  description: 'ERP для управления продажами и строительством',
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen text-[var(--samruq-text)]">
        <AuthProvider>
          <SiteHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
