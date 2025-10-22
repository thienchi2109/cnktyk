'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Settings, Filter, Search } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotificationList } from '@/components/notifications/notification-list';
import { AlertGenerator } from '@/components/notifications/alert-generator';
import { ThongBao } from '@/lib/db/schemas';
import { cn } from '@/lib/utils';

interface NotificationsPageState {
  notifications: ThongBao[];
  filteredNotifications: ThongBao[];
  unreadCount: number;
  loading: boolean;
  filter: 'all' | 'unread' | 'read';
  searchQuery: string;
  showAlertGenerator: boolean;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [state, setState] = useState<NotificationsPageState>({
    notifications: [],
    filteredNotifications: [],
    unreadCount: 0,
    loading: true,
    filter: 'all',
    searchQuery: '',
    showAlertGenerator: false
  });

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        notifications: data.notifications || [],
        filteredNotifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Filter notifications based on current filter and search
  const applyFilters = () => {
    let filtered = [...state.notifications];

    // Apply status filter
    if (state.filter === 'unread') {
      filtered = filtered.filter(n => n.TrangThai === 'Moi');
    } else if (state.filter === 'read') {
      filtered = filtered.filter(n => n.TrangThai === 'DaDoc');
    }

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.ThongDiep.toLowerCase().includes(query) ||
        (n.Loai && n.Loai.toLowerCase().includes(query))
      );
    }

    setState(prev => ({ ...prev, filteredNotifications: filtered }));
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT'
      });
      
      if (!response.ok) throw new Error('Failed to mark as read');
      
      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.MaThongBao === notificationId 
            ? { ...n, TrangThai: 'DaDoc' as const }
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
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, TrangThai: 'DaDoc' as const })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Generate alerts (admin only)
  const handleGenerateAlerts = async (alertData: any) => {
    try {
      const response = await fetch('/api/alerts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      });
      
      if (!response.ok) throw new Error('Failed to generate alerts');
      
      // Refresh notifications after generating alerts
      await fetchNotifications();
    } catch (error) {
      console.error('Error generating alerts:', error);
      throw error;
    }
  };

  // Update filter
  const handleFilterChange = (newFilter: 'all' | 'unread' | 'read') => {
    setState(prev => ({ ...prev, filter: newFilter }));
  };

  // Update search query
  const handleSearchChange = (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  };

  // Toggle alert generator
  const toggleAlertGenerator = () => {
    setState(prev => ({ ...prev, showAlertGenerator: !prev.showAlertGenerator }));
  };

  // Effects
  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [state.notifications, state.filter, state.searchQuery]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Đang tải...</h1>
          <p className="text-slate-600">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  const canGenerateAlerts = ['SoYTe', 'DonVi'].includes(session.user?.role || '');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Thông báo & Cảnh báo
                </h1>
                <p className="text-slate-600">
                  Quản lý thông báo và cảnh báo hệ thống
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canGenerateAlerts && (
                <GlassButton
                  onClick={toggleAlertGenerator}
                  variant={state.showAlertGenerator ? "default" : "outline"}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {state.showAlertGenerator ? 'Ẩn' : 'Tạo'} cảnh báo
                </GlassButton>
              )}
            </div>
          </div>

          {/* Alert Generator (Admin only) */}
          {canGenerateAlerts && state.showAlertGenerator && (
            <AlertGenerator
              onGenerate={handleGenerateAlerts}
              loading={state.loading}
            />
          )}

          {/* Filters and Search */}
          <GlassCard className="p-4 relative">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Tìm kiếm thông báo..."
                    value={state.searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2 relative">
                <Filter className="h-4 w-4 text-slate-500" />
                <Select value={state.filter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-40 relative z-10 data-[state=open]:z-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-white" position="popper">
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="unread">Chưa đọc</SelectItem>
                    <SelectItem value="read">Đã đọc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>

          {/* Notifications List */}
          <NotificationList
            notifications={state.filteredNotifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllRead={handleMarkAllRead}
            loading={state.loading}
          />
      </div>
  );
}