import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  id: string;
  name: string;
  duration: number;
  timestamp: Date;
  endpoint?: string;
  method?: string;
  status?: number;
  category: 'api' | 'database' | 'system';
  metadata?: Record<string, any>;
}

export interface PerformanceSummary {
  totalRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
  fastestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
  databaseMetrics: {
    averageQueryTime: number;
    slowestQueries: Array<{ query: string; avgTime: number; count: number }>;
  };
  systemMetrics: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  startTimer(id: string, name: string, category: 'api' | 'database' | 'system', metadata?: Record<string, any>): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.addMetric({
        id,
        name,
        duration,
        timestamp: new Date(),
        category,
        metadata
      });
    };
  }

  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(category?: 'api' | 'database' | 'system', limit?: number): PerformanceMetric[] {
    let filtered = category ? this.metrics.filter(m => m.category === category) : this.metrics;
    
    // Sort by timestamp, most recent first
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getSummary(): PerformanceSummary {
    const apiMetrics = this.metrics.filter(m => m.category === 'api');
    const dbMetrics = this.metrics.filter(m => m.category === 'database');
    
    // Calculate API metrics
    const totalRequests = apiMetrics.length;
    const responseTimes = apiMetrics.map(m => m.duration);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;
    
    // Calculate P95 response time
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    
    // Calculate error rate
    const errorRequests = apiMetrics.filter(m => m.status && m.status >= 400);
    const errorRate = totalRequests > 0 ? (errorRequests.length / totalRequests) * 100 : 0;
    
    // Group by endpoint for analysis
    const endpointGroups = apiMetrics.reduce((acc, metric) => {
      const endpoint = metric.endpoint || 'unknown';
      if (!acc[endpoint]) {
        acc[endpoint] = { times: [], count: 0 };
      }
      acc[endpoint].times.push(metric.duration);
      acc[endpoint].count++;
      return acc;
    }, {} as Record<string, { times: number[]; count: number }>);
    
    const endpointStats = Object.entries(endpointGroups).map(([endpoint, data]) => ({
      endpoint,
      avgTime: data.times.reduce((a, b) => a + b, 0) / data.times.length,
      count: data.count
    }));
    
    const slowestEndpoints = endpointStats
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);
    
    const fastestEndpoints = endpointStats
      .sort((a, b) => a.avgTime - b.avgTime)
      .slice(0, 5);
    
    // Database metrics
    const dbTimes = dbMetrics.map(m => m.duration);
    const averageQueryTime = dbTimes.reduce((a, b) => a + b, 0) / dbTimes.length || 0;
    
    const queryGroups = dbMetrics.reduce((acc, metric) => {
      const query = metric.name || 'unknown';
      if (!acc[query]) {
        acc[query] = { times: [], count: 0 };
      }
      acc[query].times.push(metric.duration);
      acc[query].count++;
      return acc;
    }, {} as Record<string, { times: number[]; count: number }>);
    
    const slowestQueries = Object.entries(queryGroups)
      .map(([query, data]) => ({
        query,
        avgTime: data.times.reduce((a, b) => a + b, 0) / data.times.length,
        count: data.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);
    
    return {
      totalRequests,
      averageResponseTime,
      p95ResponseTime,
      errorRate,
      slowestEndpoints,
      fastestEndpoints,
      databaseMetrics: {
        averageQueryTime,
        slowestQueries
      },
      systemMetrics: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  // Performance middleware for Express
  middleware() {
    return (req: any, res: any, next: any) => {
      const endTimer = this.startTimer(
        `${req.method}-${req.path}-${Date.now()}`,
        `${req.method} ${req.path}`,
        'api',
        {
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      );

      // Override res.end to capture response time and status
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        endTimer();
        
        // Update the metric with response status
        const lastMetric = tracker.metrics[tracker.metrics.length - 1];
        if (lastMetric) {
          lastMetric.status = res.statusCode;
          lastMetric.endpoint = req.path;
          lastMetric.method = req.method;
        }
        
        originalEnd.apply(res, args);
      };

      next();
    };
  }
}

export const tracker = new PerformanceTracker();

// Database query tracker helper
export function trackDatabaseQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
  const endTimer = tracker.startTimer(
    `db-${queryName}-${Date.now()}`,
    queryName,
    'database'
  );
  
  return queryFn().finally(() => {
    endTimer();
  });
}

// System metrics collector
export function collectSystemMetrics(): void {
  const memUsage = process.memoryUsage();
  tracker.addMetric({
    id: `system-${Date.now()}`,
    name: 'System Check',
    duration: 0,
    timestamp: new Date(),
    category: 'system',
    metadata: {
      memoryUsage: memUsage,
      uptime: process.uptime(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    }
  });
}

// Start collecting system metrics every minute
setInterval(collectSystemMetrics, 60000);