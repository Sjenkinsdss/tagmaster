import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tags, Users, ShoppingBag, Edit } from "lucide-react";
import PostItem from "@/components/PostItem";
import TagSection from "@/components/TagSection";
import PaidAdItem from "@/components/PaidAdItem";
import type { PostWithTags } from "@shared/schema";

export default function TaggingInterface() {
  const [selectedPost, setSelectedPost] = useState<PostWithTags | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts"],
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["/api/tags"],
  });

  const productTags = tags.filter((tag: any) => tag.pillar === "product");
  const influencerTags = tags.filter((tag: any) => tag.pillar === "influencer");

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
              <span>Campaign: Summer 2024</span>
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
              <Button variant="ghost" size="sm" className="text-carbon-blue">
                <Edit className="w-4 h-4 mr-1" />
                Bulk Edit
              </Button>
            </div>

            {selectedPost ? (
              <div className="space-y-8">
                <TagSection
                  title="Product Tags"
                  icon={<ShoppingBag className="w-5 h-5 text-carbon-blue" />}
                  pillar="product"
                  post={selectedPost}
                  allTags={productTags}
                />
                
                <TagSection
                  title="Influencer Tags"
                  icon={<Users className="w-5 h-5 text-carbon-blue" />}
                  pillar="influencer"
                  post={selectedPost}
                  allTags={influencerTags}
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
                  <CardContent className="p-4 text-center">
                    <Button variant="ghost" className="text-carbon-blue">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Connect New Paid Ad
                    </Button>
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
