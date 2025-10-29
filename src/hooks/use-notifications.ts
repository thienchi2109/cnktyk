'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThongBao } from '@/lib/db/schemas';

interface UseNotificationsReturn {
  notifications: ThongBao[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(limit?: number): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<ThongBao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL('/api/notifications', window.location.origin);
      if (limit) {
        url.searchParams.set('limit', limit.toString());
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.MaThongBao === notificationId 
            ? { ...n, TrangThai: 'DaDoc' as const }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, TrangThai: 'DaDoc' as const }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refresh
  };
}