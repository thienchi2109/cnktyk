/**
 * Activity Timeline Component
 * Mobile-optimized timeline with swipe gestures
 */

'use client';

import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  type: string;
  credits: number;
  status: 'DaDuyet' | 'ChoDuyet' | 'TuChoi' | 'YeuCauBoSung';
  date: string;
  reviewerComment?: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

export function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < activities.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < activities.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getStatusConfig = (status: Activity['status']) => {
    const configs = {
      'DaDuyet': {
        label: 'Đã duyệt',
        color: 'bg-medical-green/20 text-medical-green border-medical-green/30',
        icon: CheckCircle
      },
      'ChoDuyet': {
        label: 'Chờ duyệt',
        color: 'bg-medical-amber/20 text-medical-amber border-medical-amber/30',
        icon: Clock
      },
      'TuChoi': {
        label: 'Từ chối',
        color: 'bg-medical-red/20 text-medical-red border-medical-red/30',
        icon: XCircle
      },
      'YeuCauBoSung': {
        label: 'Yêu cầu bổ sung',
        color: 'bg-blue-100/50 text-blue-700 border-blue-300',
        icon: AlertTriangle
      }
    };
    return configs[status] || configs['ChoDuyet'];
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-white/20 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg mb-2">Chưa có hoạt động nào</p>
        <p className="text-sm">Bắt đầu ghi nhận hoạt động CNKTYKLT của bạn</p>
      </div>
    );
  }

  const currentActivity = activities[currentIndex];
  const statusConfig = getStatusConfig(currentActivity.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="relative">
      {/* Mobile Swipe View */}
      <div className="md:hidden">
        <div
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="relative overflow-hidden"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / {activities.length}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {currentActivity.title}
            </h3>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(currentActivity.date).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Loại: {currentActivity.type}</span>
                <span className="font-semibold text-medical-blue">
                  {currentActivity.credits} tín chỉ
                </span>
              </div>
            </div>

            {currentActivity.reviewerComment && (
              <div className="mt-4 p-3 bg-white/30 rounded-lg">
                <p className="text-sm text-gray-700 italic">
                  &ldquo;{currentActivity.reviewerComment}&rdquo;
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="p-2 rounded-full bg-white/30 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-2">
            {activities.slice(0, 5).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-medical-blue w-6' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            disabled={currentIndex === activities.length - 1}
            className="p-2 rounded-full bg-white/30 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop List View */}
      <div className="hidden md:block space-y-3">
        {activities.slice(0, 5).map((activity) => {
          const statusConfig = getStatusConfig(activity.status);
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={activity.id}
              className="p-4 bg-white/30 backdrop-blur-sm rounded-lg hover:bg-white/40 transition-all border border-white/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800 truncate">
                      {activity.title}
                    </h4>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(activity.date).toLocaleDateString('vi-VN')}
                    </span>
                    <span>•</span>
                    <span>{activity.type}</span>
                    <span>•</span>
                    <span className="font-semibold text-medical-blue">
                      {activity.credits} tín chỉ
                    </span>
                  </div>
                  {activity.reviewerComment && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      &ldquo;{activity.reviewerComment}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
