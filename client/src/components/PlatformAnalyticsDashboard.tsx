import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Calendar,
  Users,
  Zap,
  Target,
  Clock,
  Activity,
  Globe
} from "lucide-react";
import PlatformStatsDisplay from "./PlatformStatsDisplay";

interface Post {
  id: number;
  title: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string | Date;
  content?: string;
  campaignName?: string;
  clientName?: string;
}

interface PlatformAnalyticsDashboardProps {
  posts: Post[];
}

const PlatformAnalyticsDashboard: React.FC<PlatformAnalyticsDashboardProps> = ({ posts }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'trends' | 'performance'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const analyticsData = useMemo(() => {
    if (!posts?.length) return null;

    const now = new Date();
    const timeFilters = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      'all': new Date(0)
    };

    const filteredPosts = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= timeFilters[timeRange];
    });

    // Platform distribution
    const platformCounts: Record<string, number> = {};
    const platformEngagement: Record<string, number> = {};
    let totalEngagement = 0;

    filteredPosts.forEach(post => {
      const platform = post.platform || 'Unknown';
      const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
      
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      platformEngagement[platform] = (platformEngagement[platform] || 0) + engagement;
      totalEngagement += engagement;
    });

    // Daily posting patterns
    const dailyPatterns: Record<string, number> = {};
    const hourlyPatterns: Record<number, number> = {};

    filteredPosts.forEach(post => {
      const date = new Date(post.createdAt);
      const dayKey = date.toLocaleDateString();
      const hour = date.getHours();
      
      dailyPatterns[dayKey] = (dailyPatterns[dayKey] || 0) + 1;
      hourlyPatterns[hour] = (hourlyPatterns[hour] || 0) + 1;
    });

    // Top performing content
    const topPosts = filteredPosts
      .map(post => ({
        ...post,
        totalEngagement: (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
      }))
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5);

    // Platform performance metrics
    const platformMetrics = Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      postCount: count,
      totalEngagement: platformEngagement[platform] || 0,
      avgEngagement: Math.round((platformEngagement[platform] || 0) / count),
      shareOfPosts: Math.round((count / filteredPosts.length) * 100),
      shareOfEngagement: Math.round(((platformEngagement[platform] || 0) / totalEngagement) * 100)
    })).sort((a, b) => b.totalEngagement - a.totalEngagement);

    // Engagement trends over time
    const trendData = Object.entries(dailyPatterns)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-14); // Last 14 days for trend

    // Best posting times
    const bestHours = Object.entries(hourlyPatterns)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalPosts: filteredPosts.length,
      totalEngagement,
      avgEngagementPerPost: Math.round(totalEngagement / filteredPosts.length),
      platformMetrics,
      topPosts,
      dailyPatterns: trendData,
      bestPostingHours: bestHours,
      activeTimeRange: timeRange
    };
  }, [posts, timeRange]);

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      'Instagram': '📷',
      'Facebook': '📘', 
      'TikTok': '🎵',
      'Twitter': '🐦',
      'YouTube': '📺',
      'LinkedIn': '💼',
      'Snapchat': '👻',
      'Pinterest': '📌'
    };
    return icons[platform] || '📱';
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  if (!analyticsData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
        <p>No posts available for platform analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Platform Analytics Dashboard</h2>
        </div>
        <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d' | 'all') => setTimeRange(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={(value: 'overview' | 'platforms' | 'trends' | 'performance') => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="platforms" className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>Platforms</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Trends</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{analyticsData.totalPosts}</div>
                <p className="text-sm text-gray-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Total Posts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{analyticsData.totalEngagement.toLocaleString()}</div>
                <p className="text-sm text-gray-600 flex items-center justify-center">
                  <Users className="w-4 h-4 mr-1" />
                  Total Engagement
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">{analyticsData.avgEngagementPerPost}</div>
                <p className="text-sm text-gray-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Avg per Post
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">{analyticsData.platformMetrics.length}</div>
                <p className="text-sm text-gray-600 flex items-center justify-center">
                  <Globe className="w-4 h-4 mr-1" />
                  Active Platforms
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Platform Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="w-5 h-5" />
                <span>Platform Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {analyticsData.platformMetrics.map((platform, index) => (
                  <div key={platform.platform} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getPlatformIcon(platform.platform)}</div>
                      <div>
                        <h4 className="font-semibold">{platform.platform}</h4>
                        <p className="text-sm text-gray-600">
                          {platform.postCount} posts • {platform.totalEngagement.toLocaleString()} engagement
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">{platform.shareOfEngagement}%</div>
                      <p className="text-sm text-gray-500">of engagement</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms">
          <PlatformStatsDisplay posts={posts} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Posting Time Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Best Posting Times</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analyticsData.bestPostingHours.map((timeSlot, index) => (
                  <TooltipProvider key={timeSlot.hour}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-4 bg-blue-50 rounded-lg cursor-help">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {formatHour(timeSlot.hour)}
                          </div>
                          <p className="text-sm text-blue-800">{timeSlot.count} posts</p>
                          <Badge variant="outline" className="mt-2">
                            #{index + 1} Best Time
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Peak posting time with {timeSlot.count} posts</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Posting Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.dailyPatterns.map(([date, count]) => (
                  <div key={date} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{date}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((count / Math.max(...analyticsData.dailyPatterns.map(([, c]) => c))) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Top Performing Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Top Performing Posts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topPosts.map((post, index) => (
                  <div key={post.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xl">{getPlatformIcon(post.platform)}</span>
                        <h4 className="font-semibold text-gray-900 truncate">{post.title}</h4>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.comments}</span>
                        <span>🔗 {post.shares}</span>
                        <span className="font-semibold text-blue-600">
                          {post.totalEngagement.toLocaleString()} total
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.platformMetrics.map(platform => (
                  <div key={platform.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getPlatformIcon(platform.platform)}</span>
                        <span className="font-medium">{platform.platform}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {platform.avgEngagement} avg engagement
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
                        style={{ width: `${platform.shareOfEngagement}%` }}
                      />
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
};

export default PlatformAnalyticsDashboard;