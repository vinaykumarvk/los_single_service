/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and performance metrics
 */

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.observeWebVitals();
    }
  }

  private observeWebVitals() {
    // Observe FCP (First Contentful Paint)
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
            this.logMetric('FCP', entry.startTime);
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP observer not supported');
    }

    // Observe LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        const lcpValue = lastEntry.renderTime || lastEntry.loadTime;
        if (lcpValue) {
          this.metrics.lcp = lcpValue;
          this.logMetric('LCP', lcpValue);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // Observe CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
            this.logMetric('CLS', clsValue);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // Observe FID (First Input Delay)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.logMetric('FID', this.metrics.fid);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Measure TTFB (Time to First Byte)
    if (typeof performance !== 'undefined' && performance.timing) {
      const timing = performance.timing;
      const ttfb = timing.responseStart - timing.requestStart;
      if (ttfb > 0) {
        this.metrics.ttfb = ttfb;
        this.logMetric('TTFB', ttfb);
      }
    }
  }

  private logMetric(name: string, value: number) {
    const thresholds = {
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 2500, needsImprovement: 4000 },
      FID: { good: 100, needsImprovement: 300 },
      CLS: { good: 0.1, needsImprovement: 0.25 },
      TTFB: { good: 800, needsImprovement: 1800 },
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (threshold) {
      const status = value <= threshold.good ? '✅ Good' : 
                    value <= threshold.needsImprovement ? '⚠️ Needs Improvement' : '❌ Poor';
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${Math.round(value)}ms ${status}`);
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
        // You can integrate with analytics services here
        // Example: analytics.track('web_vital', { name, value, status });
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Measure custom performance marks
  mark(name: string) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        return measure.duration;
      } catch (e) {
        console.warn(`Could not measure ${name}:`, e);
      }
    }
    return 0;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const mark = (name: string) => performanceMonitor.mark(name);
export const measure = (name: string, startMark: string, endMark?: string) => 
  performanceMonitor.measure(name, startMark, endMark);
export const getMetrics = () => performanceMonitor.getMetrics();

