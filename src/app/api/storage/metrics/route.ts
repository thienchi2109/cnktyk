import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { r2Client } from '@/lib/storage/r2-client';

/**
 * GET /api/storage/metrics
 * Get R2 storage metrics (SoYTe users only)
 *
 * Returns:
 * - Total objects count
 * - Total storage size (bytes and formatted)
 * - File type breakdown
 * - Last calculated timestamp
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only SoYTe role can access storage metrics
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SoYTe access required' },
        { status: 403 }
      );
    }

    // Check if R2 is configured
    if (!r2Client.isR2Configured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'R2 storage is not configured'
        },
        { status: 503 }
      );
    }

    // Get storage metrics from R2
    const metrics = await r2Client.getStorageMetrics();

    if (!metrics) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve storage metrics'
        },
        { status: 500 }
      );
    }

    // Format file types data for easier consumption
    const fileTypesArray = Object.entries(metrics.fileTypes).map(([ext, data]) => ({
      extension: ext,
      count: data.count,
      size: data.size,
      sizeFormatted: formatBytes(data.size),
      percentage: metrics.totalSize > 0 ? ((data.size / metrics.totalSize) * 100).toFixed(2) : '0',
    })).sort((a, b) => b.size - a.size); // Sort by size descending

    return NextResponse.json({
      success: true,
      data: {
        totalObjects: metrics.totalObjects,
        totalSize: metrics.totalSize,
        totalSizeFormatted: metrics.totalSizeFormatted,
        fileTypes: fileTypesArray,
        lastCalculated: metrics.lastCalculated,
      }
    });

  } catch (error) {
    console.error('Error fetching storage metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
