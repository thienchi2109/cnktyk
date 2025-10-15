/**
 * Bulk Import Page
 * Allows DonVi users to import practitioners and activities via Excel
 */

import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ImportClient from './import-client';

export const metadata: Metadata = {
  title: 'Nhập dữ liệu hàng loạt | CNKTYKLT',
  description: 'Nhập dữ liệu nhân viên và hoạt động từ file Excel'
};

export default async function ImportPage() {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Only DonVi role can access
  if (session.user.role !== 'DonVi') {
    redirect('/dashboard');
  }

  return <ImportClient />;
}
