'use client';

import * as React from "react";
import { 
  Home, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  Shield,
  Activity,
  AlertCircle,
  Upload,
  ChevronDown
} from "lucide-react";
import { GlassHeader } from "./glass-header";
import { GlassFooter } from "./glass-footer";
import { GlassButton } from "@/components/ui/glass-button";
import { cn } from "@/lib/utils/cn";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: NavigationItem[];
  badge?: string | number;
  roles?: string[]; // Which roles can see this item
}

interface ResponsiveNavigationProps {
  children: React.ReactNode;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  notifications?: number;
  activeItem?: string;
  onNavigate?: (item: NavigationItem) => void;
  className?: string;
}

// Navigation items based on user roles
const getNavigationItems = (userRole?: string): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="h-4 w-4" />,
      href: '/dashboard'
    }
  ];

  // Practitioner-specific items
  if (userRole === 'NguoiHanhNghe') {
    return [
      ...baseItems,
      {
        id: 'activities',
        label: 'Activities',
        icon: <Activity className="h-4 w-4" />,
        children: [
          {
            id: 'submit-activity',
            label: 'Submit Activity',
            icon: <Upload className="h-4 w-4" />,
            href: '/activities/submit'
          },
          {
            id: 'activity-history',
            label: 'History',
            icon: <FileText className="h-4 w-4" />,
            href: '/activities/history'
          }
        ]
      },
      {
        id: 'progress',
        label: 'Progress',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/progress'
      },
      {
        id: 'alerts',
        label: 'Alerts',
        icon: <AlertCircle className="h-4 w-4" />,
        href: '/alerts',
        badge: 3
      }
    ];
  }

  // Unit Administrator items
  if (userRole === 'DonVi') {
    return [
      ...baseItems,
      {
        id: 'practitioners',
        label: 'Practitioners',
        icon: <Users className="h-4 w-4" />,
        href: '/practitioners'
      },
      {
        id: 'approvals',
        label: 'Approvals',
        icon: <Shield className="h-4 w-4" />,
        href: '/approvals',
        badge: 12
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/reports'
      },
      {
        id: 'bulk-import',
        label: 'Import',
        icon: <Upload className="h-4 w-4" />,
        href: '/import'
      },
      {
        id: 'user-management',
        label: 'Users',
        icon: <Users className="h-4 w-4" />,
        href: '/users'
      }
    ];
  }

  // Department of Health items
  if (userRole === 'SoYTe') {
    return [
      ...baseItems,
      {
        id: 'system-overview',
        label: 'Overview',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/system'
      },
      {
        id: 'units',
        label: 'Units',
        icon: <Users className="h-4 w-4" />,
        href: '/units'
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: <BarChart3 className="h-4 w-4" />,
        children: [
          {
            id: 'compliance-trends',
            label: 'Compliance',
            icon: <BarChart3 className="h-4 w-4" />,
            href: '/analytics/compliance'
          },
          {
            id: 'performance-metrics',
            label: 'Performance',
            icon: <BarChart3 className="h-4 w-4" />,
            href: '/analytics/performance'
          }
        ]
      },
      {
        id: 'system-admin',
        label: 'Admin',
        icon: <Settings className="h-4 w-4" />,
        children: [
          {
            id: 'user-management',
            label: 'Users',
            icon: <Users className="h-4 w-4" />,
            href: '/users'
          },
          {
            id: 'activity-catalog',
            label: 'Activities',
            icon: <FileText className="h-4 w-4" />,
            href: '/activities'
          },
          {
            id: 'system-settings',
            label: 'Settings',
            icon: <Settings className="h-4 w-4" />,
            href: '/admin/settings'
          }
        ]
      }
    ];
  }

  // Auditor items (read-only)
  if (userRole === 'Auditor') {
    return [
      ...baseItems,
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: <FileText className="h-4 w-4" />,
        href: '/audit'
      },
      {
        id: 'compliance-reports',
        label: 'Reports',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/reports/compliance'
      }
    ];
  }

  return baseItems;
};

// Header Navigation Bar Component
const HeaderNavigation = ({ 
  items, 
  activeItem, 
  onNavigate 
}: { 
  items: NavigationItem[]; 
  activeItem?: string; 
  onNavigate?: (item: NavigationItem) => void; 
}) => {
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      setOpenDropdown(openDropdown === item.id ? null : item.id);
    } else {
      onNavigate?.(item);
      setOpenDropdown(null);
    }
  };

  return (
    <nav className="hidden xl:flex items-center space-x-1">
      {items.map((item) => {
        const isActive = activeItem === item.id;
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = openDropdown === item.id;

        return (
          <div key={item.id} className="relative">
            <GlassButton
              variant={isActive ? "default" : "ghost"}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm",
                hasChildren && "pr-2"
              )}
            >
              {item.icon}
              <span className="hidden lg:inline">{item.label}</span>
              {item.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-200 ml-1",
                  isOpen && "rotate-180"
                )} />
              )}
            </GlassButton>

            {/* Dropdown Menu */}
            {hasChildren && isOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-48 backdrop-blur-md bg-white/20 border border-white/30 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {item.children?.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        onNavigate?.(child);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/20 transition-colors",
                        activeItem === child.id && "bg-primary/20 text-primary-900"
                      )}
                    >
                      {child.icon}
                      {child.label}
                      {child.badge && (
                        <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                          {child.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

// Footer Navigation Bar Component (Mobile/Tablet)
const FooterNavigation = ({ 
  items, 
  activeItem, 
  onNavigate 
}: { 
  items: NavigationItem[]; 
  activeItem?: string; 
  onNavigate?: (item: NavigationItem) => void; 
}) => {
  // Flatten items for footer navigation (no nested menus)
  const flatItems = items.reduce((acc: NavigationItem[], item) => {
    if (item.children && item.children.length > 0) {
      return [...acc, ...item.children];
    }
    return [...acc, item];
  }, []);

  // Show only first 5 items in footer navigation
  const footerItems = flatItems.slice(0, 5);

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg bg-white/10 border-t border-white/20">
      <div className="flex items-center justify-around px-2 py-2">
        {footerItems.map((item) => {
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 min-w-0 flex-1",
                isActive
                  ? "bg-primary/20 text-primary-900"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/10"
              )}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                    {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const ResponsiveNavigation = React.forwardRef<HTMLDivElement, ResponsiveNavigationProps>(
  ({ children, user, notifications = 0, activeItem, onNavigate, className }, ref) => {
    const navigationItems = getNavigationItems(user?.role);

    const handleItemClick = (item: NavigationItem) => {
      onNavigate?.(item);
    };

    return (
      <div ref={ref} className={cn("min-h-screen flex flex-col", className)}>
        {/* Header with Navigation */}
        <div className="sticky top-0 z-50 backdrop-blur-lg bg-white/10 border-b border-white/20">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            {/* Left side - Logo */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/60 to-secondary/60 flex items-center justify-center">
                <span className="text-white font-bold text-sm">CN</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  CNKTYKLT Platform
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Compliance Management
                </p>
              </div>
            </div>

            {/* Center - Navigation (Desktop) */}
            <HeaderNavigation 
              items={navigationItems}
              activeItem={activeItem}
              onNavigate={handleItemClick}
            />

            {/* Right side - User Menu */}
            <GlassHeader
              user={user}
              notifications={notifications}
              className="bg-transparent border-0 h-auto p-0 relative"
            />
          </div>
        </div>

        {/* Main Content */}
        <main className={cn(
          "flex-1 p-4 lg:p-6 overflow-auto",
          "xl:pb-4", // Normal padding on desktop
          "pb-20" // Extra padding on mobile/tablet for footer nav
        )}>
          {children}
        </main>

        {/* Footer Navigation (Mobile/Tablet) */}
        <FooterNavigation 
          items={navigationItems}
          activeItem={activeItem}
          onNavigate={handleItemClick}
        />

        {/* Footer (Desktop only) */}
        <div className="hidden xl:block">
          <GlassFooter />
        </div>
      </div>
    );
  }
);

ResponsiveNavigation.displayName = "ResponsiveNavigation";