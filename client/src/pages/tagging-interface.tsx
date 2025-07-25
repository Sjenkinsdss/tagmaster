import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tags, Users, ShoppingBag, Edit, Check, ChevronsUpDown, ChevronLeft, ChevronRight, Search, X, Settings, TrendingUp, Menu, ChevronDown, ChevronUp, BarChart3, Palette, Activity } from "lucide-react";
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
import EngagementHeatMap from "@/components/EngagementHeatMap";
import MoodAnalytics from "@/components/MoodAnalytics";
import PlatformAnalyticsDashboard from "@/components/PlatformAnalyticsDashboard";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import { PerformanceBenchmark } from "@/components/PerformanceBenchmark";
import type { PostWithTags } from "@shared/schema";

// Editable Tag Badge Component for AI tags
function EditableTagBadge({ 
  tag, 
  category, 
  postId, 
  onTagModified 
}: { 
  tag: string; 
  category: string; 
  postId: number; 
  onTagModified: (originalTag: string, modifiedTag: string) => void; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tag);
  const { toast } = useToast();

  const saveModification = useMutation({
    mutationFn: async ({ originalTag, modifiedTag }: { originalTag: string; modifiedTag: string }) => {
      const response = await fetch(`/api/posts/${postId}/ai-tags/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          originalTag,
          modifiedTag
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save modification');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag Updated",
        description: "AI tag has been successfully modified",
      });
      onTagModified(tag, editValue);
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save tag modification",
        variant: "destructive",
      });
      setEditValue(tag); // Reset to original value
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    if (editValue.trim() !== tag && editValue.trim() !== '') {
      saveModification.mutate({ originalTag: tag, modifiedTag: editValue.trim() });
    } else {
      setIsEditing(false);
      setEditValue(tag);
    }
  };

  const handleCancel = () => {
    setEditValue(tag);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 bg-blue-50 p-1 rounded">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="text-xs h-6 w-32"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
        />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSave}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancel}>
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer group relative"
      onClick={() => setIsEditing(true)}
    >
      {tag}
      <Edit className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Badge>
  );
}

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
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [heatMapVariant, setHeatMapVariant] = useState<'grid' | 'timeline' | 'compact'>('grid');
  const [heatMapTab, setHeatMapTab] = useState<'heatmap' | 'analytics'>('heatmap');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarContent, setSidebarContent] = useState<'tags' | 'heatmap' | 'analytics' | 'themes' | 'performance' | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for tools configuration to determine what features are enabled
  const { data: toolsConfig } = useQuery({
    queryKey: ["/api/admin/tools-config"],
    queryFn: () => 
      fetch("/api/admin/tools-config")
        .then(res => res.json())
        .then(data => data.tools || []),
    retry: 1,
  });

  // Helper function to check if a tool is enabled
  const isToolEnabled = (toolId: string): boolean => {
    if (!toolsConfig) return true; // Default to enabled if config not loaded
    const tool = toolsConfig.find((t: any) => t.id === toolId);
    return tool ? tool.enabled : true;
  };

  // Helper function to check if any tools are enabled
  const hasEnabledTools = (): boolean => {
    if (!toolsConfig) return true; // Default to enabled if config not loaded
    const toolIds = ['heat-map', 'platform-analytics', 'tag-management', 'theme-customizer', 'performance-benchmark'];
    return toolIds.some(toolId => isToolEnabled(toolId));
  };

  const { data: postsResponse, isLoading, error } = useQuery({
    queryKey: ["/api/posts", currentPage, pageSize, campaignFilter, clientFilter, postIdFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      // Add filter parameters if they are set and not default values
      if (campaignFilter && campaignFilter !== "All Posts") {
        params.append('campaign', campaignFilter);
      }
      if (clientFilter && clientFilter !== "All Clients") {
        params.append('client', clientFilter);
      }
      if (postIdFilter && postIdFilter.trim() !== '') {
        params.append('postId', postIdFilter);
      }
      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery);
      }
      
      console.log("Query params being sent:", params.toString());
      return fetch(`/api/posts?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          console.log("API response:", { totalPosts: data.posts?.length, pagination: data.pagination });
          return data;
        });
    },
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

  // Fetch all campaigns from database
  const { data: allCampaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    staleTime: 0, // Always fetch fresh data to get all available campaigns
  });

  // Generate campaign options from all available campaigns in database
  const campaignOptions = [
    "All Posts",
    ...(allCampaigns?.campaigns && Array.isArray(allCampaigns.campaigns) ? 
      allCampaigns.campaigns.map((c: any) => c.campaign_name).filter(Boolean).sort() : [])
  ];

  // Fetch all clients from database
  const { data: allClients } = useQuery({
    queryKey: ["/api/clients"],
    staleTime: 0, // Always fetch fresh data to get all available clients
  });

  // Generate client options from all available clients in database
  const clientOptions = [
    "All Clients",
    ...(allClients?.clients && Array.isArray(allClients.clients) ? 
      allClients.clients.map((c: any) => c.client_name).filter(Boolean).sort() : [])
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
    queryFn: () => {
      console.log("Fetching ads for selected post:", selectedPost?.id);
      return selectedPost ? fetch(`/api/posts/${selectedPost.id}/ads`).then(res => res.json()) : [];
    },
    enabled: !!selectedPost,
  });
  
  console.log("Connected ads state:", { 
    selectedPostId: selectedPost?.id, 
    connectedAdsCount: connectedAds.length,
    connectedAdsIds: connectedAds.slice(0, 3).map((ad: any) => ad.id) 
  });

  // Fetch tags for the selected post
  const { data: postTags = [] } = useQuery({
    queryKey: ["/api/posts", selectedPost?.id, "tags"],
    queryFn: () => selectedPost ? fetch(`/api/posts/${selectedPost.id}/tags`).then(res => res.json()) : [],
    enabled: !!selectedPost,
  });

  // Fetch AI-based tags for the selected post
  const { data: aiTagsData } = useQuery({
    queryKey: ["/api/posts", selectedPost?.id, "ai-tags"],
    queryFn: async () => {
      if (!selectedPost) return { aiTags: [] };
      const response = await fetch(`/api/posts/${selectedPost.id}/ai-tags`);
      const data = await response.json();
      return data;
    },
    enabled: !!selectedPost,
  });

  const aiTags = aiTagsData?.aiTags || [];

  console.log("AI Tags data:", { 
    selectedPostId: selectedPost?.id,
    aiTagsCount: aiTags.length,
    aiTagsData: aiTags.slice(0, 2) // Show first 2 for debugging
  });

  // Enrich the selected post with tag data
  const enrichedSelectedPost = selectedPost ? {
    ...selectedPost,
    postTags: postTags
  } : null;

  // Remove duplicates by ID (filtering is now done on backend)
  const posts = allPosts.reduce((acc: any[], post: any) => {
    if (!acc.find(p => p.id === post.id)) {
      acc.push(post);
    }
    return acc;
  }, []);

  // Organize tags by production categories
  const categories = (categoriesData as any)?.categories || [];
  
  // Create category-based tag groups
  const getTagsForCategory = (categoryName: string) => {
    return (tags as any[]).filter((tag: any) => tag.tag_type_name === categoryName);
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

  const openSidebar = (content: 'tags' | 'heatmap' | 'analytics' | 'themes') => {
    setSidebarContent(content);
    setSidebarOpen(true);
    if (content === 'tags') {
      setShowTagManagement(true);
      setShowHeatMap(false);
    } else if (content === 'heatmap') {
      setShowHeatMap(true);
      setShowTagManagement(false);
    } else if (content === 'analytics') {
      setShowTagManagement(false);
      setShowHeatMap(false);
    } else if (content === 'themes') {
      setShowTagManagement(false);
      setShowHeatMap(false);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSidebarContent(null);
    setShowTagManagement(false);
    setShowHeatMap(false);
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
      setSelectedPosts(new Set(posts.map((post: any) => post.id)));
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

  // Auto-select first post when filtering results in few posts or specific post ID
  useEffect(() => {
    console.log("Auto-selection check:", { 
      postsLength: allPosts.length, 
      postIdFilter, 
      bulkPostMode, 
      firstPostId: allPosts[0]?.id,
      selectedPostId: selectedPost?.id 
    });
    
    if (allPosts.length === 1 && !bulkPostMode) {
      // Auto-select the only post
      console.log("Auto-selecting single post:", allPosts[0].id);
      setSelectedPost(allPosts[0]);
    } else if (allPosts.length <= 3 && postIdFilter && !bulkPostMode) {
      // Auto-select first post when filtering by post ID
      const targetPost = allPosts.find((p: PostWithTags) => p.id.toString() === postIdFilter);
      if (targetPost) {
        console.log("Auto-selecting target post:", targetPost.id);
        setSelectedPost(targetPost);
      } else if (allPosts.length > 0) {
        console.log("Auto-selecting first post:", allPosts[0].id);
        setSelectedPost(allPosts[0]);
      }
    }
  }, [allPosts, postIdFilter, bulkPostMode]);

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
            tags={tags as any[]} 
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

              {hasEnabledTools() && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex items-center space-x-1 ${sidebarOpen ? 'bg-blue-50 text-blue-600 border-blue-300' : ''}`}
                    >
                      <Menu className="w-4 h-4" />
                      <span>Tools</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-1">
                    {isToolEnabled('heat-map') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sidebarContent === 'heatmap' && sidebarOpen) {
                            closeSidebar();
                          } else {
                            openSidebar('heatmap');
                          }
                        }}
                        className={`w-full justify-start text-sm ${sidebarContent === 'heatmap' && sidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Heat Map
                      </Button>
                    )}
                    {isToolEnabled('platform-analytics') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sidebarContent === 'analytics' && sidebarOpen) {
                            closeSidebar();
                          } else {
                            openSidebar('analytics');
                          }
                        }}
                        className={`w-full justify-start text-sm ${sidebarContent === 'analytics' && sidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Platform Analytics
                      </Button>
                    )}
                    {isToolEnabled('tag-management') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sidebarContent === 'tags' && sidebarOpen) {
                            closeSidebar();
                          } else {
                            openSidebar('tags');
                          }
                        }}
                        className={`w-full justify-start text-sm ${sidebarContent === 'tags' && sidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Tag Management
                      </Button>
                    )}
                    {isToolEnabled('performance-benchmark') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sidebarContent === 'performance' && sidebarOpen) {
                            closeSidebar();
                          } else {
                            openSidebar('performance' as any);
                          }
                        }}
                        className={`w-full justify-start text-sm ${sidebarContent === 'performance' && sidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Performance Benchmark
                      </Button>
                    )}
                    {isToolEnabled('theme-customizer') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sidebarContent === 'themes' && sidebarOpen) {
                            closeSidebar();
                          } else {
                            openSidebar('themes');
                          }
                        }}
                        className={`w-full justify-start text-sm ${sidebarContent === 'themes' && sidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      >
                        <Palette className="w-4 h-4 mr-2" />
                        Theme Customizer
                      </Button>
                    )}
                  </div>
                </PopoverContent>
                </Popover>
              )}
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
                          {clientOptions.map((client: any) => (
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
                          {campaignOptions.map((campaign: any) => (
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

      {/* Main Content with Sidebar */}
      <div className={`${(campaignFilter !== "All Posts" || clientFilter !== "All Clients" || postIdFilter || searchQuery) ? "h-[calc(100vh-115px)]" : "h-[calc(100vh-73px)]"} flex relative`}>
        
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="absolute top-0 right-0 w-96 h-full bg-white border-l border-carbon-gray-20 shadow-lg z-10 overflow-hidden">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-carbon-gray-20">
              <h3 className="text-lg font-semibold text-carbon-gray-100">
                {sidebarContent === 'heatmap' ? '📊 Heat Map & Analytics' : '⚙️ Tag Management'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeSidebar}
                className="text-carbon-gray-50 hover:text-carbon-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Sidebar Content */}
            <div className="h-[calc(100%-4rem)] overflow-y-auto">
              {sidebarContent === 'heatmap' ? (
                <div className="p-4">
                  {/* Heat Map Tab Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={heatMapTab === 'heatmap' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setHeatMapTab('heatmap')}
                        className="text-sm px-4"
                      >
                        📊 Heat Map
                      </Button>
                      <Button
                        variant={heatMapTab === 'analytics' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setHeatMapTab('analytics')}
                        className="text-sm px-4"
                      >
                        🎯 Analytics
                      </Button>
                    </div>
                    
                    {heatMapTab === 'heatmap' && (
                      <Select value={heatMapVariant} onValueChange={(value: 'grid' | 'timeline' | 'compact') => setHeatMapVariant(value)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid</SelectItem>
                          <SelectItem value="timeline">Timeline</SelectItem>
                          <SelectItem value="compact">Compact</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Heat Map Content */}
                  {heatMapTab === 'heatmap' ? (
                    <EngagementHeatMap 
                      posts={posts}
                      selectedPost={selectedPost as any}
                      onPostSelect={(post: any) => setSelectedPost(post)}
                      variant={heatMapVariant}
                    />
                  ) : (
                    <MoodAnalytics posts={posts} />
                  )}
                </div>
              ) : (
                <div className="p-4">
                  {showTagManagement && <TagManagement tags={tags as any[]} onClose={() => setShowTagManagement(false)} />}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Column */}
        <div className={`${sidebarOpen ? 'w-[calc(100%-384px)]' : 'w-1/3'} bg-white border-r border-carbon-gray-20 overflow-y-auto transition-all duration-300`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-carbon-gray-100">Content</h2>
              <div className="flex items-center space-x-2">
                {isToolEnabled('bulk-operations') && bulkPostMode && selectedPosts.size > 0 && (
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
                {isToolEnabled('bulk-operations') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={bulkPostMode ? "text-red-600" : "text-carbon-blue"}
                    onClick={handleBulkPostMode}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {bulkPostMode ? "Cancel" : "Bulk Select"}
                  </Button>
                )}
                <Badge variant="secondary" className="text-carbon-gray-70">
                  {posts.length} posts
                </Badge>
              </div>
            </div>
            
            <div className="space-y-6">
              {posts.map((post: PostWithTags, index: number) => {
                // Create absolutely unique key using multiple factors to prevent any collisions
                // Use a static seed based on post properties to avoid regenerating keys on every render
                const postType = (post.metadata as any)?.ad_type || (post.metadata as any)?.type || 'post';
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
                    bulkMode={isToolEnabled('bulk-operations') && bulkPostMode}
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
        <div className={`${sidebarOpen ? 'w-[calc(50%-192px)]' : 'w-1/3'} bg-white border-r border-carbon-gray-20 overflow-y-auto transition-all duration-300`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-carbon-gray-100">Tags</h2>
              {isToolEnabled('bulk-operations') && (
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
              )}
            </div>

            {enrichedSelectedPost ? (
              <div className="space-y-6">

                {/* AI Tag Recommendations */}
                {isToolEnabled('ai-recommendations') && (
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
                )}
                
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

                  // Group connected post tags by Type → Category → Individual Tags structure
                  const tagsByType = postTags.reduce((acc: any, postTag: any) => {
                    const tag = postTag.tag; // Extract the tag object from the postTag
                    const tagType = tag.type || tag.pillar || 'general';
                    const tagCategory = tag.category || tag.tag_type_name || tag.categoryName || 'Uncategorized';
                    
                    if (!acc[tagType]) {
                      acc[tagType] = {};
                    }
                    if (!acc[tagType][tagCategory]) {
                      acc[tagType][tagCategory] = [];
                    }
                    acc[tagType][tagCategory].push(tag);
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

                  // Display Connected Tags with proper Type → Category → Individual Tags hierarchy
                  const connectedTagsSection = postTags.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="text-xl">🔗</div>
                        <h3 className="font-semibold text-green-700">
                          Connected Tags ({postTags.length})
                        </h3>
                      </div>
                      
                      {sortedTypes.map(type => {
                        const typeCategories = tagsByType[type];
                        const typeTotalTags = Object.values(typeCategories).flat().length;
                        
                        return (
                          <Card key={type} className="p-4 bg-green-50 border-green-200">
                            <div className="flex items-center space-x-2 mb-4">
                              <div className="text-xl">{getTypeEmoji(type)}</div>
                              <h3 className="font-semibold text-green-800 capitalize">
                                {type} Tags ({typeTotalTags})
                              </h3>
                            </div>
                            
                            <div className="space-y-3 ml-6">
                              {Object.entries(typeCategories)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([categoryName, categoryTags]: [string, any]) => (
                                  <div key={categoryName}>
                                    <h4 className="font-medium text-sm text-green-700 mb-2">
                                      {categoryName} ({categoryTags.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-2 ml-4">
                                      {categoryTags
                                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                        .map((tag: any, tagIndex: number) => (
                                          <div key={`${type}-${categoryName}-${tag.id}-${tagIndex}`} className="flex items-center space-x-1">
                                            {bulkEditMode && (
                                              <Checkbox
                                                checked={selectedTags.has(tag.id)}
                                                onCheckedChange={(checked) => {
                                                  const newSelected = new Set(selectedTags);
                                                  if (checked) {
                                                    newSelected.add(tag.id);
                                                  } else {
                                                    newSelected.delete(tag.id);
                                                  }
                                                  setSelectedTags(newSelected);
                                                }}
                                              />
                                            )}
                                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                                              {tag.name}
                                            </Badge>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                ))}
                            </div>
                            
                            {/* Add tag dropdown section for this specific tag type */}
                            <div className="border-t border-green-200 pt-4 mt-4">
                              <TypeTagSection
                                key={`add-${type}`}
                                type={type}
                                emoji={getTypeEmoji(type)}
                                tags={[]} // No existing tags shown here, just the add functionality
                                selectedPost={enrichedSelectedPost}
                                onTagAdded={() => {
                                  // Refresh posts and tags after adding a tag
                                  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
                                }}
                                showOnlyAddSection={true}
                                aiTags={aiTags}
                              />
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  );



                  return connectedTagsSection;
                })()}

                {/* Show info if no connected tags are loaded yet, but show empty green sections for each tag type */}
                {postTags.length === 0 && selectedPost && (
                  <div className="space-y-4">
                    {['ad', 'campaign', 'client', 'post', 'influencer', 'product', 'general'].map(type => (
                      <Card key={type} className="p-4 bg-green-50 border-green-200">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="text-xl">{(() => {
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
                          })()}</div>
                          <h3 className="font-semibold text-green-800 capitalize">
                            {type} Tags (0)
                          </h3>
                        </div>
                        
                        <p className="text-sm text-green-600 mb-4">No {type} tags connected to this post</p>
                        
                        {/* Add tag dropdown section for this specific tag type */}
                        <div className="border-t border-green-200 pt-4 mt-4">
                          <TypeTagSection
                            key={`add-${type}`}
                            type={type}
                            emoji={(() => {
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
                            })()}
                            tags={[]} // No existing tags shown here, just the add functionality
                            selectedPost={selectedPost}
                            onTagAdded={() => {
                              // Refresh posts and tags after adding a tag
                              queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
                            }}
                            showOnlyAddSection={true}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Show info if no post is selected */}
                {!selectedPost && (
                  <div className="text-center text-carbon-gray-70 py-8">
                    <Tags className="w-12 h-12 mx-auto mb-4 text-carbon-gray-30" />
                    <p>Select a post to view and manage tags</p>
                  </div>
                )}

              </div>
            ) : isToolEnabled('bulk-operations') && bulkPostMode && selectedPosts.size > 0 ? (
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
                    const tagsByType = (tags as any[]).reduce((acc: any, tag: any) => {
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
                        "ai-based": "🖥️",
                        product: "🛍️",
                        general: "🏷️"
                      };
                      return emojiMap[type.toLowerCase()] || "🏷️";
                    };

                    const typeOrder = ['ad', 'campaign', 'client', 'post', 'ai', 'influencer', 'ai-based', 'product', 'general'];
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
        <div className={`${sidebarOpen ? 'w-[calc(50%-192px)]' : 'w-1/3'} bg-white overflow-y-auto transition-all duration-300`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-carbon-gray-100">Connected Paid Ads</h2>
              {selectedPost && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-carbon-green bg-carbon-green bg-opacity-10">
                    {connectedAds.filter((ad: any) => ad.isLinked).length} linked
                  </Badge>
                  <Badge variant="outline" className="text-carbon-yellow bg-carbon-yellow bg-opacity-10">
                    {connectedAds.filter((ad: any) => !ad.isLinked).length} unlinked
                  </Badge>
                </div>
              )}
            </div>

            {selectedPost ? (
              <div className="space-y-4">
                {connectedAds.map((ad: any, adIndex: any) => {
                  // Create unique key for connected ads section - use different prefix than main posts
                  const adHashSeed = `${ad.id}_${selectedPost?.id}_${adIndex}`.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                  }, 0);
                  return (
                    <PaidAdItem
                      key={`connectedAd_${ad.id}_${selectedPost?.id}_${adIndex}_${Math.abs(adHashSeed)}`}
                      ad={ad}
                      post={enrichedSelectedPost!}
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
      
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeSidebar}
          />
          
          {/* Sidebar Content */}
          <div 
            className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden"
            style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  {sidebarContent === 'tags' && 'Tag Management'}
                  {sidebarContent === 'heatmap' && 'Heat Map & Analytics'}
                  {sidebarContent === 'analytics' && 'Platform Analytics'}
                  {sidebarContent === 'performance' && 'Performance Benchmark'}
                  {sidebarContent === 'themes' && 'Theme Customizer'}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={closeSidebar}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto">
                {sidebarContent === 'tags' && showTagManagement && (
                  <div className="p-4">
                    <TagManagement 
                      tags={tags as any[]}
                      onClose={closeSidebar}
                    />
                  </div>
                )}
                
                {sidebarContent === 'heatmap' && showHeatMap && (
                  <div className="p-4">
                    {heatMapTab === 'heatmap' ? (
                      <EngagementHeatMap 
                        posts={posts} 
                        variant={heatMapVariant}
                      />
                    ) : (
                      <MoodAnalytics 
                        posts={posts}
                      />
                    )}
                  </div>
                )}

                {sidebarContent === 'analytics' && (
                  <div className="p-4">
                    <PlatformAnalyticsDashboard posts={posts} />
                  </div>
                )}

                {sidebarContent === 'performance' && (
                  <div className="p-4">
                    <PerformanceBenchmark />
                  </div>
                )}

                {sidebarContent === 'themes' && (
                  <div className="p-4">
                    <ThemeCustomizer onClose={closeSidebar} />
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              {sidebarContent === 'heatmap' && (
                <div className="border-t bg-gray-50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex bg-white rounded-lg p-1 border">
                      <Button
                        variant={heatMapTab === 'heatmap' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setHeatMapTab('heatmap')}
                        className="text-xs px-3 py-1"
                      >
                        📊 Heat Map
                      </Button>
                      <Button
                        variant={heatMapTab === 'analytics' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setHeatMapTab('analytics')}
                        className="text-xs px-3 py-1"
                      >
                        🎯 Analytics
                      </Button>
                    </div>
                  </div>
                  
                  {heatMapTab === 'heatmap' && (
                    <div className="flex justify-center">
                      <div className="flex bg-white rounded-lg p-1 border">
                        <Button
                          variant={heatMapVariant === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setHeatMapVariant('grid')}
                          className="text-xs px-2 py-1"
                        >
                          Grid
                        </Button>
                        <Button
                          variant={heatMapVariant === 'timeline' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setHeatMapVariant('timeline')}
                          className="text-xs px-2 py-1"
                        >
                          Timeline
                        </Button>
                        <Button
                          variant={heatMapVariant === 'compact' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setHeatMapVariant('compact')}
                          className="text-xs px-2 py-1"
                        >
                          Compact
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Interactive Content Guide Notification */}
      <InteractionGuideNotification />
    </div>
  );
}
