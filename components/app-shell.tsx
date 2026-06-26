'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';

const NO_SIDEBAR_PATHS = ['/', '/login', '/unauthorized'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-1 flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}