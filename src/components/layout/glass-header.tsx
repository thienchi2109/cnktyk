'use client';

import * as React from "react";
import { Bell, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";

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

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (showUserMenu) {
          setShowUserMenu(false);
        }
      };

      if (showUserMenu) {
        document.addEventListener('click', handleClickOutside);
      }

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [showUserMenu]);

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
      >
        {/* Notifications */}
        <div className="relative">
          <GlassButton variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </GlassButton>
        </div>

        {/* User Menu */}
        <div className="relative">
          <GlassButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(!showUserMenu);
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
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-white/20 transition-colors">
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-white/20 transition-colors text-red-600">
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