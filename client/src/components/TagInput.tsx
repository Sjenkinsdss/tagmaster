import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TagInputProps {
  pillar: string;
  postId: number;
  placeholder: string;
}

export default function TagInput({ pillar, postId, placeholder }: TagInputProps) {
  const [tagName, setTagName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      // First create the tag
      const response = await apiRequest("POST", "/api/tags", {
        name,
        pillar,
        isAiGenerated: false,
      });
      const tag = await response.json();
      
      // Then associate it with the post
      await apiRequest("POST", `/api/posts/${postId}/tags`, {
        tagId: tag.id,
      });
      
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setTagName("");
      toast({
        title: "Tag created",
        description: "New tag has been created and added to this post.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tag.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagName.trim()) {
      createTagMutation.mutate(tagName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <Input
        type="text"
        placeholder={placeholder}
        value={tagName}
        onChange={(e) => setTagName(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1 text-sm focus:ring-2 focus:ring-carbon-blue focus:border-transparent"
      />
      <Button
        type="submit"
        disabled={!tagName.trim() || createTagMutation.isPending}
        className="bg-carbon-blue hover:bg-carbon-blue/90 text-white"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add
      </Button>
    </form>
  );
}
