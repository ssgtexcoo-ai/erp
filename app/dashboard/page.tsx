import { ProtectedPage } from '@/components/protected-page';
import { AuthDashboard } from '@/components/auth-dashboard';
import { PAGE_ACCESS } from '@/lib/permissions';

export default function DashboardPage() {
  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.dashboard}>
      <AuthDashboard />
    </ProtectedPage>
  );
}
