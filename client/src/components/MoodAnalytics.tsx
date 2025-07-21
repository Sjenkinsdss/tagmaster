import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Heart, MessageCircle, Share2, BarChart3, Calendar, Target } from "lucide-react";

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

interface MoodAnalyticsProps {
  posts: Post[];
}

const MoodAnalytics: React.FC<MoodAnalyticsProps> = ({ posts }) => {
  const analytics = useMemo(() => {
    if (!posts?.length) return null;

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate mood distribution
    const moodStats = posts.reduce((acc, post) => {
      const likes = post.likes || 0;
      const comments = post.comments || 0;
      const shares = post.shares || 0;
      const totalEngagement = likes + comments + shares;

      // Determine mood based on engagement thresholds
      let mood = 'Quiet 😴';
      let intensity = 'low';
      let color = 'gray';

      if (totalEngagement > 1000) {
        mood = 'Viral 🔥';
        intensity = 'high';
        color = 'red';
      } else if (totalEngagement > 500) {
        mood = 'Trending 🚀';
        intensity = 'high';
        color = 'purple';
      } else if (totalEngagement > 200) {
        mood = 'Loved 😍';
        intensity = 'high';
        color = 'pink';
      } else if (totalEngagement > 50) {
        mood = 'Buzzing 💬';
        intensity = 'medium';
        color = 'blue';
      } else if (totalEngagement > 10) {
        mood = 'Good 👍';
        intensity = 'medium';
        color = 'green';
      } else if (totalEngagement > 0) {
        mood = 'Neutral 😐';
        intensity = 'low';
        color = 'yellow';
      }

      // Special patterns
      if (comments > likes * 0.5 && comments > 10) {
        mood = 'Buzzing 💬';
        color = 'blue';
      } else if (shares > likes * 0.3 && shares > 5) {
        mood = 'Trending 🚀';
        color = 'purple';
      }

      acc.moodCounts[mood] = (acc.moodCounts[mood] || 0) + 1;
      acc.totalEngagement += totalEngagement;
      acc.totalLikes += likes;
      acc.totalComments += comments;
      acc.totalShares += shares;

      // Platform analysis
      const platform = post.platform || 'Unknown';
      if (!acc.platformStats[platform]) {
        acc.platformStats[platform] = {
          count: 0,
          totalEngagement: 0,
          avgEngagement: 0,
          dominantMood: mood
        };
      }
      acc.platformStats[platform].count++;
      acc.platformStats[platform].totalEngagement += totalEngagement;

      // Time-based analysis
      const postDate = new Date(post.createdAt);
      if (postDate > last7Days) acc.recent7Days++;
      if (postDate > last30Days) acc.recent30Days++;

      return acc;
    }, {
      moodCounts: {} as Record<string, number>,
      totalEngagement: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      platformStats: {} as Record<string, any>,
      recent7Days: 0,
      recent30Days: 0
    });

    // Calculate platform averages
    Object.keys(moodStats.platformStats).forEach(platform => {
      const stats = moodStats.platformStats[platform];
      stats.avgEngagement = Math.round(stats.totalEngagement / stats.count);
    });

    // Find dominant mood
    const dominantMood = Object.entries(moodStats.moodCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Calculate engagement rates
    const avgEngagement = Math.round(moodStats.totalEngagement / posts.length);
    const likeRate = Math.round((moodStats.totalLikes / moodStats.totalEngagement) * 100) || 0;
    const commentRate = Math.round((moodStats.totalComments / moodStats.totalEngagement) * 100) || 0;
    const shareRate = Math.round((moodStats.totalShares / moodStats.totalEngagement) * 100) || 0;

    return {
      ...moodStats,
      dominantMood: dominantMood ? { mood: dominantMood[0], count: dominantMood[1] } : null,
      avgEngagement,
      likeRate,
      commentRate,
      shareRate,
      totalPosts: posts.length
    };
  }, [posts]);

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span>Mood Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">📊</div>
            <p>No posts available for mood analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-carbon-blue">{analytics.totalPosts}</div>
            <p className="text-sm text-gray-600">Total Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.avgEngagement.toLocaleString()}</div>
            <p className="text-sm text-gray-600">Avg. Engagement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{analytics.recent7Days}</div>
            <p className="text-sm text-gray-600">Last 7 Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{analytics.recent30Days}</div>
            <p className="text-sm text-gray-600">Last 30 Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Mood Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span>Mood Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.moodCounts)
              .sort(([,a], [,b]) => b - a)
              .map(([mood, count]) => {
                const percentage = Math.round((count / analytics.totalPosts) * 100);
                return (
                  <div key={mood} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{mood}</span>
                        <Badge variant="outline" className="text-xs">
                          {count} posts
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </div>
          
          {analytics.dominantMood && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Dominant Mood</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {analytics.dominantMood.mood} ({analytics.dominantMood.count} posts, {Math.round((analytics.dominantMood.count / analytics.totalPosts) * 100)}%)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span>Engagement Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-4 bg-red-50 rounded-lg cursor-help">
                    <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-red-700">{analytics.likeRate}%</div>
                    <p className="text-xs text-red-600">Likes</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{analytics.totalLikes.toLocaleString()} total likes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-4 bg-blue-50 rounded-lg cursor-help">
                    <MessageCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-blue-700">{analytics.commentRate}%</div>
                    <p className="text-xs text-blue-600">Comments</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{analytics.totalComments.toLocaleString()} total comments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-4 bg-green-50 rounded-lg cursor-help">
                    <Share2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-green-700">{analytics.shareRate}%</div>
                    <p className="text-xs text-green-600">Shares</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{analytics.totalShares.toLocaleString()} total shares</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Platform Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <span>Platform Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.platformStats)
              .sort(([,a], [,b]) => b.avgEngagement - a.avgEngagement)
              .map(([platform, stats]) => (
                <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{platform}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{stats.count} posts</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{stats.avgEngagement} avg. engagement</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-800">
                      {stats.totalEngagement.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">total engagement</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MoodAnalytics;