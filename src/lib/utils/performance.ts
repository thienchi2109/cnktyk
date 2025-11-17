/**
 * Performance monitoring utilities for API routes and database queries
 */

interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const SLOW_QUERY_THRESHOLD = 1000; // 1 second

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static maxMetrics = 100; // Keep last 100 metrics in memory

  static startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  static logMetric(operation: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: new Date(),
      metadata,
    };

    // Log slow operations
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`[Performance] Slow operation detected: ${operation} took ${duration}ms`, metadata);
    }

    // Store metric
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${operation}: ${duration}ms`);
    }
  }

  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  static getSlowQueries(): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > SLOW_QUERY_THRESHOLD);
  }

  static clearMetrics() {
    this.metrics = [];
  }

  static getAverageDuration(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;

    const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / operationMetrics.length;
  }
}

// Helper function to wrap async operations with performance monitoring
export async function monitorPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const endTimer = PerformanceMonitor.startTimer();

  try {
    const result = await fn();
    const duration = endTimer();
    PerformanceMonitor.logMetric(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = endTimer();
    PerformanceMonitor.logMetric(`${operation}:error`, duration, { ...metadata, error: String(error) });
    throw error;
  }
}

// Validate date range
export function validateDateRange(startDate?: string, endDate?: string): { isValid: boolean; error?: string } {
  if (!startDate && !endDate) {
    return { isValid: true };
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      return { isValid: false, error: 'Invalid start date format' };
    }

    if (isNaN(end.getTime())) {
      return { isValid: false, error: 'Invalid end date format' };
    }

    if (end < start) {
      return { isValid: false, error: 'End date must be after start date' };
    }

    // Check for reasonable range (not more than 5 years)
    const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > fiveYearsMs) {
      return { isValid: false, error: 'Date range cannot exceed 5 years' };
    }
  }

  return { isValid: true };
}
