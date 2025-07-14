import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, X, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TagInput from "./TagInput";
import { apiRequest } from "@/lib/queryClient";
import type { PostWithTags, Tag } from "@shared/schema";

interface TagSectionProps {
  title: string;
  icon: React.ReactNode;
  pillar: string;
  post: PostWithTags;
  allTags: Tag[];
  bulkEditMode?: boolean;
  selectedTags?: Set<number>;
  onTagSelection?: (tagId: number, isSelected: boolean) => void;
}

export default function TagSection({ 
  title, 
  icon, 
  pillar, 
  post, 
  allTags, 
  bulkEditMode = false,
  selectedTags = new Set(),
  onTagSelection
}: TagSectionProps) {
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const postTags = post.postTags
    .filter(pt => pt.tag.pillar === pillar)
    .map(pt => pt.tag);

  const aiTags = postTags.filter(tag => tag.isAiGenerated);
  const userTags = postTags.filter(tag => !tag.isAiGenerated);

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await apiRequest("DELETE", `/api/posts/${post.id}/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Tag removed",
        description: "Tag has been removed from this post.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove tag.",
        variant: "destructive",
      });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ tagId, name }: { tagId: number; name: string }) => {
      await apiRequest("PUT", `/api/tags/${tagId}`, { name, pillar });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setEditingTag(null);
      setEditValue("");
      toast({
        title: "Tag updated",
        description: "Tag has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tag.",
        variant: "destructive",
      });
    },
  });

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag.id);
    setEditValue(tag.name);
  };

  const handleSaveEdit = () => {
    if (editingTag && editValue.trim()) {
      updateTagMutation.mutate({ tagId: editingTag, name: editValue.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditValue("");
  };

  const handleRemoveTag = (tagId: number) => {
    removeTagMutation.mutate(tagId);
  };

  return (
    <div>

      
      {/* AI Generated Tags */}
      {aiTags.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-carbon-gray-70 mb-2 flex items-center">
            <Bot className="w-4 h-4 mr-1" />
            AI Generated
          </p>
          <div className="flex flex-wrap gap-2">
            {aiTags.map((tag) => (
              <div key={tag.id} className="inline-flex items-center">
                {bulkEditMode && (
                  <Checkbox
                    checked={selectedTags.has(tag.id)}
                    onCheckedChange={(checked) => {
                      onTagSelection?.(tag.id, checked as boolean);
                    }}
                    className="mr-2"
                  />
                )}
                {editingTag === tag.id ? (
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 text-sm border rounded"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      disabled={updateTagMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 pl-3 pr-1"
                  >
                    {tag.name}
                    {!bulkEditMode && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 h-4 w-4 p-0 hover:text-purple-900"
                          onClick={() => handleEditTag(tag)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 h-4 w-4 p-0 hover:text-purple-900"
                          onClick={() => handleRemoveTag(tag.id)}
                          disabled={removeTagMutation.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* User Added Tags */}
      {userTags.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-carbon-gray-70 mb-2 flex items-center">
            <User className="w-4 h-4 mr-1" />
            User Added
          </p>
          <div className="flex flex-wrap gap-2">
            {userTags.map((tag) => (
              <div key={tag.id} className="inline-flex items-center">
                {bulkEditMode && (
                  <Checkbox
                    checked={selectedTags.has(tag.id)}
                    onCheckedChange={(checked) => {
                      onTagSelection?.(tag.id, checked as boolean);
                    }}
                    className="mr-2"
                  />
                )}
                {editingTag === tag.id ? (
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 text-sm border rounded"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      disabled={updateTagMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 pl-3 pr-1"
                  >
                    {tag.name}
                    {!bulkEditMode && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 h-4 w-4 p-0 hover:text-blue-900"
                          onClick={() => handleEditTag(tag)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 h-4 w-4 p-0 hover:text-blue-900"
                          onClick={() => handleRemoveTag(tag.id)}
                          disabled={removeTagMutation.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      

    </div>
  );
}
