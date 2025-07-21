import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Heart, MessageCircle, Share2, Eye, Zap } from "lucide-react";

interface Post {
  id: number;
  title: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  createdAt: string | Date;
  content?: string;
}

interface EngagementHeatMapProps {
  posts: Post[];
  selectedPost?: Post | null;
  onPostSelect?: (post: Post) => void;
  variant?: 'grid' | 'timeline' | 'compact';
}

const EngagementHeatMap: React.FC<EngagementHeatMapProps> = ({
  posts,
  selectedPost,
  onPostSelect,
  variant = 'grid'
}) => {
  // Calculate engagement metrics and mood indicators
  const processedPosts = useMemo(() => {
    if (!posts?.length) return [];

    // Calculate percentiles for relative scoring
    const allLikes = posts.map(p => p.likes || 0);
    const allComments = posts.map(p => p.comments || 0);
    const allShares = posts.map(p => p.shares || 0);
    
    const getPercentile = (arr: number[], value: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const index = sorted.findIndex(v => v >= value);
      return index === -1 ? 100 : (index / sorted.length) * 100;
    };

    return posts.map(post => {
      const likes = post.likes || 0;
      const comments = post.comments || 0;
      const shares = post.shares || 0;
      
      // Calculate engagement score (0-100)
      const likeScore = getPercentile(allLikes, likes);
      const commentScore = getPercentile(allComments, comments);
      const shareScore = getPercentile(allShares, shares);
      const engagementScore = (likeScore + commentScore + shareScore) / 3;

      // Determine mood based on engagement patterns
      const getMoodData = (score: number, likes: number, comments: number, shares: number) => {
        if (score >= 80) {
          return { 
            emoji: "🔥", 
            mood: "Viral", 
            color: "bg-red-500", 
            intensity: "high",
            description: "High engagement across all metrics"
          };
        } else if (score >= 60) {
          return { 
            emoji: "😍", 
            mood: "Loved", 
            color: "bg-pink-500", 
            intensity: "high",
            description: "Strong positive engagement"
          };
        } else if (score >= 40) {
          return { 
            emoji: "👍", 
            mood: "Good", 
            color: "bg-green-500", 
            intensity: "medium",
            description: "Solid engagement performance"
          };
        } else if (score >= 20) {
          return { 
            emoji: "😐", 
            mood: "Neutral", 
            color: "bg-yellow-500", 
            intensity: "low",
            description: "Average engagement"
          };
        } else {
          return { 
            emoji: "😴", 
            mood: "Quiet", 
            color: "bg-gray-400", 
            intensity: "low",
            description: "Low engagement activity"
          };
        }
      };

      // Special mood indicators for specific patterns
      let moodData = getMoodData(engagementScore, likes, comments, shares);
      
      // Override for specific engagement patterns
      if (comments > likes * 0.5 && comments > 10) {
        moodData = { 
          emoji: "💬", 
          mood: "Buzzing", 
          color: "bg-blue-500", 
          intensity: "high",
          description: "High discussion activity"
        };
      } else if (shares > likes * 0.3 && shares > 5) {
        moodData = { 
          emoji: "🚀", 
          mood: "Trending", 
          color: "bg-purple-500", 
          intensity: "high",
          description: "High share activity"
        };
      }

      return {
        ...post,
        engagementScore,
        ...moodData,
        totalEngagement: likes + comments + shares
      };
    });
  }, [posts]);

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {processedPosts.map(post => (
        <TooltipProvider key={post.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                  selectedPost?.id === post.id 
                    ? 'border-blue-500 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onPostSelect?.(post)}
              >
                {/* Mood Emoji - Large and prominent */}
                <div className="text-center mb-2">
                  <span className="text-3xl animate-pulse-glow">{post.emoji}</span>
                </div>
                
                {/* Engagement Heat Indicator */}
                <div 
                  className={`absolute top-1 right-1 w-3 h-3 rounded-full ${post.color} opacity-80`}
                  style={{
                    boxShadow: post.intensity === 'high' ? `0 0 8px ${post.color.replace('bg-', 'rgb(')})` : 'none'
                  }}
                />
                
                {/* Platform Badge */}
                <Badge variant="secondary" className="text-xs mb-2 w-full justify-center">
                  {post.platform?.toUpperCase() || 'POST'}
                </Badge>
                
                {/* Engagement Metrics */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3 text-red-500" />
                      <span>{post.likes || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-3 h-3 text-blue-500" />
                      <span>{post.comments || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Share2 className="w-3 h-3 text-green-500" />
                      <span>{post.shares || 0}</span>
                    </div>
                    <Badge variant="outline" className="text-xs px-1">
                      {Math.round(post.engagementScore)}%
                    </Badge>
                  </div>
                </div>
                
                {/* Mood Label */}
                <div className="text-center mt-2">
                  <span className="text-xs font-medium text-gray-600">{post.mood}</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">{post.title?.slice(0, 50) || `Post ${post.id}`}</p>
                <p className="text-xs text-gray-500">{post.description}</p>
                <div className="flex items-center space-x-3 text-xs">
                  <span>💖 {post.likes}</span>
                  <span>💬 {post.comments}</span>
                  <span>🔄 {post.shares}</span>
                </div>
                <p className="text-xs font-medium">Score: {Math.round(post.engagementScore)}%</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );

  const renderTimelineView = () => (
    <div className="space-y-2">
      {processedPosts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(post => (
          <div
            key={post.id}
            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              selectedPost?.id === post.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => onPostSelect?.(post)}
          >
            <div className="flex-shrink-0">
              <span className="text-2xl">{post.emoji}</span>
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium truncate">
                  {post.title?.slice(0, 30) || `Post ${post.id}`}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {post.platform}
                </Badge>
                <span className="text-xs text-gray-500">{post.mood}</span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                <span className="flex items-center space-x-1">
                  <Heart className="w-3 h-3" />
                  <span>{post.likes}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{post.comments}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Share2 className="w-3 h-3" />
                  <span>{post.shares}</span>
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className={`w-4 h-4 rounded-full ${post.color}`} />
            </div>
          </div>
        ))}
    </div>
  );

  const renderCompactView = () => (
    <div className="flex flex-wrap gap-2">
      {processedPosts.map(post => (
        <TooltipProvider key={post.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`relative p-2 rounded-full border-2 cursor-pointer transition-all hover:scale-110 ${
                  selectedPost?.id === post.id ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => onPostSelect?.(post)}
              >
                <span className="text-xl">{post.emoji}</span>
                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${post.color}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p className="font-medium">{post.mood}</p>
                <p className="text-xs">{Math.round(post.engagementScore)}% engagement</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );

  // Engagement summary statistics
  const stats = useMemo(() => {
    if (!processedPosts.length) return null;
    
    const avgScore = processedPosts.reduce((sum, p) => sum + p.engagementScore, 0) / processedPosts.length;
    const topMood = processedPosts.reduce((acc, post) => {
      acc[post.mood] = (acc[post.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantMood = Object.entries(topMood).sort(([,a], [,b]) => b - a)[0];
    
    return {
      avgScore: Math.round(avgScore),
      totalPosts: processedPosts.length,
      dominantMood: dominantMood ? { mood: dominantMood[0], count: dominantMood[1] } : null
    };
  }, [processedPosts]);

  const renderView = () => {
    switch (variant) {
      case 'timeline':
        return renderTimelineView();
      case 'compact':
        return renderCompactView();
      default:
        return renderGridView();
    }
  };

  if (!posts?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Engagement Heat Map</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">📊</div>
            <p>No posts available for heat map analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Engagement Heat Map</span>
          </div>
          {stats && (
            <div className="flex items-center space-x-3 text-sm">
              <Badge variant="outline">
                {stats.totalPosts} posts
              </Badge>
              <Badge variant="outline">
                {stats.avgScore}% avg
              </Badge>
              {stats.dominantMood && (
                <Badge variant="outline">
                  {stats.dominantMood.mood} ({stats.dominantMood.count})
                </Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderView()}
      </CardContent>
    </Card>
  );
};

export default EngagementHeatMap;