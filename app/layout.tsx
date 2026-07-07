import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import { AuthProvider } from '@/components/auth-context';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'SAMRUQ ERP',
  description: 'ERP для управления продажами и строительством',
};

export const viewport: Viewport = {
  themeColor: '#090e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}