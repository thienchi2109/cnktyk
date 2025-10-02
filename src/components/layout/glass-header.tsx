'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { signOut } from "next-auth/react";

interface GlassHeaderProps {
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  notifications?: number;
  className?: string;
}

export const GlassHeader = React.forwardRef<HTMLDivElement, GlassHeaderProps>(
  ({ user, notifications = 0, className }, ref) => {
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [notificationData, setNotificationData] = React.useState<{
      notifications: any[];
      unreadCount: number;
      loading: boolean;
    }>({
      notifications: [],
      unreadCount: 0,
      loading: false
    });
    const router = useRouter();

    // Fetch notifications when dropdown opens
    const fetchNotifications = async () => {
      try {
        setNotificationData(prev => ({ ...prev, loading: true }));
        
        const response = await fetch('/api/notifications?limit=5');
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const data = await response.json();
        
        setNotificationData({
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotificationData(prev => ({ ...prev, loading: false }));
      }
    };

    // Mark notification as read
    const handleMarkAsRead = async (notificationId: string) => {
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'PUT'
        });
        
        if (!response.ok) throw new Error('Failed to mark as read');
        
        // Update local state
        setNotificationData(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.MaThongBao === notificationId 
              ? { ...n, TrangThai: 'DaDoc' }
              : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    };

    // Mark all notifications as read
    const handleMarkAllRead = async () => {
      try {
        const response = await fetch('/api/notifications/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markAllRead' })
        });
        
        if (!response.ok) throw new Error('Failed to mark all as read');
        
        // Update local state
        setNotificationData(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, TrangThai: 'DaDoc' })),
          unreadCount: 0
        }));
      } catch (error) {
        console.error('Error marking all as read:', error);
      }
    };

    // Close dropdowns when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (showUserMenu || showNotifications) {
          setShowUserMenu(false);
          setShowNotifications(false);
        }
      };

      if (showUserMenu || showNotifications) {
        document.addEventListener('click', handleClickOutside);
      }

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [showUserMenu, showNotifications]);

    // Fetch notifications when dropdown opens
    React.useEffect(() => {
      if (showNotifications) {
        fetchNotifications();
      }
    }, [showNotifications]);

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
      >
        {/* Notifications */}
        <div className="relative">
          <GlassButton 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </GlassButton>

          {/* Notification Dropdown */}
          {showNotifications && (
            <React.Suspense fallback={<div>Loading...</div>}>
              {React.createElement(
                React.lazy(() => import('@/components/notifications/notification-dropdown').then(m => ({ default: m.NotificationDropdown }))),
                {
                  notifications: notificationData.notifications,
                  unreadCount: notificationData.unreadCount,
                  onMarkAsRead: handleMarkAsRead,
                  onMarkAllRead: handleMarkAllRead,
                  onViewAll: () => {
                    setShowNotifications(false);
                    router.push('/notifications');
                  },
                  loading: notificationData.loading
                }
              )}
            </React.Suspense>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <GlassButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 px-3"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
              ) : (
                <User className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {user?.role || 'Role'}
              </p>
            </div>
          </GlassButton>

          {/* User Dropdown */}
          {showUserMenu && (
            <GlassCard className="absolute right-0 top-full mt-2 w-48 p-2 z-50">
              <div className="space-y-1">
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-white/20 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/notifications');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-white/20 transition-colors"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                  {notifications > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                      {notifications}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut({ callbackUrl: '/auth/signin' });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-white/20 transition-colors text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    );
  }
);

GlassHeader.displayName = "GlassHeader";