'use client';

import React, { useState } from 'react';
import { Settings, Bell, Mail, Smartphone, Save, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface NotificationPreferencesProps {
  onSave: (preferences: NotificationPreferences) => Promise<void>;
  loading?: boolean;
  className?: string;
}

interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  complianceAlerts: boolean;
  submissionUpdates: boolean;
  deadlineReminders: boolean;
  systemMaintenance: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const defaultPreferences: NotificationPreferences = {
  inApp: true,
  email: true,
  sms: false,
  complianceAlerts: true,
  submissionUpdates: true,
  deadlineReminders: true,
  systemMaintenance: true,
  frequency: 'immediate',
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  onSave,
  loading = false,
  className
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(preferences);
      setSaved(true);
      
      // Clear saved indicator after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateQuietHours = (key: keyof NotificationPreferences['quietHours'], value: any) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  return (
    <GlassCard className={cn("p-6", className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Cài đặt thông báo
            </h2>
            <p className="text-sm text-slate-600">
              Tùy chỉnh cách bạn nhận thông báo
            </p>
          </div>
        </div>

        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-900">Phương thức nhận thông báo</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="font-medium">Thông báo trong ứng dụng</Label>
                  <p className="text-sm text-slate-600">Hiển thị thông báo trực tiếp trong hệ thống</p>
                </div>
              </div>
              <Switch
                checked={preferences.inApp}
                onCheckedChange={(checked) => updatePreference('inApp', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-500" />
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-sm text-slate-600">Gửi thông báo qua email</p>
                </div>
              </div>
              <Switch
                checked={preferences.email}
                onCheckedChange={(checked) => updatePreference('email', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-purple-500" />
                <div>
                  <Label className="font-medium">SMS</Label>
                  <p className="text-sm text-slate-600">Gửi thông báo qua tin nhắn SMS</p>
                </div>
              </div>
              <Switch
                checked={preferences.sms}
                onCheckedChange={(checked) => updatePreference('sms', checked)}
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-900">Loại thông báo</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div>
                <Label className="font-medium">Cảnh báo tuân thủ</Label>
                <p className="text-sm text-slate-600">Thông báo về tình trạng hoàn thành tín chỉ</p>
              </div>
              <Switch
                checked={preferences.complianceAlerts}
                onCheckedChange={(checked) => updatePreference('complianceAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div>
                <Label className="font-medium">Cập nhật hoạt động</Label>
                <p className="text-sm text-slate-600">Thông báo về trạng thái duyệt hoạt động</p>
              </div>
              <Switch
                checked={preferences.submissionUpdates}
                onCheckedChange={(checked) => updatePreference('submissionUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div>
                <Label className="font-medium">Nhắc nhở hạn chót</Label>
                <p className="text-sm text-slate-600">Thông báo về các hạn chót sắp tới</p>
              </div>
              <Switch
                checked={preferences.deadlineReminders}
                onCheckedChange={(checked) => updatePreference('deadlineReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div>
                <Label className="font-medium">Bảo trì hệ thống</Label>
                <p className="text-sm text-slate-600">Thông báo về bảo trì và cập nhật hệ thống</p>
              </div>
              <Switch
                checked={preferences.systemMaintenance}
                onCheckedChange={(checked) => updatePreference('systemMaintenance', checked)}
              />
            </div>
          </div>
        </div>

        {/* Frequency Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-900">Tần suất thông báo</h3>
          
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">
                Tần suất gửi thông báo
              </Label>
              <Select 
                value={preferences.frequency} 
                onValueChange={(value: any) => updatePreference('frequency', value)}
              >
                <SelectTrigger className="relative z-10 data-[state=open]:z-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-white" position="popper">
                  <SelectItem value="immediate">Ngay lập tức</SelectItem>
                  <SelectItem value="daily">Tổng hợp hàng ngày</SelectItem>
                  <SelectItem value="weekly">Tổng hợp hàng tuần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-900">Giờ im lặng</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50">
              <div>
                <Label className="font-medium">Bật giờ im lặng</Label>
                <p className="text-sm text-slate-600">Không gửi thông báo trong khoảng thời gian này</p>
              </div>
              <Switch
                checked={preferences.quietHours.enabled}
                onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
              />
            </div>

            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 pl-8">
                <div>
                  <Label className="text-sm font-medium text-slate-900 mb-2 block">
                    Bắt đầu
                  </Label>
                  <Select 
                    value={preferences.quietHours.start} 
                    onValueChange={(value) => updateQuietHours('start', value)}
                  >
                    <SelectTrigger className="relative z-10 data-[state=open]:z-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white" position="popper">
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-900 mb-2 block">
                    Kết thúc
                  </Label>
                  <Select 
                    value={preferences.quietHours.end} 
                    onValueChange={(value) => updateQuietHours('end', value)}
                  >
                    <SelectTrigger className="relative z-10 data-[state=open]:z-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white" position="popper">
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <GlassButton
            onClick={handleSave}
            disabled={saving || loading}
            className={cn(
              "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700",
              saved && "bg-green-500 hover:bg-green-600"
            )}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Đang lưu...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Đã lưu
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Lưu cài đặt
              </>
            )}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};