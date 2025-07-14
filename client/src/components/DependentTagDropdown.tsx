import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Layers } from "lucide-react";

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
}

interface DependentTagDropdownProps {
  onTagSelect: (tag: TagByCategory) => void;
  selectedPost?: any;
}

export default function DependentTagDropdown({ onTagSelect, selectedPost }: DependentTagDropdownProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/tag-categories"],
    queryFn: async () => {
      const response = await fetch("/api/tag-categories");
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

  // Reset tag selection when category changes
  useEffect(() => {
    setSelectedTagId("");
  }, [selectedCategoryId]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTagId(tagId);
    const selectedTag = tagsData?.tags?.find((tag: TagByCategory) => tag.id.toString() === tagId);
    if (selectedTag) {
      onTagSelect(selectedTag);
    }
  };

  const handleAddTag = () => {
    if (selectedTagId && tagsData?.tags) {
      const selectedTag = tagsData.tags.find((tag: TagByCategory) => tag.id.toString() === selectedTagId);
      if (selectedTag) {
        onTagSelect(selectedTag);
        // Reset selections after adding
        setSelectedCategoryId("");
        setSelectedTagId("");
      }
    }
  };

  const categories = categoriesData?.categories || [];
  const tags = tagsData?.tags || [];
  const selectedCategory = categories.find((cat: Category) => cat.id.toString() === selectedCategoryId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Layers className="w-5 h-5" />
          <span>Add Tags by Category</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedPost && (
          <div className="text-sm text-carbon-gray-70 bg-yellow-50 p-3 rounded border">
            Select a post first to add tags
          </div>
        )}
        
        {/* Category Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-carbon-gray-100">
            1. Select Category
          </label>
          <Select 
            value={selectedCategoryId} 
            onValueChange={handleCategoryChange}
            disabled={!selectedPost || categoriesLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Choose a category"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{category.name}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {category.tagCount} tags
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-carbon-gray-100">
            2. Select Tag
          </label>
          <Select 
            value={selectedTagId} 
            onValueChange={handleTagChange}
            disabled={!selectedCategoryId || tagsLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue 
                placeholder={
                  !selectedCategoryId 
                    ? "Select a category first" 
                    : tagsLoading 
                      ? "Loading tags..." 
                      : `Choose from ${selectedCategory?.name || ""} tags`
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {tags.map((tag: TagByCategory) => (
                <SelectItem key={tag.id} value={tag.id.toString()}>
                  <div className="flex items-center">
                    <Tag className="w-3 h-3 mr-2" />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add Button */}
        <Button 
          onClick={handleAddTag}
          disabled={!selectedTagId || !selectedPost}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tag to Post
        </Button>

        {/* Preview */}
        {selectedCategory && selectedTagId && (
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-xs font-medium text-blue-800 mb-1">Preview:</div>
            <div className="text-sm text-blue-700">
              {selectedCategory.name} → {tags.find((t: TagByCategory) => t.id.toString() === selectedTagId)?.name}
            </div>
          </div>
        )}

        {/* Categories Info */}

      </CardContent>
    </Card>
  );
}