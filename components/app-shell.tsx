'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { GlobalSearch } from '@/components/global-search';

const NO_SIDEBAR_PATHS = ['/login', '/unauthorized', '/reset-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="md:ml-[240px] flex min-h-screen flex-1 flex-col min-w-0 pb-[64px] md:pb-0">
        {children}
      </div>
      <MobileNav />
      <GlobalSearch />
    </div>
  );
}