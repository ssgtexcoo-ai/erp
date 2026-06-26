import './globals.css';
import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { AuthProvider } from '@/components/auth-context';

export const metadata: Metadata = {
  title: 'SAMRUQ ERP',
  description: 'ERP для управления продажами и строительством',
  themeColor: '#090e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen text-[var(--samruq-text)]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}