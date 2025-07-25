import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import LoadingSpinner from "./LoadingSpinner";

interface Category {
  id: number;
  name: string;
  tagCount: number;
}

interface TagByCategory {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  type: string;
  category: string;
  pillar: string;
}

interface TypeTagSectionProps {
  type: string;
  emoji: string;
  tags: any[];
  selectedPost?: any;
  onTagAdded?: () => void;
  showOnlyAddSection?: boolean;
  aiTags?: any[];
}

const getTypeEmoji = (type: string): string => {
  const emojiMap: { [key: string]: string } = {
    ad: "📢",
    campaign: "🎯",
    client: "🏢",
    post: "📝",
    ai: "🤖",
    influencer: "👤",
    "ai-based": "🖥️",
    product: "🛍️",
    general: "🏷️"
  };
  return emojiMap[type.toLowerCase()] || "🏷️";
};

export default function TypeTagSection({ type, emoji, tags, selectedPost, onTagAdded, showOnlyAddSection = false, aiTags = [] }: TypeTagSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch personalized categories for this type
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/tag-categories", type],
    queryFn: async () => {
      const response = await fetch(`/api/tag-categories?tagType=${encodeURIComponent(type)}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch tags by category (only when category is selected)
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ["/api/tags-by-category", selectedCategoryId],
    queryFn: async () => {
      const response = await fetch(`/api/tags-by-category/${selectedCategoryId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!selectedCategoryId && selectedCategoryId !== "",
  });

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async ({ tagId, postId }: { tagId: number; postId: number }) => {
      const response = await apiRequest("POST", `/api/posts/${postId}/tags/${tagId}/replit`, {});
      return response.json();
    },
    onSuccess: (data, variables) => {
      const selectedTag = tagsData?.tags?.find((tag: TagByCategory) => tag.id === variables.tagId);
      
      console.log("✅ Tag added successfully to Replit database:", {
        tagName: selectedTag?.name || "Unknown",
        categoryName: selectedTag?.categoryName || "Unknown",
        type: selectedTag?.type || type,
        postId: variables.postId
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${variables.postId}/tags`] });
      
      toast({
        title: "Tag added",
        description: `Added "${selectedTag?.name}" to post in Replit database`,
      });
      
      // Reset selections
      setSelectedCategoryId("");
      setSelectedTagId("");
      
      if (onTagAdded) {
        onTagAdded();
      }
    },
    onError: (error) => {
      console.error("❌ Error adding tag:", error);
      toast({
        title: "Error",
        description: `Failed to add tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedTagId("");
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTagId(tagId);
  };

  const handleAddTag = () => {
    if (selectedTagId && selectedPost) {
      const selectedTag = tagsData?.tags?.find((tag: TagByCategory) => tag.id.toString() === selectedTagId);
      
      console.log("🏷️ Attempting to add tag:", {
        tagName: selectedTag?.name,
        categoryName: selectedTag?.categoryName,
        type: selectedTag?.type || type,
        postId: selectedPost.id
      });
      
      addTagMutation.mutate({
        tagId: parseInt(selectedTagId),
        postId: selectedPost.id,
      });
    }
  };

  // Group tags by category
  const tagsByCategory = tags.reduce((acc: any, tag: any) => {
    let categoryName = tag.tag_type_name || tag.categoryName || 'Uncategorized';
    
    // For client tag type, rename generic category names to be more specific
    if (type === 'client' && (categoryName === 'Client' || categoryName === 'client')) {
      categoryName = 'Client Companies';
    }
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(tag);
    return acc;
  }, {});

  const categories = categoriesData?.categories || [];
  const availableTags = tagsData?.tags || [];

  // If showOnlyAddSection is true, only show the add section without the card wrapper
  if (showOnlyAddSection) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Plus className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">Add {type.charAt(0).toUpperCase() + type.slice(1)} Tag</span>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <Select 
              value={selectedCategoryId} 
              onValueChange={handleCategoryChange}
              disabled={categoriesLoading}
            >
              <SelectTrigger>
                <div className="flex items-center space-x-2 w-full">
                  {categoriesLoading && (
                    <LoadingSpinner variant="pulse" size="sm" />
                  )}
                  <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {categories
                  .sort((a: Category, b: Category) => a.name.localeCompare(b.name))
                  .map((category: Category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{category.name}</span>
                      <span className="text-xs text-gray-500">({category.tagCount} tags)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Select 
              value={selectedTagId} 
              onValueChange={handleTagChange}
              disabled={!selectedCategoryId || tagsLoading}
            >
              <SelectTrigger>
                <div className="flex items-center space-x-2 w-full">
                  {tagsLoading && selectedCategoryId && (
                    <LoadingSpinner variant="content" size="sm" />
                  )}
                  <SelectValue placeholder={tagsLoading && selectedCategoryId ? "Loading tags..." : "Select tag"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((tag: TagByCategory) => (
                  <SelectItem key={tag.id} value={tag.id.toString()}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleAddTag}
            disabled={!selectedTagId || !selectedPost || addTagMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
          >
            {addTagMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner variant="ai" size="sm" />
                <span>Adding Tag...</span>
              </div>
            ) : (
              "Add Tag"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-gray-200 bg-white">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{getTypeEmoji(type)}</span>
            <span className="capitalize">{type} Tags ({tags.length})</span>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Display existing tags grouped by category */}
          {Object.entries(tagsByCategory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([categoryName, categoryTags]: [string, any]) => (
              <div key={categoryName} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  {categoryName} ({(categoryTags as any[]).length})
                </h4>
                <div className="flex flex-wrap gap-2 ml-4">
                  {(categoryTags as any[])
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((tag: any, tagIndex: number) => (
                      <Badge
                        key={`${type}-${categoryName}-${tag.id}-${tagIndex}`}
                        variant="secondary"
                        className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                </div>
              </div>
            ))}



          {/* Add new tag section */}
          <div className="border-t pt-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Add Tags by Category</span>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Select 
                    value={selectedCategoryId} 
                    onValueChange={handleCategoryChange}
                    disabled={categoriesLoading}
                  >
                    <SelectTrigger>
                      <div className="flex items-center space-x-2 w-full">
                        {categoriesLoading && (
                          <LoadingSpinner variant="pulse" size="sm" />
                        )}
                        <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .sort((a: Category, b: Category) => a.name.localeCompare(b.name))
                        .map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{category.name}</span>
                            <span className="text-xs text-gray-500">({category.tagCount} tags)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Select 
                    value={selectedTagId} 
                    onValueChange={handleTagChange}
                    disabled={!selectedCategoryId || tagsLoading}
                  >
                    <SelectTrigger>
                      <div className="flex items-center space-x-2 w-full">
                        {tagsLoading && selectedCategoryId && (
                          <LoadingSpinner variant="content" size="sm" />
                        )}
                        <SelectValue placeholder={tagsLoading && selectedCategoryId ? "Loading tags..." : "Select tag"} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag: TagByCategory) => (
                        <SelectItem key={tag.id} value={tag.id.toString()}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAddTag}
                  disabled={!selectedTagId || !selectedPost || addTagMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  {addTagMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner variant="ai" size="sm" />
                      <span>Adding Tag...</span>
                    </div>
                  ) : (
                    "Add Tag"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}