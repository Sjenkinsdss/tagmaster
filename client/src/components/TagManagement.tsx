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
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);

  // Merge operation state
  const [mergeData, setMergeData] = useState({
    targetTagName: "",
    newTagName: "",
    pillar: "post" as string,
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
      const response = await apiRequest("POST", "/api/tags/merge", {
        sourceTagIds: selectedTagIds,
        targetTagName: mergeData.targetTagName || mergeData.newTagName,
        newTagName: mergeData.newTagName,
        pillar: mergeData.pillar,
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
      setMergeData({ targetTagName: "", newTagName: "", pillar: "post" });
      toast({
        title: "Tags Merged",
        description: "Successfully merged selected tags.",
      });
    },
    onError: (error: any) => {
      const isReadOnlyError = error.message?.includes("read-only") || error.message?.includes("READONLY_DATABASE");
      toast({
        title: isReadOnlyError ? "Read-Only Database" : "Error",
        description: isReadOnlyError 
          ? "Cannot modify data: Connected to read-only production database."
          : `Failed to merge tags: ${error.message}`,
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
      const isReadOnlyError = error.message?.includes("read-only") || error.message?.includes("READONLY_DATABASE");
      toast({
        title: isReadOnlyError ? "Read-Only Database" : "Error",
        description: isReadOnlyError 
          ? "Cannot modify data: Connected to read-only production database."
          : `Failed to split tag: ${error.message}`,
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
      const isReadOnlyError = error.message?.includes("read-only") || error.message?.includes("READONLY_DATABASE");
      toast({
        title: isReadOnlyError ? "Read-Only Database" : "Error",
        description: isReadOnlyError 
          ? "Cannot modify data: Connected to read-only production database."
          : `Failed to update tag: ${error.message}`,
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
      const isReadOnlyError = error.message?.includes("read-only") || error.message?.includes("READONLY_DATABASE");
      toast({
        title: isReadOnlyError ? "Read-Only Database" : "Error",
        description: isReadOnlyError 
          ? "Cannot modify data: Connected to read-only production database."
          : `Failed to delete tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

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

  // Group tags by type (pillar) and then by category
  const groupedTags = tags.reduce((acc, tag) => {
    const tagType = tag.pillar || 'general';
    
    if (!acc[tagType]) {
      acc[tagType] = {};
    }
    
    // Get category name from tag (assuming it might have tag_type_name or categoryName)
    const categoryName = (tag as any).tag_type_name || (tag as any).categoryName || 'Uncategorized';
    
    if (!acc[tagType][categoryName]) {
      acc[tagType][categoryName] = [];
    }
    
    acc[tagType][categoryName].push(tag);
    return acc;
  }, {} as Record<string, Record<string, TagType[]>>);

  const selectedTagsList = tags.filter(tag => selectedTags.has(tag.id));

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
              <div className="mt-1 p-2 border rounded bg-gray-50 text-sm">
                {selectedTagsList.map(tag => tag.name).join(", ")}
              </div>
            </div>
            
            <div>
              <Label htmlFor="newTagName">New Tag Name</Label>
              <Input
                id="newTagName"
                value={mergeData.newTagName}
                onChange={(e) => setMergeData(prev => ({ ...prev, newTagName: e.target.value }))}
                placeholder="Enter name for merged tag"
              />
            </div>

            <div>
              <Label htmlFor="mergePillar">Category</Label>
              <Select value={mergeData.pillar} onValueChange={(value) => setMergeData(prev => ({ ...prev, pillar: value }))}>
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
                onClick={() => mergeMutation.mutate()}
                disabled={!mergeData.newTagName || mergeMutation.isPending}
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
                  <div key={index} className="flex space-x-2">
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
    </div>
  );
}