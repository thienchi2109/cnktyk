/**
 * Practitioner Dashboard Page
 * Adaptive dashboard with glassmorphism UI for healthcare practitioners
 * Task 12: Build adaptive practitioner dashboard
 */

import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { PractitionerDashboard } from '@/components/dashboard/practitioner-dashboard';

export default async function PractitionerDashboardPage() {
  const session = await requireAuth();
  
  // Only practitioners can access this dashboard
  if (session.user.role !== 'NguoiHanhNghe') {
    redirect('/dashboard');
  }

  return <PractitionerDashboard userId={session.user.id} />;
}
