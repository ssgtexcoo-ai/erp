import { LeadsBoard } from '@/components/leads-board';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';

export default function LeadsPage() {
  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.leads}>
      <main className="min-h-screen text-white px-3 py-5 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <LeadsBoard />
        </div>
      </main>
    </ProtectedPage>
  );
}
