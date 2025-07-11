import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, Unlink, ArrowDown, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PaidAd, AdTag, Tag, PostWithTags } from "@shared/schema";

interface PaidAdItemProps {
  ad: PaidAd & { adTags: (AdTag & { tag: Tag })[] };
  post: PostWithTags;
}

export default function PaidAdItem({ ad, post }: PaidAdItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/paid-ads/${ad.id}/unlink`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Ad unlinked",
        description: "Paid ad has been unlinked and will no longer inherit tags.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unlink paid ad.",
        variant: "destructive",
      });
    },
  });

  const relinkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/paid-ads/${ad.id}/relink`, {
        postId: post.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Ad relinked",
        description: "Paid ad has been relinked and will now inherit tags.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to relink paid ad.",
        variant: "destructive",
      });
    },
  });

  const handleUnlink = () => {
    unlinkMutation.mutate();
  };

  const handleRelink = () => {
    relinkMutation.mutate();
  };

  const performance = ad.performance as any;
  const inheritedTags = ad.adTags.filter(at => at.isInherited);
  const manualTags = ad.adTags.filter(at => !at.isInherited);

  return (
    <Card className={`${!ad.isLinked ? 'bg-carbon-gray-10 opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-carbon-gray-20">
              {ad.thumbnailUrl ? (
                <img
                  src={ad.thumbnailUrl}
                  alt={ad.name || ad.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                  <div className="text-white text-xs font-bold text-center leading-tight">
                    {ad.platform === 'META' ? 'META' : 
                     ad.platform === 'TIKTOK' ? 'TT' : 
                     ad.platform === 'YOUTUBE' ? 'YT' : 'AD'}
                  </div>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium text-carbon-gray-100 text-sm">{ad.name || ad.title}</h4>
              <p className="text-xs text-carbon-gray-70">
                {ad.platform} • {ad.status}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {ad.isLinked ? (
              <Badge variant="outline" className="text-carbon-green bg-carbon-green bg-opacity-10">
                <Link className="w-3 h-3 mr-1" />
                Linked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-carbon-yellow bg-carbon-yellow bg-opacity-10">
                <Unlink className="w-3 h-3 mr-1" />
                Unlinked
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={ad.isLinked ? handleUnlink : handleRelink}
              disabled={unlinkMutation.isPending || relinkMutation.isPending}
              className="text-carbon-gray-50 hover:text-carbon-gray-70"
            >
              {ad.isLinked ? (
                <Unlink className="w-3 h-3" />
              ) : (
                <Link className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Tag Inheritance Status */}
        <div className="text-xs text-carbon-gray-70 mb-2">
          {ad.isLinked ? (
            <div className="flex items-center">
              <ArrowDown className="w-3 h-3 mr-1" />
              Inheriting {inheritedTags.length} tags from original post
            </div>
          ) : (
            <div className="flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Tag inheritance disabled - using frozen tags
            </div>
          )}
        </div>
        
        {/* Tags Preview */}
        <div className="flex flex-wrap gap-1 mb-3">
          {ad.adTags.slice(0, 3).map((adTag) => (
            <Badge
              key={adTag.id}
              variant="secondary"
              className={`text-xs ${
                !ad.isLinked 
                  ? 'bg-carbon-gray-30 text-carbon-gray-70' 
                  : 'bg-carbon-gray-20 text-carbon-gray-70'
              }`}
            >
              {adTag.tag.name}
            </Badge>
          ))}
          {ad.adTags.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-carbon-gray-20 text-carbon-gray-70">
              +{ad.adTags.length - 3} more
            </Badge>
          )}
        </div>
        
        {/* Ad Performance */}
        <div className="pt-3 border-t border-carbon-gray-20">
          <div className="flex items-center space-x-4 text-xs text-carbon-gray-70">
            <span>CTR: {performance?.ctr || '0.0%'}</span>
            <span>Reach: {performance?.reach || '0'}</span>
            <span>Spend: ${performance?.spend || '0'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
