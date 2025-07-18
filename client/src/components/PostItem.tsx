import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Heart, MessageCircle, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostWithTags } from "@shared/schema";

interface PostItemProps {
  post: PostWithTags;
  isSelected: boolean;
  onSelect: () => void;
  bulkMode?: boolean;
  isBulkSelected?: boolean;
  onBulkSelect?: (isSelected: boolean) => void;
}

const platformIcons = {
  instagram: "fab fa-instagram",
  tiktok: "fab fa-tiktok", 
  youtube: "fab fa-youtube",
};

const platformColors = {
  instagram: "from-purple-500 to-pink-500",
  tiktok: "from-red-500 to-pink-500",
  youtube: "from-red-600 to-red-500",
};



export default function PostItem({ 
  post, 
  isSelected, 
  onSelect, 
  bulkMode = false, 
  isBulkSelected = false, 
  onBulkSelect 
}: PostItemProps) {
  const platformColor = platformColors[post.platform as keyof typeof platformColors] || "from-blue-500 to-blue-600";
  const platformIcon = platformIcons[post.platform as keyof typeof platformIcons] || "fab fa-share-square";

  const formatTimestamp = (timestamp: string | Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };



  const metadata = post.metadata as any;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && !bulkMode && "ring-2 ring-carbon-blue",
        isBulkSelected && bulkMode && "ring-2 ring-green-500 bg-green-50"
      )}
      onClick={bulkMode ? undefined : onSelect}
    >
      <CardContent className="p-4">
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            {bulkMode && (
              <Checkbox
                checked={isBulkSelected}
                onCheckedChange={(checked) => onBulkSelect?.(checked === true)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center", platformColor)}>
              <i className={cn(platformIcon, "text-white text-sm")} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-carbon-gray-100">{post.title}</h3>
              <p className="text-sm text-carbon-gray-70">
                Post ID: {post.id} • {formatTimestamp(post.createdAt)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-carbon-blue bg-opacity-10 text-carbon-blue">
            Campaign: {post.campaignName}
          </Badge>
        </div>
        
        {/* Engagement Metrics */}
        {metadata?.engagement && (
          <div className="mb-4 grid grid-cols-3 gap-2 text-sm text-carbon-gray-70">
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span>{metadata.engagement.likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{metadata.engagement.comments.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Share className="w-4 h-4" />
              <span>{metadata.engagement.shares.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Interactive Embedded Media Player */}
        <div className="mb-4 relative rounded-lg overflow-hidden">
          {(() => {
            const embedUrl = post.embedUrl;
            
            if (!embedUrl) {
              return post.thumbnailUrl ? (
                <img
                  src={post.thumbnailUrl}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-carbon-gray-20 flex items-center justify-center">
                  <span className="text-carbon-gray-50">No media available</span>
                </div>
              );
            }

            // TikTok embedded player
            if (embedUrl.includes('tiktok.com')) {
              const videoIdMatch = embedUrl.match(/\/video\/(\d+)/);
              if (videoIdMatch) {
                const videoId = videoIdMatch[1];
                const embedSrc = `https://www.tiktok.com/embed/v2/${videoId}`;
                
                return (
                  <iframe
                    src={embedSrc}
                    width="100%"
                    height="400"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-96"
                  />
                );
              }
            }

            // YouTube embedded player
            if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
              let videoId = '';
              
              if (embedUrl.includes('youtube.com/watch?v=')) {
                videoId = embedUrl.split('v=')[1]?.split('&')[0];
              } else if (embedUrl.includes('youtu.be/')) {
                videoId = embedUrl.split('youtu.be/')[1]?.split('?')[0];
              }
              
              if (videoId) {
                return (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    width="100%"
                    height="315"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-80"
                  />
                );
              }
            }

            // Instagram embedded player
            if (embedUrl.includes('instagram.com')) {
              return (
                <div className="w-full h-48 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center relative">
                  <div className="text-center text-white">
                    <Play className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">Instagram Content</p>
                    <p className="text-sm opacity-90">Click to view</p>
                  </div>
                  <div 
                    className="absolute inset-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(embedUrl, '_blank');
                    }}
                  />
                </div>
              );
            }

            // Generic video player for direct video URLs
            if (embedUrl.includes('.mp4') || embedUrl.includes('.webm') || embedUrl.includes('.ogg')) {
              return (
                <video
                  controls
                  className="w-full h-48"
                  preload="metadata"
                  onClick={(e) => e.stopPropagation()}
                >
                  <source src={embedUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              );
            }

            // Fallback - show thumbnail with link button
            return (
              <div className="w-full h-48 bg-carbon-gray-20 flex items-center justify-center relative">
                {post.thumbnailUrl && (
                  <img
                    src={post.thumbnailUrl}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="relative z-10 text-center bg-black bg-opacity-50 p-4 rounded-lg">
                  <Play className="w-8 h-8 mx-auto mb-2 text-white" />
                  <p className="text-white text-sm mb-2">Interactive Media</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(embedUrl, '_blank');
                    }}
                  >
                    View Original
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
        

      </CardContent>
    </Card>
  );
}
