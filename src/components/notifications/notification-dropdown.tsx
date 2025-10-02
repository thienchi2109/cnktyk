'use client';

import React from 'react';
import { Bell, Check, ExternalLink, Settings } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ThongBao } from '@/lib/db/schemas';

interface NotificationDropdownProps {
  notifications: ThongBao[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
  loading?: boolean;
  className?: string;
}

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Vừa xong';
  if (diffInMinutes < 60) return `${diffInMinutes}p`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const getNotificationIcon = (type: string | null) => {
  const iconClass = "h-4 w-4";
  
  switch (type) {
    case 'compliance_critical':
      return <div className={cn(iconClass, "bg-red-500 rounded-full")} />;
    case 'compliance_warning':
      return <div className={cn(iconClass, "bg-amber-500 rounded-full")} />;
    case 'submission_approved':
      return <div className={cn(iconClass, "bg-green-500 rounded-full")} />;
    case 'submission_rejected':
      return <div className={cn(iconClass, "bg-red-500 rounded-full")} />;
    case 'deadline_approaching':
      return <div className={cn(iconClass, "bg-blue-500 rounded-full")} />;
    default:
      return <div className={cn(iconClass, "bg-slate-400 rounded-full")} />;
  }
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllRead,
  onViewAll,
  loading = false,
  className
}) => {
  // Show only recent notifications (max 5)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className={cn(
      "absolute top-full right-0 mt-2 w-80 backdrop-blur-md bg-white/90 border border-white/30 rounded-lg shadow-lg z-50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-700" />
          <h3 className="font-medium text-slate-900">Thông báo</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        {unreadCount > 0 && (
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="text-blue-600 hover:text-blue-700 h-7 px-2"
          >
            <Check className="h-3 w-3" />
          </GlassButton>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-4 w-4 bg-slate-200 rounded-full flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Không có thông báo mới</p>
          </div>
        ) : (
          <div className="py-2">
            {recentNotifications.map((notification) => {
              const isUnread = notification.TrangThai === 'Moi';
              
              return (
                <div
                  key={notification.MaThongBao}
                  className={cn(
                    "flex items-start gap-3 p-3 hover:bg-white/20 transition-colors cursor-pointer border-l-2",
                    isUnread ? "border-l-blue-500 bg-blue-50/30" : "border-l-transparent"
                  )}
                  onClick={() => {
                    if (isUnread) {
                      onMarkAsRead(notification.MaThongBao);
                    }
                    if (notification.LienKet) {
                      window.location.href = notification.LienKet;
                    }
                  }}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.Loai)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm leading-relaxed line-clamp-2",
                      isUnread ? "font-medium text-slate-900" : "text-slate-700"
                    )}>
                      {notification.ThongDiep}
                    </p>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(new Date(notification.TaoLuc))}
                      </span>
                      
                      {notification.LienKet && (
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {isUnread && (
                    <div className="flex-shrink-0 mt-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-white/20 bg-white/10">
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-blue-600 hover:text-blue-700"
        >
          Xem tất cả
        </GlassButton>
        
        <GlassButton
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-slate-700"
        >
          <Settings className="h-4 w-4" />
        </GlassButton>
      </div>
    </div>
  );
};