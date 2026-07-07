import './globals.css';
import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { AuthProvider } from '@/components/auth-context';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'SAMRUQ ERP',
  description: 'ERP для управления продажами и строительством',
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