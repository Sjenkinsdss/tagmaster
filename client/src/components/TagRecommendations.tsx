import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Plus, Info, TrendingUp, Users, Target, Lightbulb } from "lucide-react";
import type { Tag as TagType, PostWithTags } from "@shared/schema";

interface TagRecommendation {
  tag: TagType;
  score: number;
  reasons: string[];
}

interface TagRecommendationsProps {
  selectedPost: PostWithTags | null;
  onTagSelect?: (tag: TagType) => void;
}

export default function TagRecommendations({ selectedPost, onTagSelect }: TagRecommendationsProps) {
  const { toast } = useToast();
  const [expandedRecommendation, setExpandedRecommendation] = useState<number | null>(null);

  // Fetch tag recommendations for the selected post
  const { data: recommendationsData, isLoading, error } = useQuery({
    queryKey: ["/api/posts", selectedPost?.id, "tag-recommendations"],
    queryFn: async () => {
      if (!selectedPost) return null;
      const response = await fetch(`/api/posts/${selectedPost.id}/tag-recommendations?limit=15`);
      if (!response.ok) throw new Error("Failed to fetch recommendations");
      return response.json();
    },
    enabled: !!selectedPost,
    refetchOnMount: true,
  });

  // Add tag to post mutation
  const addTagMutation = useMutation({
    mutationFn: async ({ postId, tagId }: { postId: number; tagId: number }) => {
      const response = await apiRequest("POST", `/api/posts/${postId}/tags/${tagId}`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add tag");
      }
      return response.json();
    },
    onSuccess: (_, { tagId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", selectedPost?.id, "tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", selectedPost?.id, "tag-recommendations"] });
      
      const recommendation = recommendations?.find(r => r.tag.id === tagId);
      toast({
        title: "Tag Added",
        description: `Successfully added "${recommendation?.tag.name}" to the post.`,
      });
    },
    onError: (error: any) => {
      const isReadOnlyError = error.message?.includes("read-only") || error.message?.includes("READONLY_DATABASE");
      toast({
        title: isReadOnlyError ? "Read-Only Database" : "Error",
        description: isReadOnlyError 
          ? "Cannot add tag: Connected to read-only production database."
          : `Failed to add tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const recommendations: TagRecommendation[] = recommendationsData?.recommendations || [];

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 0.6) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 0.4) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <TrendingUp className="w-3 h-3" />;
    if (score >= 0.6) return <Target className="w-3 h-3" />;
    if (score >= 0.4) return <Users className="w-3 h-3" />;
    return <Lightbulb className="w-3 h-3" />;
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes("content")) return "📝";
    if (reason.includes("similar") || reason.includes("co-occur")) return "🔗";
    if (reason.includes("popular")) return "📈";
    if (reason.includes("diversity") || reason.includes("balance")) return "⚖️";
    if (reason.includes("platform")) return "📱";
    return "💡";
  };

  if (!selectedPost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI Tag Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Select a post to see AI-powered tag recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI Tag Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-12 h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !recommendationsData?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI Tag Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <Info className="w-12 h-12 mx-auto mb-3" />
            <p>Unable to load recommendations</p>
            <p className="text-sm text-gray-500 mt-1">Please try again later</p>
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
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI Tag Recommendations</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {recommendations.length} suggestions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No recommendations available</p>
            <p className="text-sm mt-1">This post may already have optimal tags</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div
                key={recommendation.tag.id}
                className="border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs font-medium ${getScoreColor(recommendation.score)}`}>
                      {getScoreIcon(recommendation.score)}
                      <span>{Math.round(recommendation.score * 100)}%</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{recommendation.tag.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {recommendation.tag.pillar}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        {recommendation.reasons.slice(0, 2).map((reason, idx) => (
                          <div key={idx} className="flex items-center space-x-1">
                            <span className="text-xs">{getReasonIcon(reason)}</span>
                            <span className="text-xs text-gray-500">{reason}</span>
                            {idx < Math.min(recommendation.reasons.length, 2) - 1 && (
                              <Separator orientation="vertical" className="h-3" />
                            )}
                          </div>
                        ))}
                        {recommendation.reasons.length > 2 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => setExpandedRecommendation(
                                    expandedRecommendation === index ? null : index
                                  )}
                                >
                                  +{recommendation.reasons.length - 2} more
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  {recommendation.reasons.slice(2).map((reason, idx) => (
                                    <div key={idx} className="flex items-center space-x-1">
                                      <span>{getReasonIcon(reason)}</span>
                                      <span>{reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => {
                      if (onTagSelect) {
                        onTagSelect(recommendation.tag);
                      } else {
                        addTagMutation.mutate({
                          postId: selectedPost.id,
                          tagId: recommendation.tag.id
                        });
                      }
                    }}
                    disabled={addTagMutation.isPending}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </Button>
                </div>
                
                {expandedRecommendation === index && recommendation.reasons.length > 2 && (
                  <div className="px-3 pb-3">
                    <Separator className="mb-2" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700 mb-1">All reasons:</p>
                      {recommendation.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-xs text-gray-600">
                          <span>{getReasonIcon(reason)}</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">How recommendations work:</p>
                  <p>Our AI analyzes content similarity, tag co-occurrence patterns, pillar balance, popularity trends, and platform relevance to suggest the most relevant tags for your posts.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}