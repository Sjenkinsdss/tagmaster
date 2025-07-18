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

            // Instagram interactive preview
            if (embedUrl.includes('instagram.com')) {
              // Extract Instagram post ID from URL - handle both http and https
              const postMatch = embedUrl.match(/instagram\.com\/p\/([^\/\?]+)/);
              const reelMatch = embedUrl.match(/instagram\.com\/reel\/([^\/\?]+)/);
              
              if (postMatch || reelMatch) {
                const postId = postMatch ? postMatch[1] : reelMatch[1];
                
                // Create an interactive Instagram-style preview
                return (
                  <div className="w-full h-96 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="flex items-center px-4 py-3 border-b border-gray-200">
                      <div className="w-8 h-8 bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-400 rounded-full flex items-center justify-center mr-3">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">Instagram Post</div>
                        <div className="text-xs text-gray-500">{postId}</div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 h-64 flex items-center justify-center relative">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-2">Instagram Content</h3>
                        <p className="text-sm text-gray-600 mb-4">Click to view original post</p>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(embedUrl, '_blank');
                          }}
                        >
                          View on Instagram
                        </Button>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 border-t border-gray-200">
                      <div className="flex items-center space-x-4 text-gray-600">
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 border-2 border-gray-400 rounded-sm"></div>
                          <span className="text-xs">Like</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
                          <span className="text-xs">Comment</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 border-2 border-gray-400 rounded-sm transform rotate-45"></div>
                          <span className="text-xs">Share</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Fallback for Instagram URLs that don't match expected patterns
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

            // Facebook/Meta interactive preview
            if (embedUrl.includes('facebook.com') || embedUrl.includes('fb.com')) {
              // Extract Facebook content type from URL
              const isVideo = embedUrl.includes('/videos/');
              const isPost = embedUrl.includes('/posts/') || embedUrl.includes('permalink.php');
              
              return (
                <div className="w-full h-96 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="flex items-center px-4 py-3 border-b border-gray-200">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <div className="text-white font-bold text-sm">f</div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Facebook {isVideo ? 'Video' : 'Post'}</div>
                      <div className="text-xs text-gray-500">Meta content</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 h-64 flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                        {isVideo ? (
                          <Play className="w-8 h-8 text-white" />
                        ) : (
                          <div className="text-white font-bold text-lg">f</div>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">
                        Facebook {isVideo ? 'Video' : 'Content'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">Click to view original {isVideo ? 'video' : 'post'}</p>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(embedUrl, '_blank');
                        }}
                      >
                        View on Facebook
                      </Button>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 text-blue-500">👍</div>
                        <span className="text-xs">Like</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 text-gray-500">💬</div>
                        <span className="text-xs">Comment</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 text-gray-500">↗️</div>
                        <span className="text-xs">Share</span>
                      </div>
                    </div>
                  </div>
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
