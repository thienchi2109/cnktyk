'use client';

import React, { useState } from 'react';
import { AlertTriangle, Send, Users, Clock, Settings, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AlertGeneratorProps {
  onGenerate: (alertData: AlertGenerationData) => Promise<void>;
  loading?: boolean;
  className?: string;
}

interface AlertGenerationData {
  alertType: string;
  targetUsers?: string[];
  customMessage?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

const ALERT_TYPES = [
  {
    id: 'compliance_check',
    label: 'Kiểm tra tuân thủ',
    description: 'Tự động tạo cảnh báo dựa trên tỷ lệ hoàn thành tín chỉ',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    color: 'amber'
  },
  {
    id: 'deadline_reminder',
    label: 'Nhắc nhở hạn chót',
    description: 'Gửi thông báo nhắc nhở về các hạn chót sắp tới',
    icon: <Clock className="h-5 w-5 text-blue-500" />,
    color: 'blue'
  },
  {
    id: 'custom',
    label: 'Thông báo tùy chỉnh',
    description: 'Tạo thông báo tùy chỉnh cho người dùng cụ thể',
    icon: <Send className="h-5 w-5 text-green-500" />,
    color: 'green'
  }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Thấp', color: 'bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Trung bình', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Cao', color: 'bg-amber-100 text-amber-700' },
  { value: 'critical', label: 'Nghiêm trọng', color: 'bg-red-100 text-red-700' }
];

export const AlertGenerator: React.FC<AlertGeneratorProps> = ({
  onGenerate,
  loading = false,
  className
}) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [generationResult, setGenerationResult] = useState<{ success: boolean; count: number } | null>(null);

  const handleGenerate = async () => {
    if (!selectedType) return;

    try {
      const alertData: AlertGenerationData = {
        alertType: selectedType,
        priority,
        ...(selectedType === 'custom' && { customMessage, targetUsers })
      };

      await onGenerate(alertData);
      
      // Show success message (this would be replaced with actual result from API)
      setGenerationResult({ success: true, count: 15 });
      
      // Reset form
      setCustomMessage('');
      setTargetUsers([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => setGenerationResult(null), 3000);
    } catch (error) {
      console.error('Error generating alerts:', error);
      setGenerationResult({ success: false, count: 0 });
    }
  };

  const selectedAlertType = ALERT_TYPES.find(type => type.id === selectedType);

  return (
    <GlassCard className={cn("p-6", className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Tạo cảnh báo hệ thống
            </h2>
            <p className="text-sm text-slate-600">
              Tạo và gửi thông báo cảnh báo cho người dùng
            </p>
          </div>
        </div>

        {/* Success/Error Message */}
        {generationResult && (
          <div className={cn(
            "p-4 rounded-lg border-l-4 flex items-center gap-3",
            generationResult.success 
              ? "bg-green-50 border-l-green-500 text-green-800"
              : "bg-red-50 border-l-red-500 text-red-800"
          )}>
            {generationResult.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span>
              {generationResult.success 
                ? `Đã tạo thành công ${generationResult.count} cảnh báo`
                : 'Có lỗi xảy ra khi tạo cảnh báo'
              }
            </span>
          </div>
        )}

        {/* Alert Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-900">
            Loại cảnh báo
          </Label>
          <div className="grid gap-3">
            {ALERT_TYPES.map((type) => (
              <div
                key={type.id}
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                  selectedType === type.id
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                )}
                onClick={() => setSelectedType(type.id)}
              >
                <div className="flex items-start gap-3">
                  {type.icon}
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{type.label}</h3>
                    <p className="text-sm text-slate-600 mt-1">{type.description}</p>
                  </div>
                  {selectedType === type.id && (
                    <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-900">
            Mức độ ưu tiên
          </Label>
          <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
            <SelectTrigger className="relative z-10 data-[state=open]:z-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white" position="popper">
              {PRIORITY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <Badge className={level.color}>
                      {level.label}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Message (for custom alerts) */}
        {selectedType === 'custom' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900">
              Nội dung thông báo
            </Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Nhập nội dung thông báo tùy chỉnh..."
              rows={4}
              className="resize-none"
            />
          </div>
        )}

        {/* Target Users (for custom alerts) */}
        {selectedType === 'custom' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900">
              Người nhận (tùy chọn)
            </Label>
            <Input
              placeholder="Nhập ID người dùng, cách nhau bằng dấu phẩy"
              value={targetUsers.join(', ')}
              onChange={(e) => setTargetUsers(e.target.value.split(',').map(id => id.trim()).filter(Boolean))}
            />
            <p className="text-xs text-slate-500">
              Để trống để gửi cho tất cả người dùng
            </p>
          </div>
        )}

        {/* Selected Alert Type Info */}
        {selectedAlertType && (
          <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              {selectedAlertType.icon}
              <span className="font-medium text-slate-900">
                {selectedAlertType.label}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {selectedAlertType.description}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={!selectedType || loading || (selectedType === 'custom' && !customMessage)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Đang tạo...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Tạo cảnh báo
              </>
            )}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
};
