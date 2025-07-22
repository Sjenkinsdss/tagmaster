import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Database, 
  Server, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  duration: number;
  timestamp: string;
  endpoint?: string;
  method?: string;
  status?: number;
  category: 'api' | 'database' | 'system';
  metadata?: Record<string, any>;
}

interface PerformanceSummary {
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
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    uptime: number;
  };
}

interface HealthMetrics {
  status: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    external: number;
    rss: number;
  };
  timestamps: {
    server_time: string;
    started_at: string;
  };
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes: number): string {
  return `${bytes}MB`;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function getStatusColor(responseTime: number): string {
  if (responseTime < 100) return 'text-green-600';
  if (responseTime < 500) return 'text-yellow-600';
  return 'text-red-600';
}

function getHealthStatus(errorRate: number, avgResponseTime: number): { status: string; color: string } {
  if (errorRate > 10 || avgResponseTime > 1000) {
    return { status: 'Poor', color: 'text-red-600' };
  }
  if (errorRate > 5 || avgResponseTime > 500) {
    return { status: 'Fair', color: 'text-yellow-600' };
  }
  if (errorRate > 1 || avgResponseTime > 200) {
    return { status: 'Good', color: 'text-blue-600' };
  }
  return { status: 'Excellent', color: 'text-green-600' };
}

export function PerformanceBenchmark() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: summary, refetch: refetchSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/performance/summary'],
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ['/api/performance/health'],
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const { data: recentMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/performance/metrics', { limit: 50 }],
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const performanceSummary: PerformanceSummary | undefined = summary?.summary;
  const healthMetrics: HealthMetrics | undefined = health?.health;
  const metrics: PerformanceMetric[] = recentMetrics?.metrics || [];

  const handleClearMetrics = async () => {
    try {
      const response = await fetch('/api/performance/clear', { method: 'POST' });
      if (response.ok) {
        refetchSummary();
        refetchMetrics();
      }
    } catch (error) {
      console.error('Failed to clear metrics:', error);
    }
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchHealth();
    refetchMetrics();
  };

  if (summaryLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Performance Benchmark</h3>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading performance data...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!performanceSummary || !healthMetrics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Performance Benchmark</h3>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              No performance data available yet. Try making some API requests to populate the dashboard.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const healthStatus = getHealthStatus(performanceSummary.errorRate, performanceSummary.averageResponseTime);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Performance Benchmark</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearMetrics}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${healthStatus.color}`} />
              <span className={`text-xl font-bold ${healthStatus.color}`}>
                {healthStatus.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Uptime: {formatUptime(healthMetrics.uptime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(performanceSummary.averageResponseTime)}`}>
              {formatDuration(performanceSummary.averageResponseTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              P95: {formatDuration(performanceSummary.p95ResponseTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${performanceSummary.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {performanceSummary.errorRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {performanceSummary.totalRequests} total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMemory(healthMetrics.memory.used)}
            </div>
            <Progress 
              value={(healthMetrics.memory.used / healthMetrics.memory.total) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              of {formatMemory(healthMetrics.memory.total)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="api" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  Slowest Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceSummary.slowestEndpoints.slice(0, 5).map((endpoint, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-mono truncate flex-1">
                        {endpoint.endpoint}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {endpoint.count}
                        </Badge>
                        <span className={`text-sm font-medium ${getStatusColor(endpoint.avgTime)}`}>
                          {formatDuration(endpoint.avgTime)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  Fastest Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceSummary.fastestEndpoints.slice(0, 5).map((endpoint, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-mono truncate flex-1">
                        {endpoint.endpoint}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {endpoint.count}
                        </Badge>
                        <span className={`text-sm font-medium ${getStatusColor(endpoint.avgTime)}`}>
                          {formatDuration(endpoint.avgTime)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Average Query Time</div>
                  <div className={`text-2xl font-bold ${getStatusColor(performanceSummary.databaseMetrics.averageQueryTime)}`}>
                    {formatDuration(performanceSummary.databaseMetrics.averageQueryTime)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Slowest Queries</div>
                  <div className="space-y-1">
                    {performanceSummary.databaseMetrics.slowestQueries.slice(0, 3).map((query, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-xs font-mono truncate flex-1">
                          {query.query}
                        </span>
                        <span className={`text-xs font-medium ${getStatusColor(query.avgTime)}`}>
                          {formatDuration(query.avgTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                System Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Heap Used</div>
                  <div className="text-lg font-bold">{formatMemory(healthMetrics.memory.used)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Heap Total</div>
                  <div className="text-lg font-bold">{formatMemory(healthMetrics.memory.total)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">External</div>
                  <div className="text-lg font-bold">{formatMemory(healthMetrics.memory.external)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">RSS</div>
                  <div className="text-lg font-bold">{formatMemory(healthMetrics.memory.rss)}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">Server Started</div>
                <div className="text-sm">{new Date(healthMetrics.timestamps.started_at).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {metrics.map((metric) => (
                  <div key={metric.id} className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center gap-2">
                      {metric.category === 'api' && <Activity className="h-3 w-3" />}
                      {metric.category === 'database' && <Database className="h-3 w-3" />}
                      {metric.category === 'system' && <Server className="h-3 w-3" />}
                      <span className="text-sm font-mono">
                        {metric.endpoint || metric.name}
                      </span>
                      {metric.method && (
                        <Badge variant="outline" className="text-xs">
                          {metric.method}
                        </Badge>
                      )}
                      {metric.status && (
                        <Badge 
                          variant={metric.status >= 400 ? "destructive" : "default"} 
                          className="text-xs"
                        >
                          {metric.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getStatusColor(metric.duration)}`}>
                        {formatDuration(metric.duration)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}