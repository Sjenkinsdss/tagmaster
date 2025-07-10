import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Heart, MessageCircle, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostWithTags } from "@shared/schema";

interface PostItemProps {
  post: PostWithTags;
  isSelected: boolean;
  onSelect: () => void;
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

export default function PostItem({ post, isSelected, onSelect }: PostItemProps) {
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
        isSelected && "ring-2 ring-carbon-blue"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center", platformColor)}>
              <i className={cn(platformIcon, "text-white text-sm")} />
            </div>
            <div>
              <h3 className="font-medium text-carbon-gray-100">{post.title}</h3>
              <p className="text-sm text-carbon-gray-70">
                {formatTimestamp(post.createdAt)}
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

        {/* Embedded Media */}
        <div className="mb-4 relative rounded-lg overflow-hidden">
          {post.embedUrl && post.embedUrl.includes('tiktok.com') ? (
            <div className="w-full h-48 bg-black flex items-center justify-center relative">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
                <div className="text-center text-white">
                  <Play className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">TikTok Video</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="secondary"
                  className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(post.embedUrl, '_blank');
                  }}
                >
                  <Play className="w-5 h-5 text-carbon-gray-80" />
                </Button>
              </div>
            </div>
          ) : post.thumbnailUrl ? (
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-carbon-gray-20 flex items-center justify-center">
              <span className="text-carbon-gray-50">
                {post.embedUrl ? 'Interactive Media Available' : 'No thumbnail'}
              </span>
              {post.embedUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(post.embedUrl, '_blank');
                  }}
                >
                  View Original
                </Button>
              )}
            </div>
          )}
        </div>
        

      </CardContent>
    </Card>
  );
}
