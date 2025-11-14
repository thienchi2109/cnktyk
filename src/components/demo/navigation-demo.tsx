'use client';

import * as React from "react";
import { ResponsiveNavigation } from "@/components/layout";
import { GlassCard, Button } from "@/components/ui";

export const NavigationDemo = () => {
  const [activeItem, setActiveItem] = React.useState('dashboard');
  const [userRole, setUserRole] = React.useState<'NguoiHanhNghe' | 'DonVi' | 'SoYTe' | 'Auditor'>('NguoiHanhNghe');

  const mockUsers = {
    NguoiHanhNghe: {
      name: "Dr. Nguyen Van A",
      role: "NguoiHanhNghe",
      avatar: undefined
    },
    DonVi: {
      name: "Admin Tran Thi B",
      role: "DonVi", 
      avatar: undefined
    },
    SoYTe: {
      name: "Director Le Van C",
      role: "SoYTe",
      avatar: undefined
    },
    Auditor: {
      name: "Auditor Pham Thi D",
      role: "Auditor",
      avatar: undefined
    }
  };

  return (
    <ResponsiveNavigation
      user={mockUsers[userRole]}
      notifications={5}
      activeItem={activeItem}
      onNavigate={(item) => {
        console.log('Navigate to:', item);
        setActiveItem(item.id);
      }}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Navigation Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Responsive header navigation with footer navigation for mobile/tablet
          </p>
        </div>

        {/* Role Switcher */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
            Switch User Role
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Different roles see different navigation items. Try switching between roles to see the navigation change.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={userRole === 'NguoiHanhNghe' ? 'medical' : 'ghost'}
              onClick={() => setUserRole('NguoiHanhNghe')}
            >
              Practitioner
            </Button>
            <Button
              variant={userRole === 'DonVi' ? 'medical' : 'ghost'}
              onClick={() => setUserRole('DonVi')}
            >
              Unit Admin
            </Button>
            <Button
              variant={userRole === 'SoYTe' ? 'medical' : 'ghost'}
              onClick={() => setUserRole('SoYTe')}
            >
              DoH Admin
            </Button>
            <Button
              variant={userRole === 'Auditor' ? 'medical' : 'ghost'}
              onClick={() => setUserRole('Auditor')}
            >
              Auditor
            </Button>
          </div>
        </GlassCard>

        {/* Navigation Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
              Desktop Navigation (≥1280px)
            </h3>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• Header navigation bar with dropdown menus</li>
              <li>• Logo and branding on the left</li>
              <li>• Navigation items in the center</li>
              <li>• User menu and notifications on the right</li>
              <li>• Footer with links and copyright</li>
            </ul>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
              Mobile/Tablet Navigation (&lt;1280px)
            </h3>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• Simplified header with logo and user menu</li>
              <li>• Bottom navigation bar with main items</li>
              <li>• Touch-friendly button sizes</li>
              <li>• Badge indicators for notifications</li>
              <li>• No footer on mobile (space optimization)</li>
            </ul>
          </GlassCard>
        </div>

        {/* Current State */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
            Current State
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Active User:</p>
              <p className="text-slate-600 dark:text-slate-400">{mockUsers[userRole].name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Role:</p>
              <p className="text-slate-600 dark:text-slate-400">{userRole}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Active Item:</p>
              <p className="text-slate-600 dark:text-slate-400">{activeItem}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Notifications:</p>
              <p className="text-slate-600 dark:text-slate-400">5 unread</p>
            </div>
          </div>
        </GlassCard>

        {/* Instructions */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
            How to Test
          </h3>
          <div className="space-y-3 text-slate-600 dark:text-slate-400">
            <p>
              <strong>Desktop (≥1280px):</strong> Navigation items appear in the header center. 
              Hover over items with dropdown arrows to see submenus.
            </p>
            <p>
              <strong>Mobile/Tablet (&lt;1280px):</strong> Navigation items appear in the bottom 
              navigation bar. The header shows only logo and user menu.
            </p>
            <p>
              <strong>Responsive Testing:</strong> Resize your browser window to see the navigation 
              switch between header and footer modes at the 1280px breakpoint.
            </p>
          </div>
        </GlassCard>
      </div>
    </ResponsiveNavigation>
  );
};
