import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tag, Merge, Split, Edit3, Trash2, Settings, Plus, ArrowRight } from "lucide-react";
import type { Tag as TagType } from "@shared/schema";

interface TagManagementProps {
  tags: TagType[];
  onClose: () => void;
}

export default function TagManagement({ tags, onClose }: TagManagementProps) {
  const { toast } = useToast();

  // State declarations first
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  
  // New tag creation state
  const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false);
  const [confirmCreateDialogOpen, setConfirmCreateDialogOpen] = useState(false);
  const [newTagData, setNewTagData] = useState({
    type: "",
    category: "none",
    name: "",
    customCategory: "",
  });
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Merge operation state
  const [mergeData, setMergeData] = useState({
    targetTagName: "",
    newTagName: "",
    type: "post" as string,
    category: "none" as string,
    customCategory: "",
  });
  const [mergeShowCustomCategory, setMergeShowCustomCategory] = useState(false);

  // Fetch all tag categories for general use
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/tag-categories"],
    queryFn: async () => {
      const response = await fetch("/api/tag-categories");
      const data = await response.json();
      return data;
    },
  });

  // Fetch categories filtered by tag type for new tag creation
  const { data: filteredCategoriesData } = useQuery({
    queryKey: ["/api/tag-categories", newTagData.type],
    queryFn: async () => {
      if (!newTagData.type) return { categories: [] };
      const response = await fetch(`/api/tag-categories?tagType=${newTagData.type}`);
      const data = await response.json();
      return data;
    },
    enabled: !!newTagData.type,
  });

  // Fetch categories filtered by tag type for merge operation
  const { data: mergeCategoriesData } = useQuery({
    queryKey: ["/api/tag-categories", mergeData.type, "merge"],
    queryFn: async () => {
      if (!mergeData.type) return { categories: [] };
      const response = await fetch(`/api/tag-categories?tagType=${mergeData.type}`);
      const data = await response.json();
      return data;
    },
    enabled: !!mergeData.type,
  });

  // Split operation state
  const [splitData, setSplitData] = useState({
    newTagNames: [""],
    pillar: "post" as string,
  });

  // Edit operation state
  const [editData, setEditData] = useState({
    name: "",
    pillar: "",
    code: "",
  });

  const handleTagSelection = (tagId: number, isSelected: boolean) => {
    const newSelection = new Set(selectedTags);
    if (isSelected) {
      newSelection.add(tagId);
    } else {
      newSelection.delete(tagId);
    }
    setSelectedTags(newSelection);
  };

  const openMergeDialog = () => {
    if (selectedTags.size < 2) {
      toast({
        title: "Selection Required",
        description: "Please select at least 2 tags to merge.",
        variant: "destructive",
      });
      return;
    }
    setMergeDialogOpen(true);
  };

  const openSplitDialog = (tag: TagType) => {
    setSelectedTag(tag);
    setSplitData({
      newTagNames: [""],
      pillar: tag.pillar,
    });
    setSplitDialogOpen(true);
  };

  const openEditDialog = (tag: TagType) => {
    setSelectedTag(tag);
    setEditData({
      name: tag.name,
      pillar: tag.pillar,
      code: tag.code,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (tag: TagType) => {
    setSelectedTag(tag);
    setDeleteDialogOpen(true);
  };

  // Tag merge mutation
  const mergeMutation = useMutation({
    mutationFn: async () => {
      const selectedTagIds = Array.from(selectedTags);
      const finalCategory = mergeShowCustomCategory && mergeData.customCategory.trim() 
        ? mergeData.customCategory.trim()
        : mergeData.category !== "none" ? mergeData.category : undefined;

      const response = await apiRequest("POST", "/api/tags/merge", {
        sourceTagIds: selectedTagIds,
        targetTagName: mergeData.targetTagName || mergeData.newTagName,
        newTagName: mergeData.newTagName,
        type: mergeData.type,
        category: finalCategory,
        pillar: mergeData.type,  // Use type as pillar for backwards compatibility
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to merge tags");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setMergeDialogOpen(false);
      setSelectedTags(new Set());
      setMergeData({ targetTagName: "", newTagName: "", type: "post", category: "none", customCategory: "" });
      setMergeShowCustomCategory(false);
      toast({
        title: "Tags Merged",
        description: "Successfully merged selected tags.",
      });
    },
    onError: (error: any) => {

      toast({
        title: "Error",
        description: `Failed to merge tags: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Tag split mutation
  const splitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTag) throw new Error("No tag selected");
      const response = await apiRequest("POST", "/api/tags/split", {
        sourceTagId: selectedTag.id,
        newTagNames: splitData.newTagNames.filter(name => name.trim()),
        pillar: splitData.pillar,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to split tag");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setSplitDialogOpen(false);
      setSelectedTag(null);
      setSplitData({ newTagNames: [""], pillar: "post" });
      toast({
        title: "Tag Split",
        description: "Successfully split tag into new tags.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to split tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Tag edit mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTag) throw new Error("No tag selected");
      const response = await apiRequest("PUT", `/api/tags/${selectedTag.id}`, editData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to edit tag");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setEditDialogOpen(false);
      setSelectedTag(null);
      toast({
        title: "Tag Updated",
        description: "Successfully updated tag.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Tag delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTag) throw new Error("No tag selected");
      const response = await apiRequest("DELETE", `/api/tags/${selectedTag.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete tag");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setDeleteDialogOpen(false);
      setSelectedTag(null);
      toast({
        title: "Tag Deleted",
        description: "Successfully deleted tag.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // New tag creation mutation
  const createTagMutation = useMutation({
    mutationFn: async () => {
      const finalCategory = showCustomCategory && newTagData.customCategory.trim() 
        ? newTagData.customCategory.trim()
        : newTagData.category !== "none" ? newTagData.category : undefined;

      const response = await apiRequest("POST", "/api/tags", {
        name: newTagData.name.trim(),
        type: newTagData.type,
        category: finalCategory,
        pillar: newTagData.type,  // Use type as pillar for backwards compatibility
        isAiGenerated: false
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create tag");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setConfirmCreateDialogOpen(false);
      setNewTagData({ type: "", category: "none", name: "", customCategory: "" });
      setShowCustomCategory(false);
      toast({
        title: "Tag Created",
        description: `Successfully created tag "${newTagData.name}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateTag = () => {
    console.log("Create tag clicked with data:", newTagData);
    
    if (!newTagData.type || !newTagData.name.trim()) {
      console.log("Validation failed - missing type or name");
      toast({
        title: "Missing Information",
        description: "Please select a tag type and enter a tag name.",
        variant: "destructive",
      });
      return;
    }

    if (showCustomCategory && !newTagData.customCategory.trim()) {
      console.log("Validation failed - missing custom category");
      toast({
        title: "Missing Information",
        description: "Please enter a custom category name or select an existing one.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Opening confirmation dialog");
    setConfirmCreateDialogOpen(true);
  };

  const confirmCreateTag = () => {
    console.log("Confirming tag creation for:", newTagData, "-> Type:", newTagData.type, "Category:", newTagData.category, "Name:", newTagData.name);
    createTagMutation.mutate();
  };

  const addSplitTagName = () => {
    setSplitData(prev => ({
      ...prev,
      newTagNames: [...prev.newTagNames, ""]
    }));
  };

  const updateSplitTagName = (index: number, value: string) => {
    setSplitData(prev => ({
      ...prev,
      newTagNames: prev.newTagNames.map((name, i) => i === index ? value : name)
    }));
  };

  const removeSplitTagName = (index: number) => {
    setSplitData(prev => ({
      ...prev,
      newTagNames: prev.newTagNames.filter((_, i) => i !== index)
    }));
  };

  // Group tags by type and then by category (three-tier hierarchy)
  const groupedTags = tags.reduce((acc, tag) => {
    // Use the new 'type' field if available, fallback to 'pillar' for backwards compatibility
    const tagType = (tag as any).type || tag.pillar || 'general';
    
    if (!acc[tagType]) {
      acc[tagType] = {};
    }
    
    // Use the new 'category' field if available, otherwise fallback to existing fields
    const categoryName = (tag as any).category || (tag as any).tag_type_name || (tag as any).categoryName || 'Uncategorized';
    
    if (!acc[tagType][categoryName]) {
      acc[tagType][categoryName] = [];
    }
    
    acc[tagType][categoryName].push(tag);
    return acc;
  }, {} as Record<string, Record<string, TagType[]>>);

  const selectedTagsList = tags.filter(tag => selectedTags.has(tag.id));
  const categories = categoriesData?.categories || [];
  
  // Get unique tag types from existing tags
  const tagTypes = Array.from(new Set(tags.map(tag => tag.pillar))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-carbon-blue" />
          <h2 className="text-lg font-semibold text-carbon-gray-100">Advanced Tag Operations</h2>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            Read-Only Production
          </Badge>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* New Tag Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create New Tag</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tag Type Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="tag-type">Tag Type</Label>
              <Select 
                value={newTagData.type} 
                onValueChange={(value) => {
                  setNewTagData(prev => ({ ...prev, type: value, category: "none", customCategory: "" }));
                  setShowCustomCategory(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {tagTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag Category Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="tag-category">Category</Label>
              <Select 
                value={showCustomCategory ? "custom" : newTagData.category} 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomCategory(true);
                    setNewTagData(prev => ({ ...prev, category: "none" }));
                  } else {
                    setShowCustomCategory(false);
                    setNewTagData(prev => ({ ...prev, category: value, customCategory: "" }));
                  }
                }}
                disabled={!newTagData.type}
              >
                <SelectTrigger>
                  <SelectValue placeholder={newTagData.type ? "Select category" : "Select type first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific category</SelectItem>
                  {filteredCategoriesData?.categories?.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name} ({category.tagCount})
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Create new category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Category Input */}
            {showCustomCategory && (
              <div className="space-y-2">
                <Label htmlFor="custom-category">New Category Name</Label>
                <Input
                  id="custom-category"
                  value={newTagData.customCategory}
                  onChange={(e) => setNewTagData(prev => ({ ...prev, customCategory: e.target.value }))}
                  placeholder="Enter new category name"
                />
              </div>
            )}

            {/* Tag Name Input */}
            <div className="space-y-2">
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                value={newTagData.name}
                onChange={(e) => setNewTagData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter tag name"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
              Tags will be saved to the writable database.
            </p>
            <Button 
              onClick={handleCreateTag}
              disabled={
                !newTagData.type || 
                !newTagData.name.trim() || 
                (showCustomCategory && !newTagData.customCategory.trim()) ||
                createTagMutation.isPending
              }
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Tag</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="w-4 h-4" />
            <span>Bulk Operations</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTags.size > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                {selectedTags.size} tags selected:
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedTagsList.map(tag => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openMergeDialog}
              disabled={selectedTags.size < 2}
              className="flex items-center space-x-1"
            >
              <Merge className="w-4 h-4" />
              <span>Merge Tags</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTags(new Set())}
              disabled={selectedTags.size === 0}
            >
              Clear Selection
            </Button>
          </div>

          <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
            Note: Operations will show error messages due to read-only database access.
          </p>
        </CardContent>
      </Card>

      {/* Tag List by Type → Category */}
      <div className="space-y-4">
        {Object.entries(groupedTags)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([typeName, categories]) => {
            const totalTags = Object.values(categories).flat().length;
            
            return (
              <Card key={typeName}>
                <CardHeader>
                  <CardTitle className="capitalize">{typeName} Types ({totalTags})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(categories)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([categoryName, categoryTags]) => (
                        <div key={`${typeName}-${categoryName}`} className="border rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            {categoryName} ({categoryTags.length})
                          </h4>
                          <div className="space-y-2">
                            {categoryTags
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((tag) => (
                                <div
                                  key={tag.id}
                                  className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                                >
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedTags.has(tag.id)}
                                      onChange={(e) => handleTagSelection(tag.id, e.target.checked)}
                                      className="rounded border-gray-300"
                                    />
                                    <div>
                                      <p className="font-medium text-carbon-gray-100">{tag.name}</p>
                                      <p className="text-xs text-carbon-gray-70">{tag.code}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(tag)}
                                      className="text-carbon-blue"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openSplitDialog(tag)}
                                      className="text-green-600"
                                    >
                                      <Split className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteDialog(tag)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Merge className="w-5 h-5" />
              <span>Merge Tags</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Selected Tags ({selectedTags.size})</Label>
              <div className="mt-1 p-2 border rounded bg-gray-50 text-sm space-y-1">
                {selectedTagsList.map(tag => (
                  <div key={`selected-tag-${tag.id}`} className="flex items-center justify-between py-1 border-b border-gray-200 last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium">{tag.name}</div>
                      <div className="text-xs text-gray-500">
                        Type: {(tag as any).type || tag.pillar} • Category: {(tag as any).category || "None"} • Code: {tag.code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="mergeType">Tag Type</Label>
                <Select 
                  value={mergeData.type} 
                  onValueChange={(value) => {
                    setMergeData(prev => ({ ...prev, type: value, category: "none", customCategory: "" }));
                    setMergeShowCustomCategory(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mergeCategory">Category</Label>
                <Select 
                  value={mergeShowCustomCategory ? "custom" : mergeData.category} 
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setMergeShowCustomCategory(true);
                      setMergeData(prev => ({ ...prev, category: "none" }));
                    } else {
                      setMergeShowCustomCategory(false);
                      setMergeData(prev => ({ ...prev, category: value, customCategory: "" }));
                    }
                  }}
                  disabled={!mergeData.type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={mergeData.type ? "Select category" : "Select type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific category</SelectItem>
                    {mergeCategoriesData?.categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name} ({category.tagCount})
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">+ Create new category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mergeShowCustomCategory && (
                <div>
                  <Label htmlFor="mergeCustomCategory">New Category Name</Label>
                  <Input
                    id="mergeCustomCategory"
                    value={mergeData.customCategory}
                    onChange={(e) => setMergeData(prev => ({ ...prev, customCategory: e.target.value }))}
                    placeholder="Enter new category name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="newTagName">Tag Name</Label>
                <Input
                  id="newTagName"
                  value={mergeData.newTagName}
                  onChange={(e) => setMergeData(prev => ({ ...prev, newTagName: e.target.value }))}
                  placeholder="Enter name for merged tag"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => mergeMutation.mutate()}
                disabled={
                  !mergeData.type || 
                  !mergeData.newTagName || 
                  (mergeShowCustomCategory && !mergeData.customCategory.trim()) ||
                  mergeMutation.isPending
                }
                className="flex-1"
              >
                {mergeMutation.isPending ? "Merging..." : "Merge Tags"}
              </Button>
              <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Split className="w-5 h-5" />
              <span>Split Tag</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTag && (
              <div>
                <Label>Source Tag</Label>
                <div className="mt-1 p-2 border rounded bg-gray-50 text-sm">
                  {selectedTag.name}
                </div>
              </div>
            )}
            
            <div>
              <Label>New Tag Names</Label>
              <div className="space-y-2 mt-1">
                {splitData.newTagNames.map((name, index) => (
                  <div key={`split-tag-input-${index}`} className="flex space-x-2">
                    <Input
                      value={name}
                      onChange={(e) => updateSplitTagName(index, e.target.value)}
                      placeholder={`New tag ${index + 1}`}
                    />
                    {splitData.newTagNames.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSplitTagName(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSplitTagName}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Another Tag
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="splitPillar">Category</Label>
              <Select value={splitData.pillar} onValueChange={(value) => setSplitData(prev => ({ ...prev, pillar: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad">Ad</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => splitMutation.mutate()}
                disabled={splitData.newTagNames.filter(name => name.trim()).length === 0 || splitMutation.isPending}
                className="flex-1"
              >
                {splitMutation.isPending ? "Splitting..." : "Split Tag"}
              </Button>
              <Button variant="outline" onClick={() => setSplitDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5" />
              <span>Edit Tag</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Tag Name</Label>
              <Input
                id="editName"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="editPillar">Category</Label>
              <Select value={editData.pillar} onValueChange={(value) => setEditData(prev => ({ ...prev, pillar: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad">Ad</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editCode">Tag Code</Label>
              <Input
                id="editCode"
                value={editData.code}
                onChange={(e) => setEditData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Auto-generated if empty"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => editMutation.mutate()}
                disabled={!editData.name || editMutation.isPending}
                className="flex-1"
              >
                {editMutation.isPending ? "Updating..." : "Update Tag"}
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{selectedTag?.name}"? This action cannot be undone and will remove all associations with posts and ads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Tag Confirmation Dialog */}
      <AlertDialog open={confirmCreateDialogOpen} onOpenChange={setConfirmCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Tag Creation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to create this new tag with the following details?
                <div className="mt-3 p-3 bg-gray-50 rounded border space-y-2">
                  <div><strong>Type:</strong> {newTagData.type}</div>
                  <div><strong>Category:</strong> {
                    showCustomCategory && newTagData.customCategory 
                      ? `${newTagData.customCategory} (new category)`
                      : newTagData.category === "none" ? "No specific category" : newTagData.category
                  }</div>
                  <div><strong>Name:</strong> {newTagData.name}</div>
                  <div className="text-xs text-gray-600">
                    <strong>Auto-generated Code:</strong> {
                      showCustomCategory && newTagData.customCategory
                        ? `${newTagData.type}_${newTagData.customCategory.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${newTagData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_####`
                        : `${newTagData.type}_${newTagData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_####`
                    }
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCreateTag}
              disabled={createTagMutation.isPending}
              className="bg-carbon-blue hover:bg-carbon-blue/90"
            >
              {createTagMutation.isPending ? "Creating..." : "Create Tag"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}