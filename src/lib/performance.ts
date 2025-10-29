/**
 * Performance Monitoring Utility
 * Tracks and logs API endpoint performance metrics
 */

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  status?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics in memory

  /**
   * Start timing an operation
   */
  startTimer(): () => number {
    const start = performance.now();
    return () => performance.now() - start;
  }

  /**
   * Log a performance metric
   */
  log(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development' || process.env.LOG_PERFORMANCE === 'true') {
      const durationColor = metric.duration < 100 ? '\x1b[32m' : // Green < 100ms
                           metric.duration < 300 ? '\x1b[33m' : // Yellow < 300ms
                           '\x1b[31m'; // Red >= 300ms
      
      console.log(
        `\x1b[36m[PERF]\x1b[0m ${metric.method} ${metric.endpoint} - ` +
        `${durationColor}${metric.duration.toFixed(2)}ms\x1b[0m` +
        (metric.status ? ` (${metric.status})` : '')
      );
    }

    // Log slow queries
    if (metric.duration > 500) {
      console.warn(
        `⚠️  SLOW QUERY: ${metric.method} ${metric.endpoint} took ${metric.duration.toFixed(2)}ms`,
        metric.metadata || {}
      );
    }
  }

  /**
   * Get performance statistics for an endpoint
   */
  getStats(endpoint?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const filteredMetrics = endpoint
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, val) => acc + val, 0);

    return {
      count: durations.length,
      avgDuration: sum / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get all metrics for debugging
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Higher-order function to wrap API route handlers with performance monitoring
 */
export function withPerformanceMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  endpoint: string,
  method: string = 'UNKNOWN'
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const timer = perfMonitor.startTimer();
    let status: number | undefined;
    let error: any;

    try {
      const result = await handler(...args);
      
      // Extract status from NextResponse if available
      if (result && typeof result === 'object' && 'status' in result) {
        status = (result as any).status;
      }

      return result;
    } catch (err) {
      error = err;
      status = 500;
      throw err;
    } finally {
      const duration = timer();
      
      perfMonitor.log({
        endpoint,
        method,
        duration,
        timestamp: new Date(),
        status,
        metadata: error ? { error: error.message } : undefined,
      });
    }
  };
}
