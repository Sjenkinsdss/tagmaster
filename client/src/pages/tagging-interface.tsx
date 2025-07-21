import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tags, Users, ShoppingBag, Edit, Check, ChevronsUpDown, ChevronLeft, ChevronRight, Search, X, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PostItem from "@/components/PostItem";
import TagSection from "@/components/TagSection";
import PaidAdItem from "@/components/PaidAdItem";
import TagManagement from "@/components/TagManagement";
import DependentTagDropdown from "@/components/DependentTagDropdown";
import TagRecommendations from "@/components/TagRecommendations";
import TypeTagSection from "@/components/TypeTagSection";
import { InteractionHelpPanel } from "@/components/InteractionHelpPanel";
import { InteractionGuideNotification } from "@/components/InteractionGuideNotification";
import LoadingSpinner from "@/components/LoadingSpinner";
import LoadingOverlay from "@/components/LoadingOverlay";
import SkeletonLoader from "@/components/SkeletonLoader";
import type { PostWithTags } from "@shared/schema";

export default function TaggingInterface() {
  const [selectedPost, setSelectedPost] = useState<PostWithTags | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [bulkPostMode, setBulkPostMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [showCreateAdForm, setShowCreateAdForm] = useState(false);
  const [newAdData, setNewAdData] = useState({
    title: "",
    platform: "",
    thumbnailUrl: "",
  });
  const [campaignFilter, setCampaignFilter] = useState("All Posts");
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [clientOpen, setClientOpen] = useState(false);
  const [postIdFilter, setPostIdFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showTagManagement, setShowTagManagement] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: postsResponse, isLoading, error } = useQuery({
    queryKey: ["/api/posts", currentPage, pageSize],
    queryFn: () => 
      fetch(`/api/posts?page=${currentPage}&limit=${pageSize}`)
        .then(res => res.json()),
    retry: 3,
    retryDelay: 1000,
  });

  const allPosts = postsResponse?.posts || [];
  const pagination = postsResponse?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Generate campaign options dynamically from actual API data
  const campaignOptions = [
    "All Posts",
    ...Array.from(new Set(allPosts.map((post: any) => post.campaignName).filter(Boolean))).sort()
  ];

  // Generate client options dynamically from actual API data
  const clientOptions = [
    "All Clients",
    ...Array.from(new Set(allPosts.map((post: any) => post.metadata?.clientName).filter(Boolean))).sort()
  ];

  const { data: tags = [], error: tagsError } = useQuery({
    queryKey: ["/api/tags"],
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch tag categories for organization
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/tag-categories"],
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch connected ads for the selected post
  const { data: connectedAds = [] } = useQuery({
    queryKey: ["/api/posts", selectedPost?.id, "ads"],
    queryFn: () => selectedPost ? fetch(`/api/posts/${selectedPost.id}/ads`).then(res => res.json()) : [],
    enabled: !!selectedPost,
  });

  // Fetch tags for the selected post
  const { data: postTags = [] } = useQuery({
    queryKey: ["/api/posts", selectedPost?.id, "tags"],
    queryFn: () => selectedPost ? fetch(`/api/posts/${selectedPost.id}/tags`).then(res => res.json()) : [],
    enabled: !!selectedPost,
  });

  // Enrich the selected post with tag data
  const enrichedSelectedPost = selectedPost ? {
    ...selectedPost,
    postTags: postTags
  } : null;

  // Remove duplicates by ID and filter posts
  const uniquePosts = allPosts.reduce((acc: any[], post: any) => {
    if (!acc.find(p => p.id === post.id)) {
      acc.push(post);
    }
    return acc;
  }, []);

  // Filter posts based on all criteria
  const posts = uniquePosts.filter((post: any) => {
    // Campaign filter
    const campaignMatch = campaignFilter === "All Posts" || post.campaignName === campaignFilter;
    
    // Client filter
    const postClientName = post.metadata?.clientName || 'Other';
    const clientMatch = clientFilter === "All Clients" || postClientName === clientFilter;
    
    // Post ID filter
    const postIdMatch = !postIdFilter || post.id.toString().includes(postIdFilter);
    
    // Search filter (searches through title and content)
    const searchMatch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.metadata?.content?.toLowerCase().includes(searchQuery.toLowerCase());

    return campaignMatch && clientMatch && postIdMatch && searchMatch;
  });

  // Organize tags by production categories
  const categories = categoriesData?.categories || [];
  
  // Create category-based tag groups
  const getTagsForCategory = (categoryName: string) => {
    return tags.filter((tag: any) => tag.tag_type_name === categoryName);
  };

  // Get the most relevant categories for display (limit to top 8 most common)
  const displayCategories = categories
    .sort((a: any, b: any) => parseInt(b.tagCount) - parseInt(a.tagCount))
    .slice(0, 8);

  // Create icon mapping for different category types
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('category') || name.includes('niche') || name.includes('topic')) {
      return <Tags className="w-5 h-5 text-carbon-blue" />;
    } else if (name.includes('client') || name.includes('brand')) {
      return <ShoppingBag className="w-5 h-5 text-carbon-blue" />;
    } else if (name.includes('influencer') || name.includes('people') || name.includes('audience')) {
      return <Users className="w-5 h-5 text-carbon-blue" />;
    } else {
      return <Tags className="w-5 h-5 text-carbon-blue" />;
    }
  };

  const handleBulkEdit = () => {
    setBulkEditMode(!bulkEditMode);
    setSelectedTags(new Set());
  };

  const handleBulkPostMode = () => {
    setBulkPostMode(!bulkPostMode);
    setSelectedPosts(new Set());
    setSelectedPost(null);
  };

  const handlePostSelection = (postId: number, isSelected: boolean) => {
    const newSelection = new Set(selectedPosts);
    if (isSelected) {
      newSelection.add(postId);
    } else {
      newSelection.delete(postId);
    }
    setSelectedPosts(newSelection);
  };

  const handleSelectAllPosts = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map(post => post.id)));
    }
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

  // Bulk tag application mutation
  const bulkTagApplicationMutation = useMutation({
    mutationFn: async ({ tagId, postIds }: { tagId: number; postIds: number[] }) => {
      // Apply tag to all selected posts using Replit database endpoint
      for (const postId of postIds) {
        const response = await apiRequest("POST", `/api/posts/${postId}/tags/${tagId}/replit`, {});
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to apply tag");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      // Invalidate selected post tags if we have one selected
      if (selectedPost) {
        queryClient.invalidateQueries({ queryKey: ["/api/posts", selectedPost.id, "tags"] });
      }
      toast({
        title: "Tags applied",
        description: `Tag has been applied to ${selectedPosts.size} posts in Replit database.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to apply tag to selected posts: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleBulkTagApplication = (tagId: number, pillar: string) => {
    if (selectedPosts.size > 0) {
      bulkTagApplicationMutation.mutate({
        tagId,
        postIds: Array.from(selectedPosts)
      });
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
      <div className="min-h-screen bg-carbon-gray-10">
        <LoadingOverlay 
          isLoading={true}
          variant="influencer"
          message="Loading social media content and tags..."
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            <div className="lg:col-span-1">
              <SkeletonLoader variant="post" count={3} />
            </div>
            <div className="lg:col-span-1">
              <SkeletonLoader variant="tag" count={6} />
            </div>
            <div className="lg:col-span-1">
              <SkeletonLoader variant="ad" count={4} />
            </div>
          </div>
        </LoadingOverlay>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-carbon-gray-10 flex items-center justify-center">
        <div className="text-red-600">Error loading posts: {error.message}</div>
      </div>
    );
  }

  if (showTagManagement) {
    return (
      <div className="min-h-screen bg-carbon-gray-10">
        <div className="p-6">
          <TagManagement 
            tags={tags} 
            onClose={() => setShowTagManagement(false)} 
          />
        </div>
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
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                Read-Only Production
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowTagManagement(true)}
                className="flex items-center space-x-1"
              >
                <Settings className="w-4 h-4" />
                <span>Tag Management</span>
              </Button>
              <InteractionHelpPanel />
            </div>
            <div className="flex items-center space-x-4 text-sm text-carbon-gray-70">
              {/* Search Input */}
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-carbon-gray-50" />
                <div className="relative">
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1); // Reset to page 1 when searching
                      setSelectedPost(null);
                    }}
                    className="w-48 h-8 text-sm pr-8"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedPost(null);
                      }}
                      className="absolute right-1 top-0 h-8 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span>Campaign:</span>
                <Popover open={campaignOpen} onOpenChange={setCampaignOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={campaignOpen}
                      className="w-56 justify-between text-sm h-8"
                    >
                      <span className="truncate">{campaignFilter}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search campaigns..." 
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm text-carbon-gray-70">
                            No campaigns found
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
                                // Clear selected post when switching campaigns
                                setSelectedPost(null);
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
              <div className="flex items-center space-x-2">
                <span>Client:</span>
                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientOpen}
                      className="w-40 justify-between text-sm h-8"
                    >
                      <span className="truncate">{clientFilter}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search clients..." 
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm text-carbon-gray-70">
                            No clients found
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {clientOptions.map((client) => (
                            <CommandItem
                              key={client}
                              value={client}
                              onSelect={(currentValue) => {
                                setClientFilter(currentValue);
                                setClientOpen(false);
                                // Clear selected post when switching clients
                                setSelectedPost(null);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  clientFilter === client ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {client}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center space-x-2">
                <span>Post ID:</span>
                <Input
                  placeholder="1378685242..."
                  value={postIdFilter}
                  onChange={(e) => {
                    setPostIdFilter(e.target.value);
                    // Clear selected post when filtering
                    setSelectedPost(null);
                  }}
                  className="w-32 h-8 text-sm"
                />
                {postIdFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPostIdFilter("");
                      setSelectedPost(null);
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Active Filters Indicator */}
      {(campaignFilter !== "All Posts" || clientFilter !== "All Clients" || postIdFilter || searchQuery) && (
        <div className="bg-carbon-blue bg-opacity-10 border-b border-carbon-blue border-opacity-20 px-6 py-2">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-carbon-blue font-medium">Active Filters:</span>
            {searchQuery && (
              <Badge variant="outline" className="text-carbon-blue border-carbon-blue">
                Search: "{searchQuery}"
              </Badge>
            )}
            {campaignFilter !== "All Posts" && (
              <Badge variant="outline" className="text-carbon-blue border-carbon-blue">
                Campaign: {campaignFilter}
              </Badge>
            )}
            {clientFilter !== "All Clients" && (
              <Badge variant="outline" className="text-carbon-blue border-carbon-blue">
                Client: {clientFilter}
              </Badge>
            )}
            {postIdFilter && (
              <Badge variant="outline" className="text-carbon-blue border-carbon-blue">
                Post ID: {postIdFilter}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCampaignFilter("All Posts");
                setClientFilter("All Clients");
                setPostIdFilter("");
                setSearchQuery("");
                setSelectedPost(null);
              }}
              className="text-carbon-blue hover:bg-carbon-blue hover:text-white h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${(campaignFilter !== "All Posts" || clientFilter !== "All Clients" || postIdFilter || searchQuery) ? "h-[calc(100vh-115px)]" : "h-[calc(100vh-73px)]"} flex`}>
        {/* Content Column */}
        <div className="w-1/3 bg-white border-r border-carbon-gray-20 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-carbon-gray-100">Content</h2>
              <div className="flex items-center space-x-2">
                {bulkPostMode && selectedPosts.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-carbon-blue">
                      {selectedPosts.size} selected
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-carbon-blue hover:bg-carbon-blue hover:text-white"
                      onClick={handleSelectAllPosts}
                    >
                      {selectedPosts.size === posts.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={bulkPostMode ? "text-red-600" : "text-carbon-blue"}
                  onClick={handleBulkPostMode}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {bulkPostMode ? "Cancel" : "Bulk Select"}
                </Button>
                <Badge variant="secondary" className="text-carbon-gray-70">
                  {posts.length} posts
                </Badge>
              </div>
            </div>
            
            <div className="space-y-6">
              {posts.map((post: PostWithTags, index: number) => {
                // Create absolutely unique key using multiple factors to prevent any collisions
                // Use a static seed based on post properties to avoid regenerating keys on every render
                const postType = post.metadata?.ad_type || post.metadata?.type || 'post';
                const timestamp = post.createdAt instanceof Date ? post.createdAt.getTime() : new Date(post.createdAt).getTime();
                const hashSeed = `${post.id}_${post.platform}_${timestamp}`.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                const uniqueKey = `post_${postType}_${post.id}_${index}_${currentPage}_${Math.abs(hashSeed)}`;
                
                return (
                  <PostItem
                    key={uniqueKey}
                    post={post}
                    isSelected={selectedPost?.id === post.id}
                    onSelect={() => !bulkPostMode && setSelectedPost(post)}
                    bulkMode={bulkPostMode}
                    isBulkSelected={selectedPosts.has(post.id)}
                    onBulkSelect={(isSelected) => handlePostSelection(post.id, isSelected)}
                  />
                );
              })}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-carbon-gray-70">
                      Page {pagination.currentPage} of {pagination.totalPages} 
                      ({pagination.totalPosts} total posts)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={pageSize.toString()} 
                      onValueChange={(value) => {
                        setPageSize(parseInt(value));
                        setCurrentPage(1); // Reset to page 1 when changing page size
                      }}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={!pagination.hasPreviousPage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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

            {enrichedSelectedPost ? (
              <div className="space-y-6">

                {/* AI Tag Recommendations */}
                <TagRecommendations
                  selectedPost={enrichedSelectedPost}
                  onTagSelect={(tag) => {
                    toast({
                      title: "Tag Selected from AI",
                      description: `AI recommended "${tag.name}" - adding to post`,
                    });
                    // Note: In read-only mode, this is just for demonstration
                    // In a writable database, you would call the API to add the tag
                  }}
                />
                
                {/* Display tags grouped by type */}
                {(() => {
                  const getTypeEmoji = (type: string): string => {
                    const emojiMap: { [key: string]: string } = {
                      ad: "📢",
                      campaign: "🎯",
                      client: "🏢",
                      post: "📝",
                      ai: "🤖",
                      influencer: "👤",
                      product: "🛍️",
                      general: "🏷️"
                    };
                    return emojiMap[type.toLowerCase()] || "🏷️";
                  };

                  // Group connected post tags by type first
                  const tagsByType = postTags.reduce((acc: any, postTag: any) => {
                    const tag = postTag.tag; // Extract the tag object from the postTag
                    const tagType = tag.type || tag.pillar || 'general';
                    if (!acc[tagType]) {
                      acc[tagType] = [];
                    }
                    acc[tagType].push(tag);
                    return acc;
                  }, {});

                  const typeOrder = ['ad', 'campaign', 'client', 'post', 'ai', 'influencer', 'product', 'general'];
                  const sortedTypes = Object.keys(tagsByType).sort((a, b) => {
                    const aIndex = typeOrder.indexOf(a);
                    const bIndex = typeOrder.indexOf(b);
                    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                  });

                  return sortedTypes.map(type => (
                    <TypeTagSection
                      key={type}
                      type={type}
                      emoji={getTypeEmoji(type)}
                      tags={tagsByType[type]}
                      selectedPost={enrichedSelectedPost}
                      onTagAdded={() => {
                        // Refresh posts and tags after adding a tag
                        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
                      }}
                    />
                  ));
                })()}

                {/* Show info if no connected tags are loaded yet */}
                {postTags.length === 0 && (
                  <div className="text-center text-carbon-gray-70 py-8">
                    <Tags className="w-12 h-12 mx-auto mb-4 text-carbon-gray-30" />
                    <p>No tags connected to this post</p>
                  </div>
                )}

              </div>
            ) : bulkPostMode && selectedPosts.size > 0 ? (
              <div className="space-y-6">
                <div className="text-center">
                  <Tags className="w-12 h-12 mx-auto mb-4 text-carbon-blue" />
                  <h3 className="text-lg font-semibold text-carbon-gray-100 mb-2">
                    Bulk Tag Operations
                  </h3>
                  <p className="text-sm text-carbon-gray-70 mb-2">
                    Apply tags to {selectedPosts.size} selected posts
                  </p>
                  <p className="text-xs text-green-600 mb-6 bg-green-50 p-2 rounded">
                    Note: Bulk operations save to Replit database for testing purposes.
                  </p>
                </div>
                
                {/* Bulk Tag Application Interface with Three-Tier Hierarchy */}
                <div className="space-y-4">
                  {(() => {
                    // Group all tags by type first (using the same logic as connected tags)
                    const tagsByType = tags.reduce((acc: any, tag: any) => {
                      const tagType = tag.type || tag.pillar || 'general';
                      if (!acc[tagType]) {
                        acc[tagType] = {};
                      }
                      
                      // Group by category within type
                      const tagCategory = tag.category || tag.tag_type_name || 'Uncategorized';
                      if (!acc[tagType][tagCategory]) {
                        acc[tagType][tagCategory] = [];
                      }
                      acc[tagType][tagCategory].push(tag);
                      return acc;
                    }, {});

                    const getTypeEmoji = (type: string) => {
                      const emojiMap: { [key: string]: string } = {
                        ad: "📢",
                        campaign: "🎯", 
                        client: "🏢",
                        post: "📝",
                        ai: "🤖",
                        influencer: "👤",
                        product: "🛍️",
                        general: "🏷️"
                      };
                      return emojiMap[type.toLowerCase()] || "🏷️";
                    };

                    const typeOrder = ['ad', 'campaign', 'client', 'post', 'ai', 'influencer', 'product', 'general'];
                    const sortedTypes = Object.keys(tagsByType).sort((a, b) => {
                      const aIndex = typeOrder.indexOf(a);
                      const bIndex = typeOrder.indexOf(b);
                      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                      if (aIndex === -1) return 1;
                      if (bIndex === -1) return -1;
                      return aIndex - bIndex;
                    });

                    return sortedTypes.map(type => {
                      const typeCategories = tagsByType[type];
                      const typeTotalTags = Object.values(typeCategories).flat().length;
                      
                      return (
                        <Card key={type} className="p-4 bg-gray-50">
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="text-xl">{getTypeEmoji(type)}</div>
                            <h3 className="font-semibold text-carbon-gray-100 capitalize">
                              {type} Tags ({typeTotalTags})
                            </h3>
                          </div>
                          
                          <div className="space-y-3 ml-6">
                            {Object.entries(typeCategories)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([categoryName, categoryTags]: [string, any]) => (
                                <div key={categoryName}>
                                  <h4 className="font-medium text-sm text-carbon-gray-80 mb-2">
                                    {categoryName} ({categoryTags.length})
                                  </h4>
                                  <div className="flex flex-wrap gap-2 ml-4">
                                    {categoryTags
                                      .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                      .map((tag: any) => (
                                        <Button
                                          key={tag.id}
                                          variant="outline"
                                          size="sm"
                                          className="text-xs h-7 px-2 bg-white hover:bg-green-50 hover:border-green-300"
                                          onClick={() => handleBulkTagApplication(tag.id, type)}
                                        >
                                          {tag.name}
                                        </Button>
                                      ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </Card>
                      );
                    });
                  })()}
                </div>
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
                    {connectedAds.filter(ad => ad.isLinked).length} linked
                  </Badge>
                  <Badge variant="outline" className="text-carbon-yellow bg-carbon-yellow bg-opacity-10">
                    {connectedAds.filter(ad => !ad.isLinked).length} unlinked
                  </Badge>
                </div>
              )}
            </div>

            {selectedPost ? (
              <div className="space-y-4">
                {connectedAds.map((ad, adIndex) => {
                  // Create unique key for connected ads section - use different prefix than main posts
                  const adHashSeed = `${ad.id}_${selectedPost?.id}_${adIndex}`.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                  }, 0);
                  return (
                    <PaidAdItem
                      key={`connectedAd_${ad.id}_${selectedPost?.id}_${adIndex}_${Math.abs(adHashSeed)}`}
                      ad={ad}
                      post={enrichedSelectedPost}
                    />
                  );
                })}
                
                {connectedAds.length === 0 && (
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
      
      {/* Interactive Content Guide Notification */}
      <InteractionGuideNotification />
    </div>
  );
}
