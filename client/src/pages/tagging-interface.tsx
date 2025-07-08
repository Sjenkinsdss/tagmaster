import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tags, Users, ShoppingBag, Edit, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PostItem from "@/components/PostItem";
import TagSection from "@/components/TagSection";
import PaidAdItem from "@/components/PaidAdItem";
import type { PostWithTags } from "@shared/schema";

export default function TaggingInterface() {
  const [selectedPost, setSelectedPost] = useState<PostWithTags | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [showCreateAdForm, setShowCreateAdForm] = useState(false);
  const [newAdData, setNewAdData] = useState({
    title: "",
    platform: "",
    thumbnailUrl: "",
  });
  const [campaignFilter, setCampaignFilter] = useState("Summer 2024");
  const [campaignOpen, setCampaignOpen] = useState(false);
  
  // Sample campaign options - in real app this would come from API
  const campaignOptions = [
    "Summer 2024",
    "Fall 2024",
    "Winter 2024",
    "Spring 2025",
    "Holiday Campaign",
    "Back to School",
    "Black Friday",
    "New Year Promotion"
  ];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts"],
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["/api/tags"],
  });

  const productTags = tags.filter((tag: any) => tag.pillar === "product");
  const influencerTags = tags.filter((tag: any) => tag.pillar === "influencer");

  const handleBulkEdit = () => {
    setBulkEditMode(!bulkEditMode);
    setSelectedTags(new Set());
  };

  const handleTagSelection = (tagId: number, isSelected: boolean) => {
    const newSelection = new Set(selectedTags);
    if (isSelected) {
      newSelection.add(tagId);
    } else {
      newSelection.delete(tagId);
    }
    setSelectedTags(newSelection);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (tagIds: number[]) => {
      if (!selectedPost) return;
      
      // Remove tags from the current post
      for (const tagId of tagIds) {
        await apiRequest("DELETE", `/api/posts/${selectedPost.id}/tags/${tagId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setSelectedTags(new Set());
      setBulkEditMode(false);
      toast({
        title: "Tags removed",
        description: `${selectedTags.size} tags have been removed from this post.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove selected tags.",
        variant: "destructive",
      });
    },
  });

  const handleBulkDelete = () => {
    if (selectedTags.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedTags));
    }
  };

  const createAdMutation = useMutation({
    mutationFn: async (adData: {
      title: string;
      platform: string;
      thumbnailUrl?: string;
      postId: number;
      isLinked: boolean;
      status: string;
    }) => {
      const response = await apiRequest("POST", "/api/paid-ads", adData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setShowCreateAdForm(false);
      toast({
        title: "Paid ad created",
        description: "New paid ad has been created and connected to this post.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create paid ad.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAd = (adData: {
    title: string;
    platform: string;
    thumbnailUrl?: string;
  }) => {
    if (!selectedPost) return;
    
    createAdMutation.mutate({
      ...adData,
      postId: selectedPost.id,
      isLinked: true,
      status: "active",
    });
  };

  const handleSubmitNewAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdData.title && newAdData.platform) {
      handleCreateAd(newAdData);
      setNewAdData({ title: "", platform: "", thumbnailUrl: "" });
    }
  };

  const handleCancelCreateAd = () => {
    setShowCreateAdForm(false);
    setNewAdData({ title: "", platform: "", thumbnailUrl: "" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-carbon-gray-10 flex items-center justify-center">
        <div className="text-carbon-gray-70">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon-gray-10">
      {/* Header */}
      <header className="bg-white border-b border-carbon-gray-20 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Tags className="text-carbon-blue text-xl" />
              <h1 className="text-xl font-semibold text-carbon-gray-100">Tagging Interface</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-carbon-gray-70">
              <div className="flex items-center space-x-2">
                <span>Campaign:</span>
                <Popover open={campaignOpen} onOpenChange={setCampaignOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={campaignOpen}
                      className="w-48 justify-between text-sm h-8"
                    >
                      {campaignFilter}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search campaigns..." 
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const inputValue = (e.target as HTMLInputElement).value;
                            if (inputValue && inputValue.trim()) {
                              setCampaignFilter(inputValue.trim());
                              setCampaignOpen(false);
                            }
                          }
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm text-carbon-gray-70">
                            Type and press Enter to create new campaign
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {campaignOptions.map((campaign) => (
                            <CommandItem
                              key={campaign}
                              value={campaign}
                              onSelect={(currentValue) => {
                                setCampaignFilter(currentValue);
                                setCampaignOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  campaignFilter === campaign ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {campaign}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <span>•</span>
              <span>{posts.length} posts</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="h-[calc(100vh-73px)] flex">
        {/* Content Column */}
        <div className="w-1/3 bg-white border-r border-carbon-gray-20 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-carbon-gray-100">Content</h2>
              <Badge variant="secondary" className="text-carbon-gray-70">
                {posts.length} posts
              </Badge>
            </div>
            
            <div className="space-y-6">
              {posts.map((post: PostWithTags) => (
                <PostItem
                  key={post.id}
                  post={post}
                  isSelected={selectedPost?.id === post.id}
                  onSelect={() => setSelectedPost(post)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tagging Column */}
        <div className="w-1/3 bg-white border-r border-carbon-gray-20 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-carbon-gray-100">Tags</h2>
              <div className="flex items-center space-x-2">
                {bulkEditMode && selectedTags.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-carbon-blue">
                      {selectedTags.size} selected
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      Delete Selected
                    </Button>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={bulkEditMode ? "text-red-600" : "text-carbon-blue"}
                  onClick={handleBulkEdit}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {bulkEditMode ? "Cancel" : "Bulk Edit"}
                </Button>
              </div>
            </div>

            {selectedPost ? (
              <div className="space-y-8">
                <TagSection
                  title="Product Tags"
                  icon={<ShoppingBag className="w-5 h-5 text-carbon-blue" />}
                  pillar="product"
                  post={selectedPost}
                  allTags={productTags}
                  bulkEditMode={bulkEditMode}
                  selectedTags={selectedTags}
                  onTagSelection={handleTagSelection}
                />
                
                <TagSection
                  title="Influencer Tags"
                  icon={<Users className="w-5 h-5 text-carbon-blue" />}
                  pillar="influencer"
                  post={selectedPost}
                  allTags={influencerTags}
                  bulkEditMode={bulkEditMode}
                  selectedTags={selectedTags}
                  onTagSelection={handleTagSelection}
                />
              </div>
            ) : (
              <div className="text-center text-carbon-gray-70 mt-12">
                <Tags className="w-12 h-12 mx-auto mb-4 text-carbon-gray-30" />
                <p>Select a post to view and manage tags</p>
              </div>
            )}
          </div>
        </div>

        {/* Connected Paid Ads Column */}
        <div className="w-1/3 bg-white overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-carbon-gray-100">Connected Paid Ads</h2>
              {selectedPost && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-carbon-green bg-carbon-green bg-opacity-10">
                    {selectedPost.paidAds.filter(ad => ad.isLinked).length} linked
                  </Badge>
                  <Badge variant="outline" className="text-carbon-yellow bg-carbon-yellow bg-opacity-10">
                    {selectedPost.paidAds.filter(ad => !ad.isLinked).length} unlinked
                  </Badge>
                </div>
              )}
            </div>

            {selectedPost ? (
              <div className="space-y-4">
                {selectedPost.paidAds.map((ad) => (
                  <PaidAdItem
                    key={ad.id}
                    ad={ad}
                    post={selectedPost}
                  />
                ))}
                
                {selectedPost.paidAds.length === 0 && (
                  <div className="text-center text-carbon-gray-70 mt-12">
                    <div className="w-12 h-12 mx-auto mb-4 bg-carbon-gray-20 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-carbon-gray-50" />
                    </div>
                    <p>No paid ads connected to this post</p>
                  </div>
                )}
                
                <Card className="mt-6 border-2 border-dashed border-carbon-gray-30">
                  <CardContent className="p-4">
                    {!showCreateAdForm ? (
                      <div className="text-center">
                        <Button 
                          variant="ghost" 
                          className="text-carbon-blue"
                          onClick={() => setShowCreateAdForm(true)}
                        >
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Connect New Paid Ad
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitNewAd} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-carbon-gray-90 mb-1">
                            Ad Title
                          </label>
                          <Input
                            type="text"
                            value={newAdData.title}
                            onChange={(e) => setNewAdData({ ...newAdData, title: e.target.value })}
                            placeholder="Enter ad title"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-carbon-gray-90 mb-1">
                            Platform
                          </label>
                          <Select
                            value={newAdData.platform}
                            onValueChange={(value) => setNewAdData({ ...newAdData, platform: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="google">Google Ads</SelectItem>
                              <SelectItem value="twitter">Twitter</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-carbon-gray-90 mb-1">
                            Thumbnail URL (Optional)
                          </label>
                          <Input
                            type="url"
                            value={newAdData.thumbnailUrl}
                            onChange={(e) => setNewAdData({ ...newAdData, thumbnailUrl: e.target.value })}
                            placeholder="https://example.com/thumbnail.jpg"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            type="submit" 
                            className="flex-1"
                            disabled={createAdMutation.isPending}
                          >
                            {createAdMutation.isPending ? "Creating..." : "Create Ad"}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleCancelCreateAd}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center text-carbon-gray-70 mt-12">
                <div className="w-12 h-12 mx-auto mb-4 bg-carbon-gray-20 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-carbon-gray-50" />
                </div>
                <p>Select a post to view connected paid ads</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
