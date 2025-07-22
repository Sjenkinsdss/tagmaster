import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Heart, MessageCircle, Share, Instagram, Youtube, Facebook, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostWithTags } from "@shared/schema";
import { InteractionTooltip, InteractionGuide } from './InteractionTooltip';

interface PostItemProps {
  post: PostWithTags;
  isSelected: boolean;
  onSelect: () => void;
  bulkMode?: boolean;
  isBulkSelected?: boolean;
  onBulkSelect?: (isSelected: boolean) => void;
}

const platformColors = {
  Instagram: "from-purple-500 to-pink-500",
  TikTok: "from-black to-red-500",
  YouTube: "from-red-600 to-red-500",
  Facebook: "from-blue-600 to-blue-500",
  Twitter: "from-blue-400 to-blue-500",
  Snapchat: "from-yellow-400 to-yellow-500",
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
              {post.platform === 'Instagram' && <Instagram className="w-4 h-4 text-white" />}
              {post.platform === 'TikTok' && <Play className="w-4 h-4 text-white" />}
              {post.platform === 'YouTube' && <Youtube className="w-4 h-4 text-white" />}
              {post.platform === 'Facebook' && <Facebook className="w-4 h-4 text-white" />}
              {post.platform === 'Twitter' && <Twitter className="w-4 h-4 text-white" />}
              {post.platform === 'Snapchat' && <MessageCircle className="w-4 h-4 text-white" />}
              {!['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter', 'Snapchat'].includes(post.platform) && <Share className="w-4 h-4 text-white" />}
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
                  <InteractionTooltip platform="tiktok">
                    <div className="w-full bg-black rounded-lg overflow-hidden relative">
                      <div className="absolute top-2 right-2 z-10">
                        <InteractionGuide platform="tiktok" />
                      </div>
                      <iframe
                        src={embedSrc}
                        width="100%"
                        height="400"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-96"
                      />
                    </div>
                  </InteractionTooltip>
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
                  <InteractionTooltip platform="youtube">
                    <div className="w-full bg-black rounded-lg overflow-hidden relative">
                      <div className="absolute top-2 right-2 z-10">
                        <InteractionGuide platform="youtube" />
                      </div>
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        width="100%"
                        height="315"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-80"
                      />
                    </div>
                  </InteractionTooltip>
                );
              }
            }

            // Instagram embedded content - check both embedUrl and url
            if ((embedUrl && embedUrl.includes('instagram.com')) || 
                (post.url && post.url.includes('instagram.com'))) {
              // Use url field if available, otherwise fall back to embedUrl
              const instagramUrl = post.url || embedUrl;
              
              // Extract Instagram post ID from URL - handle both http and https
              const postMatch = instagramUrl.match(/instagram\.com\/p\/([^\/\?]+)/);
              const reelMatch = instagramUrl.match(/instagram\.com\/reel\/([^\/\?]+)/);
              
              if (postMatch || reelMatch) {
                const postId = postMatch ? postMatch[1] : reelMatch?.[1];
                
                // Create Instagram embed URL - using simpler approach for better compatibility
                const embedInstagramUrl = `https://www.instagram.com/p/${postId}/embed/captioned/`;
                
                return (
                  <InteractionTooltip platform="instagram">
                    <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                         onClick={(e) => {
                           e.stopPropagation();
                           window.open(instagramUrl, '_blank');
                         }}>
                      <div className="flex items-center px-4 py-3 border-b border-gray-200">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-400 rounded-full flex items-center justify-center mr-3">
                          <div className="w-6 h-6 bg-white rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">Instagram Post</div>
                          <div className="text-xs text-gray-500">Click to view on Instagram</div>
                        </div>
                        <InteractionGuide platform="instagram" className="ml-2" />
                      </div>
                      
                      {/* Instagram image preview */}
                      <div className="relative bg-gray-50 h-80 flex items-center justify-center">
                        {post.thumbnailUrl ? (
                          <img
                            src={post.thumbnailUrl}
                            alt="Instagram post preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-gray-500">
                            <div className="w-16 h-16 bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-400 rounded-lg mx-auto mb-3 flex items-center justify-center">
                              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                <div className="w-8 h-8 bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-400 rounded"></div>
                              </div>
                            </div>
                            <p className="font-medium">Instagram Content</p>
                            <p className="text-sm">Click to view post</p>
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <div className="bg-white/90 hover:bg-white border border-gray-200 px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm transition-all opacity-0 hover:opacity-100">
                            View on Instagram
                          </div>
                        </div>
                      </div>
                    </div>
                  </InteractionTooltip>
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
                      window.open(instagramUrl, '_blank');
                    }}
                  />
                </div>
              );
            }

            // Facebook/Meta embedded content - check both embedUrl and url
            if ((embedUrl && (embedUrl.includes('facebook.com') || embedUrl.includes('fb.com'))) || 
                (post.url && (post.url.includes('facebook.com') || post.url.includes('fb.com')))) {
              // Use url field if available, otherwise fall back to embedUrl
              const facebookUrl = post.url || embedUrl;
              
              // Create Facebook embed URL - handle different Facebook URL formats
              let cleanFacebookUrl = facebookUrl;
              
              // Convert mobile URLs to desktop format
              if (facebookUrl.includes('m.facebook.com')) {
                cleanFacebookUrl = facebookUrl.replace('m.facebook.com', 'facebook.com');
              }
              
              // Create Facebook embed URL
              const embedFacebookUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(cleanFacebookUrl)}&width=500&show_text=true&height=500`;
              
              return (
                <InteractionTooltip platform="facebook">
                  <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="flex items-center px-4 py-3 border-b border-gray-200">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <div className="text-white font-bold text-sm">f</div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">Facebook Post</div>
                        <div className="text-xs text-gray-500">Embedded content</div>
                      </div>
                      <InteractionGuide platform="facebook" className="ml-2" />
                    </div>
                  
                  {/* Facebook embedded iframe */}
                  <div className="relative">
                    <iframe
                      src={embedFacebookUrl}
                      width="100%"
                      height="500"
                      style={{ border: 'none', overflow: 'hidden' }}
                      scrolling="no"
                      frameBorder="0"
                      allow="encrypted-media"
                      title="Facebook Post"
                      className="w-full"
                    />
                    
                    {/* Fallback if iframe fails to load */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(facebookUrl, '_blank');
                      }}
                    >
                      <div className="text-center bg-white/90 p-4 rounded-lg">
                        <div className="text-blue-600 font-semibold mb-2">Open in Facebook</div>
                        <div className="text-sm text-gray-600">Click to view original post</div>
                      </div>
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
                </InteractionTooltip>
              );
            }

            // Generic video player for direct video URLs
            if (embedUrl.includes('.mp4') || embedUrl.includes('.webm') || embedUrl.includes('.ogg')) {
              return (
                <InteractionTooltip platform="video">
                  <div className="w-full bg-black rounded-lg overflow-hidden relative">
                    <div className="absolute top-2 right-2 z-10">
                      <InteractionGuide platform="video" />
                    </div>
                    <video
                      controls
                      className="w-full h-48"
                      preload="metadata"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <source src={embedUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </InteractionTooltip>
              );
            }

            // Fallback - show thumbnail with link button
            return (
              <InteractionTooltip platform="default">
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
                  <div className="absolute top-2 right-2">
                    <InteractionGuide platform="default" />
                  </div>
                </div>
              </InteractionTooltip>
            );
          })()}
        </div>
        

      </CardContent>
    </Card>
  );
}
