'use client';

import * as React from "react";
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Activity,
  AlertCircle,
  Bell,
  Upload,
  ChevronDown,
  Award,
  Menu,
  X,
  FileArchive,
  FolderOpen,
  UserPlus,
  MoreHorizontal
} from "lucide-react";
import { GlassHeader } from "./glass-header";
import { GlassFooter } from "./glass-footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: NavigationItem[];
  badge?: string | number;
  roles?: string[]; // Which roles can see this item
  priority?: 'high' | 'low'; // Priority for overflow handling (defaults to 'high')
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
  submissionPendingCount?: number; // dynamic submissions badge for DonVi
  featureFlags?: FeatureFlags;
}

type NavCounts = { submissionsPending?: number };

type FeatureFlags = {
  donViAccountManagementEnabled?: boolean;
};

const getMatchScore = (href: string | undefined, pathname: string | null) => {
  if (!href || !pathname) return -1;
  if (href === "/") {
    return pathname === "/" ? Infinity : -1;
  }

  if (pathname === href) {
    return href.length + 100; // prefer exact matches
  }

  if (pathname.startsWith(`${href}/`)) {
    return href.length;
  }

  return -1;
};

const findActiveItemId = (
  items: NavigationItem[],
  pathname: string | null
): string | undefined => {
  let bestMatch: { id: string; score: number } | undefined;

  const evaluateItems = (navItems: NavigationItem[]) => {
    for (const item of navItems) {
      const score = getMatchScore(item.href, pathname);
      if (score > (bestMatch?.score ?? -1)) {
        bestMatch = { id: item.id, score };
      }
      if (item.children) {
        evaluateItems(item.children);
      }
    }
  };

  evaluateItems(items);
  return bestMatch?.id;
};

const itemIncludesActive = (
  item: NavigationItem,
  activeId?: string
): boolean => {
  if (!activeId) return false;
  if (item.id === activeId) return true;
  return item.children
    ? item.children.some((child) => itemIncludesActive(child, activeId))
    : false;
};

// Navigation items based on user roles
const getNavigationItems = (
  userRole?: string,
  counts: NavCounts = {},
  flags: FeatureFlags = {},
): NavigationItem[] => {
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
        id: 'credits',
        label: 'Tín chỉ',
        icon: <Award className="h-4 w-4" />,
        href: '/credits'
      },
      {
        id: 'submissions',
        label: 'Ghi nhận hoạt động',
        icon: <Activity className="h-4 w-4" />,
        href: '/submissions'
      },
      {
        id: 'practitioners',
        label: 'Hồ sơ',
        icon: <Users className="h-4 w-4" />,
        href: '/practitioners'
      },
      {
        id: 'notifications',
        label: 'Thông báo',
        icon: <Bell className="h-4 w-4" />,
        href: '/notifications'
      }
    ];
  }

  // Unit Administrator items
  if (userRole === 'DonVi') {
    const pending = counts.submissionsPending || 0;
    const items: NavigationItem[] = [
      ...baseItems,
      {
        id: 'practitioners',
        label: 'Người hành nghề',
        icon: <Users className="h-4 w-4" />,
        href: '/practitioners'
      },
      {
        id: 'activity-management',
        label: 'Quản lý hoạt động',
        icon: <Activity className="h-4 w-4" />,
        children: [
          {
            id: 'submissions',
            label: 'Ghi nhận hoạt động',
            icon: <Activity className="h-4 w-4" />,
            href: '/submissions',
            badge: pending > 0 ? pending : undefined
          },
          {
            id: 'bulk-enrollment',
            label: 'Ghi nhận hàng loạt',
            icon: <UserPlus className="h-4 w-4" />,
            href: '/submissions/bulk',
            roles: ['DonVi', 'SoYTe']
          },
          {
            id: 'activities',
            label: 'Danh mục hoạt động',
            icon: <FileText className="h-4 w-4" />,
            href: '/activities'
          }
        ]
      },
      {
        id: 'reports',
        label: 'Báo cáo',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/dashboard/unit-admin/reports'
      },
    ];

    if (flags.donViAccountManagementEnabled !== false) {
      items.push({
        id: 'user-management',
        label: 'Người dùng',
        icon: <Users className="h-4 w-4" />,
        href: '/users'
      });
    }

    items.push({
      id: 'notifications',
      label: 'Thông báo',
      icon: <Bell className="h-4 w-4" />,
      href: '/notifications'
    });

    return items;
  }

  // Department of Health items
  if (userRole === 'SoYTe') {
    return [
      ...baseItems,
      {
        id: 'system-overview',
        label: 'Tổng quan',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/system',
        priority: 'low' // Low priority - goes to More menu
      },
      {
        id: 'units',
        label: 'Đơn vị',
        icon: <Users className="h-4 w-4" />,
        href: '/dashboard/doh/units',
        priority: 'high'
      },
        {
        id: 'analytics',
        label: 'Phân tích',
        icon: <BarChart3 className="h-4 w-4" />,
        priority: 'high',
        children: [
          {
            id: 'compliance-trends',
            label: 'Tuân thủ',
            icon: <BarChart3 className="h-4 w-4" />,
            href: '/analytics/compliance'
          },
          {
            id: 'activity-analysis',
            label: 'Hoạt động',
            icon: <Activity className="h-4 w-4" />,
            href: '/analytics/activities'
          }
        ]
      },
      {
        id: 'activity-management',
        label: 'Quản lý hoạt động',
        icon: <Activity className="h-4 w-4" />,
        priority: 'high',
        children: [
          {
            id: 'submissions',
            label: 'Ghi nhận hoạt động',
            icon: <Activity className="h-4 w-4" />,
            href: '/submissions'
          },
          {
            id: 'activities',
            label: 'Danh mục hoạt động',
            icon: <FileText className="h-4 w-4" />,
            href: '/activities'
          },
          {
            id: 'bulk-enrollment',
            label: 'Ghi nhận hàng loạt',
            icon: <UserPlus className="h-4 w-4" />,
            href: '/submissions/bulk',
            roles: ['DonVi', 'SoYTe']
          }
        ]
      },
      {
        id: 'credit-rules',
        label: 'Quy tắc tín chỉ',
        icon: <Shield className="h-4 w-4" />,
        href: '/credits/rules',
        priority: 'low' // Low priority - goes to More menu
      },
      {
        id: 'user-management',
        label: 'Người dùng',
        icon: <Users className="h-4 w-4" />,
        href: '/users',
        priority: 'high'
      },
      {
        id: 'file-management',
        label: 'Quản lý tệp tin',
        icon: <FolderOpen className="h-4 w-4" />,
        priority: 'high',
        children: [
          {
            id: 'files',
            label: 'Tải lên tệp tin',
            icon: <Upload className="h-4 w-4" />,
            href: '/files/demo'
          },
          {
            id: 'backup-center',
            label: 'Sao lưu minh chứng',
            icon: <FileArchive className="h-4 w-4" />,
            href: '/so-y-te/backup'
          }
        ]
      },
      {
        id: 'notifications',
        label: 'Thông báo',
        icon: <Bell className="h-4 w-4" />,
        href: '/notifications',
        priority: 'low' // Low priority - goes to More menu
      },
      {
        id: 'settings',
        label: 'Cài đặt',
        icon: <Settings className="h-4 w-4" />,
        priority: 'low', // Low priority - goes to More menu
        children: [
          {
            id: 'system-config',
            label: 'Cấu hình hệ thống',
            icon: <Settings className="h-4 w-4" />,
            href: '/settings/system'
          },
          {
            id: 'audit-logs',
            label: 'Nhật ký kiểm toán',
            icon: <Shield className="h-4 w-4" />,
            href: '/settings/audit'
          }
        ]
      }
    ];
  }

  // Auditor items
  if (userRole === 'Auditor') {
    return [
      ...baseItems,
      {
        id: 'audit-overview',
        label: 'Tổng quan kiểm toán',
        icon: <Shield className="h-4 w-4" />,
        href: '/audit'
      },
      {
        id: 'compliance-reports',
        label: 'Báo cáo tuân thủ',
        icon: <FileText className="h-4 w-4" />,
        href: '/audit/compliance'
      },
      {
        id: 'audit-logs',
        label: 'Nhật ký hệ thống',
        icon: <AlertCircle className="h-4 w-4" />,
        href: '/audit/logs'
      },
      {
        id: 'notifications',
        label: 'Thông báo',
        icon: <Bell className="h-4 w-4" />,
        href: '/notifications'
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
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const navRef = React.useRef<HTMLDivElement>(null);

  // Separate high and low priority items
  const highPriorityItems = items.filter(item => item.priority !== 'low');
  const lowPriorityItems = items.filter(item => item.priority === 'low');

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      setOpenDropdown(openDropdown === item.id ? null : item.id);
    } else {
      onNavigate?.(item);
      setOpenDropdown(null);
      setMoreMenuOpen(false);
    }
  };

  // Close more menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (moreMenuOpen && !target.closest('[data-more-menu]')) {
        setMoreMenuOpen(false);
      }
      if (openDropdown && navRef.current && !navRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [moreMenuOpen, openDropdown]);

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = itemIncludesActive(item, activeItem);
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openDropdown === item.id;

    return (
      <div key={item.id} className="relative">
        <Button
          type="button"
          variant={isActive ? "medical" : "ghost"}
          onClick={() => handleItemClick(item)}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-2 px-4 lg:px-5 py-2.5 text-sm font-medium transition-colors duration-200 backdrop-blur-md",
            isActive
              ? "shadow-[0_8px_28px_rgba(46,165,255,0.3)]"
              : "text-slate-600 hover:bg-white/20 hover:text-slate-900 focus-visible:ring-medical-blue/30",
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
        </Button>

        {/* Dropdown Menu for children */}
        {hasChildren && isOpen && (
          <div className="absolute top-full left-0 mt-1 min-w-48 backdrop-blur-md bg-white/90 border border-white/30 rounded-lg shadow-lg z-[100]">
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
  };

  return (
    <nav ref={navRef} className="hidden xl:flex items-center space-x-2 lg:space-x-3">
      {/* High priority items */}
      {highPriorityItems.map(renderNavigationItem)}

      {/* More menu for low priority items */}
      {lowPriorityItems.length > 0 && (
        <div className="relative flex-shrink-0" data-more-menu>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && moreMenuOpen) {
                setMoreMenuOpen(false);
              }
            }}
            className="flex items-center gap-2 px-4 lg:px-5 py-2.5 text-sm"
            aria-expanded={moreMenuOpen}
            aria-haspopup="menu"
            aria-label="More navigation options"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="hidden lg:inline">More</span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform duration-200",
              moreMenuOpen && "rotate-180"
            )} />
          </Button>

          {/* More dropdown */}
          {moreMenuOpen && (
            <div
              className="absolute top-full right-0 mt-1 min-w-56 origin-top-right backdrop-blur-md bg-white/90 border border-white/30 rounded-lg shadow-lg z-[100]"
              role="menu"
              aria-label="Additional navigation items"
            >
              <div className="py-1">
                {lowPriorityItems.map((item) => {
                  const isActive = itemIncludesActive(item, activeItem);
                  const hasChildren = item.children && item.children.length > 0;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => handleItemClick(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setMoreMenuOpen(false);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/20 transition-colors",
                          isActive && "bg-primary/20 text-primary-900"
                        )}
                        role="menuitem"
                        aria-label={item.label}
                      >
                        {item.icon}
                        {item.label}
                        {item.badge && (
                          <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Show children items in More menu */}
                      {hasChildren && (
                        <div className="ml-4 border-l border-white/20">
                          {item.children?.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => {
                                onNavigate?.(child);
                                setMoreMenuOpen(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setMoreMenuOpen(false);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/20 transition-colors",
                                activeItem === child.id && "bg-primary/20 text-primary-900"
                              )}
                              role="menuitem"
                              aria-label={child.label}
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
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
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);

  // Flatten items for footer navigation (no nested menus in footer bar)
  const flatItems = items.reduce((acc: NavigationItem[], item) => {
    if (item.children && item.children.length > 0) {
      return [...acc, ...item.children];
    }
    return [...acc, item];
  }, []);

  // Show first 4 items in footer bar, rest go to More menu
  const visibleItems = flatItems.slice(0, 4);
  const moreItems = flatItems.slice(4);

  // Close more menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (moreMenuOpen && !target.closest('[data-footer-more]')) {
        setMoreMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [moreMenuOpen]);

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-white/95 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {/* Visible footer items */}
        {visibleItems.map((item) => {
          const isActive = itemIncludesActive(item, activeItem);

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 min-w-0 flex-1",
                isActive
                  ? "bg-medical-blue/100 text-white"
                  : "text-slate-600 hover:text-medical-blue hover:bg-medical-blue/10"
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

        {/* More button if there are overflow items */}
        {moreItems.length > 0 && (
          <div className="relative flex-1 min-w-0" data-footer-more>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && moreMenuOpen) {
                  setMoreMenuOpen(false);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 w-full",
                moreMenuOpen
                  ? "bg-medical-blue/100 text-white"
                  : "text-slate-600 hover:text-medical-blue hover:bg-medical-blue/10"
              )}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              aria-label="More navigation options"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="truncate max-w-full">More</span>
            </button>

            {/* More dropdown menu */}
            {moreMenuOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 w-56 backdrop-blur-md bg-white/95 border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                role="menu"
                aria-label="Additional navigation items"
              >
                <div className="py-2">
                  {moreItems.map((item) => {
                    const isActive = itemIncludesActive(item, activeItem);

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate?.(item);
                          setMoreMenuOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setMoreMenuOpen(false);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-medical-blue/10 transition-colors",
                          isActive && "bg-medical-blue/20 text-medical-blue"
                        )}
                        role="menuitem"
                        aria-label={item.label}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                            {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export const ResponsiveNavigation = React.forwardRef<HTMLDivElement, ResponsiveNavigationProps>(
  (
    {
      children,
      user,
      notifications = 0,
      activeItem,
      onNavigate,
      className,
      submissionPendingCount,
      featureFlags,
    },
    ref,
  ) => {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);


    const navCounts = React.useMemo(
      () => ({ submissionsPending: submissionPendingCount }),
      [submissionPendingCount],
    );

    const navigationItems = React.useMemo(
      () => getNavigationItems(user?.role, navCounts, featureFlags || {}),
      [user?.role, navCounts, featureFlags],
    );

    const derivedActiveItem = React.useMemo(
      () => findActiveItemId(navigationItems, pathname),
      [navigationItems, pathname]
    );
    const currentActiveItem = activeItem ?? derivedActiveItem;


    const handleItemClick = (item: NavigationItem) => {
      setMobileMenuOpen(false);
      
      // Use custom onNavigate if provided, otherwise use router
      if (onNavigate) {
        onNavigate(item);
      } else if (item.href) {
        router.push(item.href);
      }
    };

    return (
      <div ref={ref} className={cn("min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-green-50", className)}>
        {/* Header with Navigation */}
        <header className="z-50 backdrop-blur-lg bg-white/10 border-b border-white/20 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            {/* Left side - Logo & Mobile Menu Button */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-700" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-700" />
                )}
              </button>

              {/* Logo */}
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-medical-blue to-medical-green flex items-center justify-center shadow-lg">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Center - Navigation (Desktop) */}
            <HeaderNavigation 
              items={navigationItems}
              activeItem={currentActiveItem}
              onNavigate={handleItemClick}
            />

            {/* Right side - User Menu */}
            <GlassHeader
              user={user}
              notifications={notifications}
              className="bg-transparent border-0 h-auto p-0 relative"
            />
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="xl:hidden border-t border-white/20 bg-white/95 backdrop-blur-lg">
              <nav className="px-4 py-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {navigationItems.map((item) => {
                    const isActive = itemIncludesActive(item, currentActiveItem);
                  const hasChildren = item.children && item.children.length > 0;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => !hasChildren && handleItemClick(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-medical-blue/20 text-medical-blue"
                            : "text-gray-700 hover:bg-white/50"
                        )}
                      >
                        {item.icon}
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </button>
                      
                      {/* Child items */}
                      {hasChildren && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children?.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => handleItemClick(child)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
                                currentActiveItem === child.id
                                  ? "bg-medical-blue/10 text-medical-blue"
                                  : "text-gray-600 hover:bg-white/50"
                              )}
                            >
                              {child.icon}
                              <span className="flex-1 text-left">{child.label}</span>
                              {child.badge && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                                  {child.badge}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className={cn(
          "flex-1 p-4 lg:p-6",
          "xl:pb-4", // Normal padding on desktop
          "pb-20" // Extra padding on mobile/tablet for footer nav
        )}>
          {children}
        </main>

        {/* Footer Navigation (Mobile/Tablet) */}
        <FooterNavigation 
          items={navigationItems}
          activeItem={currentActiveItem}
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
