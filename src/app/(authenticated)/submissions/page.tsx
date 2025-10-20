import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { nhanVienRepo } from '@/lib/db/repositories';
import { SubmissionsPageClient } from './submissions-page-client';

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  // Get practitioners for unit admins
  let practitioners: any[] = [];
  if (user.role === 'DonVi' && user.unitId) {
    practitioners = await nhanVienRepo.findByUnit(user.unitId);
  }

  return (
    <div className="max-w-7xl mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
          </div>
        }>
          <SubmissionsPageClient 
            userRole={user.role}
            practitioners={practitioners}
          />
        </Suspense>
    </div>
  );
}