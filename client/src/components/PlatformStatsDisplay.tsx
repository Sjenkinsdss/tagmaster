import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye,
  Target,
  Calendar,
  Clock,
  Award,
  Zap
} from "lucide-react";

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

interface PlatformStatsDisplayProps {
  posts: Post[];
}

const PlatformStatsDisplay: React.FC<PlatformStatsDisplayProps> = ({ posts }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'posts' | 'performance'>('engagement');

  const platformStats = useMemo(() => {
    if (!posts?.length) return null;

    const now = new Date();
    const timeRanges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      'all': new Date(0)
    };

    const filteredPosts = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= timeRanges[timeRange];
    });

    const platformData: Record<string, any> = {};
    let totalEngagement = 0;
    let totalPosts = filteredPosts.length;

    // Process posts by platform
    filteredPosts.forEach(post => {
      const platform = post.platform || 'Unknown';
      const likes = post.likes || 0;
      const comments = post.comments || 0;
      const shares = post.shares || 0;
      const engagement = likes + comments + shares;
      
      totalEngagement += engagement;

      if (!platformData[platform]) {
        platformData[platform] = {
          name: platform,
          posts: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalEngagement: 0,
          avgEngagement: 0,
          topPost: null,
          recentPosts: [],
          engagementTrend: 0,
          shareRate: 0,
          commentRate: 0,
          likeRate: 0
        };
      }

      const platformEntry = platformData[platform];
      platformEntry.posts++;
      platformEntry.totalLikes += likes;
      platformEntry.totalComments += comments;
      platformEntry.totalShares += shares;
      platformEntry.totalEngagement += engagement;
      platformEntry.recentPosts.push(post);

      // Track top performing post
      if (!platformEntry.topPost || engagement > (platformEntry.topPost.likes + platformEntry.topPost.comments + platformEntry.topPost.shares)) {
        platformEntry.topPost = post;
      }
    });

    // Calculate averages and rates
    Object.values(platformData).forEach((platform: any) => {
      platform.avgEngagement = Math.round(platform.totalEngagement / platform.posts);
      platform.likeRate = platform.totalEngagement > 0 ? Math.round((platform.totalLikes / platform.totalEngagement) * 100) : 0;
      platform.commentRate = platform.totalEngagement > 0 ? Math.round((platform.totalComments / platform.totalEngagement) * 100) : 0;
      platform.shareRate = platform.totalEngagement > 0 ? Math.round((platform.totalShares / platform.totalEngagement) * 100) : 0;
      
      // Calculate engagement trend (simplified - comparing recent vs older posts)
      const sortedPosts = platform.recentPosts.sort((a: Post, b: Post) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const recentHalf = sortedPosts.slice(0, Math.ceil(sortedPosts.length / 2));
      const olderHalf = sortedPosts.slice(Math.ceil(sortedPosts.length / 2));
      
      if (recentHalf.length && olderHalf.length) {
        const recentAvg = recentHalf.reduce((sum: number, p: Post) => 
          sum + (p.likes + p.comments + p.shares), 0) / recentHalf.length;
        const olderAvg = olderHalf.reduce((sum: number, p: Post) => 
          sum + (p.likes + p.comments + p.shares), 0) / olderHalf.length;
        platform.engagementTrend = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
      }
    });

    // Sort platforms by performance
    const sortedPlatforms = Object.values(platformData)
      .sort((a: any, b: any) => b.totalEngagement - a.totalEngagement);

    return {
      platforms: sortedPlatforms,
      totalPosts,
      totalEngagement,
      avgEngagementPerPost: Math.round(totalEngagement / totalPosts),
      timeRange,
      topPerformer: sortedPlatforms[0] || null
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

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      'Instagram': 'from-pink-500 to-purple-600',
      'Facebook': 'from-blue-600 to-blue-700',
      'TikTok': 'from-black to-red-500',
      'Twitter': 'from-blue-400 to-blue-500',
      'YouTube': 'from-red-500 to-red-600',
      'LinkedIn': 'from-blue-700 to-blue-800',
      'Snapchat': 'from-yellow-400 to-yellow-500',
      'Pinterest': 'from-red-600 to-pink-600'
    };
    return colors[platform] || 'from-gray-400 to-gray-500';
  };

  if (!platformStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span>Platform Usage Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">📊</div>
            <p>No posts available for platform analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Platform Usage Stats</h3>
          <Badge variant="outline" className="text-blue-600 bg-blue-50">
            {platformStats.platforms.length} platforms
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d' | 'all') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMetric} onValueChange={(value: 'engagement' | 'posts' | 'performance') => setSelectedMetric(value)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="posts">Post Count</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{platformStats.totalPosts}</div>
            <p className="text-sm text-gray-600">Total Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{platformStats.totalEngagement.toLocaleString()}</div>
            <p className="text-sm text-gray-600">Total Engagement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{platformStats.avgEngagementPerPost}</div>
            <p className="text-sm text-gray-600">Avg. per Post</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-orange-600 flex items-center justify-center space-x-1">
              <span>{getPlatformIcon(platformStats.topPerformer?.name || '')}</span>
              <span>{platformStats.topPerformer?.name || 'N/A'}</span>
            </div>
            <p className="text-sm text-gray-600">Top Platform</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance Cards */}
      <div className="grid gap-4">
        {platformStats.platforms.map((platform: any, index: number) => (
          <Card key={platform.name} className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-r ${getPlatformColor(platform.name)} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{getPlatformIcon(platform.name)}</div>
                    <div>
                      <h3 className="text-xl font-bold">{platform.name}</h3>
                      <p className="text-white/80">{platform.posts} posts • {platform.totalEngagement.toLocaleString()} engagement</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{platform.avgEngagement}</div>
                    <p className="text-white/80 text-sm">avg. engagement</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Engagement Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-3 bg-red-50 rounded-lg cursor-help">
                          <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                          <div className="font-bold text-red-700">{platform.likeRate}%</div>
                          <p className="text-xs text-red-600">Likes</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{platform.totalLikes.toLocaleString()} total likes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-3 bg-blue-50 rounded-lg cursor-help">
                          <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                          <div className="font-bold text-blue-700">{platform.commentRate}%</div>
                          <p className="text-xs text-blue-600">Comments</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{platform.totalComments.toLocaleString()} total comments</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-3 bg-green-50 rounded-lg cursor-help">
                          <Share2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                          <div className="font-bold text-green-700">{platform.shareRate}%</div>
                          <p className="text-xs text-green-600">Shares</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{platform.totalShares.toLocaleString()} total shares</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Platform Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Share</span>
                    <span className="font-medium">
                      {Math.round((platform.totalEngagement / platformStats.totalEngagement) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(platform.totalEngagement / platformStats.totalEngagement) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Engagement Trend */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {platform.engagementTrend >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">Engagement Trend</span>
                  </div>
                  <div className={`font-bold ${platform.engagementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {platform.engagementTrend >= 0 ? '+' : ''}{platform.engagementTrend}%
                  </div>
                </div>

                {/* Top Post */}
                {platform.topPost && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Award className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-yellow-800">Top Performing Post</p>
                        <p className="text-sm text-yellow-700 truncate">{platform.topPost.title}</p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-yellow-600">
                          <span>{(platform.topPost.likes + platform.topPost.comments + platform.topPost.shares).toLocaleString()} engagement</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlatformStatsDisplay;