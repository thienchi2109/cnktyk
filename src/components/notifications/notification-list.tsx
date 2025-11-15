'use client';

import React from 'react';
import { Bell, Check, X, ExternalLink, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { cn } from '@/lib/utils';
import { ThongBao } from '@/lib/db/schemas';

interface NotificationListProps {
  notifications: ThongBao[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  loading?: boolean;
  className?: string;
}

const getNotificationIcon = (type: string | null) => {
  switch (type) {
    case 'compliance_critical':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'compliance_warning':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'submission_approved':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'submission_rejected':
      return <X className="h-5 w-5 text-red-500" />;
    case 'deadline_approaching':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'system_maintenance':
      return <Info className="h-5 w-5 text-blue-500" />;
    default:
      return <Bell className="h-5 w-5 text-slate-500" />;
  }
};

const getNotificationColor = (type: string | null) => {
  switch (type) {
    case 'compliance_critical':
      return 'border-l-red-500 bg-red-50/50';
    case 'compliance_warning':
      return 'border-l-amber-500 bg-amber-50/50';
    case 'submission_approved':
      return 'border-l-green-500 bg-green-50/50';
    case 'submission_rejected':
      return 'border-l-red-500 bg-red-50/50';
    case 'deadline_approaching':
      return 'border-l-blue-500 bg-blue-50/50';
    case 'system_maintenance':
      return 'border-l-blue-500 bg-blue-50/50';
    default:
      return 'border-l-slate-300 bg-slate-50/50';
  }
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Vừa xong';
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;
  
  return date.toLocaleDateString('vi-VN');
};

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllRead,
  loading = false,
  className
}) => {
  const unreadCount = notifications.filter(n => n.TrangThai === 'Moi').length;

  if (loading) {
    return (
      <GlassCard className={cn("p-12", className)}>
        <LoadingNotice message="Đang tải thông báo..." />
      </GlassCard>
    );
  }

  if (notifications.length === 0) {
    return (
      <GlassCard className={cn("p-8 text-center", className)}>
        <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Không có thông báo
        </h3>
        <p className="text-slate-600">
          Bạn đã xem hết tất cả thông báo.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with actions */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {unreadCount} thông báo mới
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="text-blue-600 hover:text-blue-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Đánh dấu tất cả đã đọc
          </Button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-3">
        {notifications.map((notification) => {
          const isUnread = notification.TrangThai === 'Moi';
          
          return (
            <GlassCard
              key={notification.MaThongBao}
              className={cn(
                "p-4 border-l-4 transition-all duration-200 hover:shadow-md",
                getNotificationColor(notification.Loai),
                isUnread && "ring-2 ring-blue-200"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.Loai)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm leading-relaxed",
                      isUnread ? "font-medium text-slate-900" : "text-slate-700"
                    )}>
                      {notification.ThongDiep}
                    </p>
                    
                    {isUnread && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-500 rounded-full" />
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(new Date(notification.TaoLuc))}
                    </span>

                    <div className="flex items-center gap-2">
                      {notification.LienKet && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (isUnread) {
                              onMarkAsRead(notification.MaThongBao);
                            }
                            window.location.href = notification.LienKet!;
                          }}
                          className="text-blue-600 hover:text-blue-700 h-7 px-2"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Xem
                        </Button>
                      )}
                      
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkAsRead(notification.MaThongBao)}
                          className="text-slate-600 hover:text-slate-700 h-7 px-2"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Đánh dấu đã đọc
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
