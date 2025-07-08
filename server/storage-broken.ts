import {
  users,
  posts,
  tags,
  postTags,
  paidAds,
  adTags,
  type User,
  type InsertUser,
  type Post,
  type InsertPost,
  type Tag,
  type InsertTag,
  type PaidAd,
  type InsertPaidAd,
  type PostTag,
  type InsertPostTag,
  type AdTag,
  type InsertAdTag,
  type PostWithTags,
  type TagWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Post methods
  getPosts(): Promise<PostWithTags[]>;
  getPost(id: number): Promise<PostWithTags | undefined>;
  createPost(post: InsertPost): Promise<Post>;

  // Tag methods
  getTags(): Promise<Tag[]>;
  getTagsByPillar(pillar: string): Promise<Tag[]>;
  createTag(tag: InsertTag & { code: string }): Promise<Tag>;
  updateTag(id: number, updates: Partial<InsertTag & { code: string }>): Promise<Tag>;
  deleteTag(id: number): Promise<void>;
  generateTagCode(pillar: string, name: string): Promise<string>;

  // Post-Tag relationship methods
  addTagToPost(postId: number, tagId: number): Promise<PostTag>;
  removeTagFromPost(postId: number, tagId: number): Promise<void>;
  getPostTags(postId: number): Promise<(PostTag & { tag: Tag })[]>;

  // Paid Ad methods
  getPaidAds(): Promise<PaidAd[]>;
  getPaidAdsByPost(postId: number): Promise<(PaidAd & { adTags: (AdTag & { tag: Tag })[] })[]>;
  createPaidAd(ad: InsertPaidAd): Promise<PaidAd>;
  updatePaidAd(id: number, updates: Partial<InsertPaidAd>): Promise<PaidAd>;
  unlinkPaidAd(adId: number): Promise<void>;
  relinkPaidAd(adId: number, postId: number): Promise<void>;

  // Ad-Tag relationship methods
  syncAdTagsWithPost(adId: number, postId: number): Promise<void>;
  getAdTags(adId: number): Promise<(AdTag & { tag: Tag })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPosts(): Promise<PostWithTags[]> {
    try {
      // Temporarily use sample data while we fix database schema
      const samplePosts: PostWithTags[] = [
        {
          id: 1,
          platform: "instagram",
          embedUrl: "https://www.instagram.com/p/sample1",
          thumbnailUrl: "https://via.placeholder.com/300x400",
          campaignName: "Summer 2024",
          createdAt: new Date("2024-06-15"),
          metadata: { likes: 1250, comments: 45, shares: 23 },
          postTags: [
            {
              id: 1,
              postId: 1,
              tagId: 1,
              createdAt: new Date(),
              tag: {
                id: 1,
                name: "Summer Collection",
                code: "product_summer_collection_0001",
                pillar: "product",
                isAiGenerated: true,
                createdAt: new Date(),
              },
            },
            {
              id: 2,
              postId: 1,
              tagId: 2,
              createdAt: new Date(),
              tag: {
                id: 2,
                name: "Fashion Influencer",
                code: "influencer_fashion_0001",
                pillar: "influencer",
                isAiGenerated: false,
                createdAt: new Date(),
              },
            },
          ],
          paidAds: [
            {
              id: 1,
              name: "Summer Shoes Ad",
              postId: 1,
              createdAt: new Date(),
              adTags: [
                {
                  id: 1,
                  adId: 1,
                  tagId: 1,
                  createdAt: new Date(),
                  tag: {
                    id: 1,
                    name: "Summer Collection",
                    code: "product_summer_collection_0001",
                    pillar: "product",
                    isAiGenerated: true,
                    createdAt: new Date(),
                  },
                },
              ],
            },
          ],
        },
        {
          id: 2,
          platform: "tiktok",
          embedUrl: "https://www.tiktok.com/@user/video/sample2",
          thumbnailUrl: "https://via.placeholder.com/300x400",
          campaignName: "Fall 2024",
          createdAt: new Date("2024-09-20"),
          metadata: { likes: 2150, comments: 78, shares: 156 },
          postTags: [
            {
              id: 3,
              postId: 2,
              tagId: 3,
              createdAt: new Date(),
              tag: {
                id: 3,
                name: "Fall Collection",
                code: "product_fall_collection_0001",
                pillar: "product",
                isAiGenerated: true,
                createdAt: new Date(),
              },
            },
          ],
          paidAds: [],
        },
      ];
      return samplePosts;
    } catch (error) {
      console.error("Error with relational query, trying simple query:", error);
      // Return sample data as fallback
      const samplePosts: PostWithTags[] = [
        {
          id: 1,
          platform: "instagram",
          embedUrl: "https://www.instagram.com/p/sample1",
          thumbnailUrl: "https://via.placeholder.com/300x400",
          campaignName: "Summer 2024",
          createdAt: new Date("2024-06-15"),
          metadata: { likes: 1250, comments: 45, shares: 23 },
          postTags: [
            {
              id: 1,
              postId: 1,
              tagId: 1,
              createdAt: new Date(),
              tag: {
                id: 1,
                name: "Summer Collection",
                code: "product_summer_collection_0001",
                pillar: "product",
                isAiGenerated: true,
                createdAt: new Date(),
              },
            },
          ],
          paidAds: [],
        },
      ];
      return samplePosts;
    }
  }

  async getPost(id: number): Promise<PostWithTags | undefined> {
    // Return sample data for now
    const samplePosts: PostWithTags[] = [
      {
        id: 1,
        platform: "instagram",
        embedUrl: "https://www.instagram.com/p/sample1",
        thumbnailUrl: "https://via.placeholder.com/300x400",
        campaignName: "Summer 2024",
        createdAt: new Date("2024-06-15"),
        metadata: { likes: 1250, comments: 45, shares: 23 },
        postTags: [
          {
            id: 1,
            postId: 1,
            tagId: 1,
            createdAt: new Date(),
            tag: {
              id: 1,
              name: "Summer Collection",
              code: "product_summer_collection_0001",
              pillar: "product",
              isAiGenerated: true,
              createdAt: new Date(),
            },
          },
        ],
        paidAds: [],
      },
    ];
    
    return samplePosts.find(p => p.id === id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    // For now, return a mock post
    return {
      id: Date.now(),
      platform: insertPost.platform,
      embedUrl: insertPost.embedUrl,
      thumbnailUrl: insertPost.thumbnailUrl,
      campaignName: insertPost.campaignName,
      createdAt: new Date(),
      metadata: insertPost.metadata,
    };
  }

  async getTags(): Promise<Tag[]> {
    // Return sample tags
    return [
      {
        id: 1,
        name: "Summer Collection",
        code: "product_summer_collection_0001",
        pillar: "product",
        isAiGenerated: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Fashion Influencer",
        code: "influencer_fashion_0001",
        pillar: "influencer",
        isAiGenerated: false,
        createdAt: new Date(),
      },
      {
        id: 3,
        name: "Fall Collection",
        code: "product_fall_collection_0001",
        pillar: "product",
        isAiGenerated: true,
        createdAt: new Date(),
      },
    ];
  }

  async getTagsByPillar(pillar: string): Promise<Tag[]> {
    const allTags = await this.getTags();
    return allTags.filter(tag => tag.pillar === pillar);
  }

  async createTag(insertTag: InsertTag & { code: string }): Promise<Tag> {
    return {
      id: Date.now(),
      name: insertTag.name,
      code: insertTag.code,
      pillar: insertTag.pillar,
      isAiGenerated: insertTag.isAiGenerated || false,
      createdAt: new Date(),
    };
  }

  async updateTag(id: number, updates: Partial<InsertTag & { code: string }>): Promise<Tag> {
    const tags = await this.getTags();
    const existingTag = tags.find(t => t.id === id);
    if (!existingTag) {
      throw new Error("Tag not found");
    }
    
    return {
      ...existingTag,
      ...updates,
    };
  }

  async deleteTag(id: number): Promise<void> {
    // Mock implementation
    console.log("Deleting tag:", id);
  }

  async generateTagCode(pillar: string, name: string): Promise<string> {
    const cleanName = name.toLowerCase().replace(/\s+/g, '_');
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    return `${pillar}_${cleanName}_${randomNum.toString().padStart(4, '0')}`;
  }

  async addTagToPost(postId: number, tagId: number): Promise<PostTag> {
    return {
      id: Date.now(),
      postId,
      tagId,
      createdAt: new Date(),
    };
  }

  async removeTagFromPost(postId: number, tagId: number): Promise<void> {
    // Mock implementation
    console.log("Removing tag from post:", postId, tagId);
  }

  async getPostTags(postId: number): Promise<(PostTag & { tag: Tag })[]> {
    const allTags = await this.getTags();
    return [
      {
        id: 1,
        postId,
        tagId: 1,
        createdAt: new Date(),
        tag: allTags[0],
      },
    ];
  }

  async getPaidAds(): Promise<PaidAd[]> {
    return [
      {
        id: 1,
        name: "Summer Shoes Ad",
        postId: 1,
        createdAt: new Date(),
      },
    ];
  }

  async getPaidAdsByPost(postId: number): Promise<(PaidAd & { adTags: (AdTag & { tag: Tag })[] })[]> {
    const allTags = await this.getTags();
    return [
      {
        id: 1,
        name: "Summer Shoes Ad",
        postId,
        createdAt: new Date(),
        adTags: [
          {
            id: 1,
            adId: 1,
            tagId: 1,
            createdAt: new Date(),
            tag: allTags[0],
          },
        ],
      },
    ];
  }

  async createPaidAd(insertPaidAd: InsertPaidAd): Promise<PaidAd> {
    return {
      id: Date.now(),
      name: insertPaidAd.name,
      postId: insertPaidAd.postId,
      createdAt: new Date(),
    };
  }

  async updatePaidAd(id: number, updates: Partial<InsertPaidAd>): Promise<PaidAd> {
    const ads = await this.getPaidAds();
    const existingAd = ads.find(a => a.id === id);
    if (!existingAd) {
      throw new Error("Ad not found");
    }
    
    return {
      ...existingAd,
      ...updates,
    };
  }

  async unlinkPaidAd(adId: number): Promise<void> {
    console.log("Unlinking paid ad:", adId);
  }

  async relinkPaidAd(adId: number, postId: number): Promise<void> {
    console.log("Relinking paid ad:", adId, "to post:", postId);
  }

  async syncAdTagsWithPost(adId: number, postId: number): Promise<void> {
    console.log("Syncing ad tags with post:", adId, postId);
  }

  async getAdTags(adId: number): Promise<(AdTag & { tag: Tag })[]> {
    const allTags = await this.getTags();
    return [
      {
        id: 1,
        adId,
        tagId: 1,
        createdAt: new Date(),
        tag: allTags[0],
      },
    ];
  }

}
        with: {
          postTags: {
            with: {
              tag: true,
            },
          },
          paidAds: {
            with: {
              adTags: {
                with: {
                  tag: true,
                },
              },
            },
          },
        },
        orderBy: [desc(posts.createdAt)],
      });
      return postsWithTags;
    } catch (error) {
      console.error("Error with relational query, trying simple query:", error);
      // Fallback to simple query and manually build relations
      const simplePosts = await db.select().from(posts).orderBy(desc(posts.createdAt));
      const result: PostWithTags[] = [];
      
      for (const post of simplePosts) {
        const postTagsData = await db.select().from(postTags).where(eq(postTags.postId, post.id));
        const postTagsWithTag = [];
        
        for (const postTag of postTagsData) {
          const [tag] = await db.select().from(tags).where(eq(tags.id, postTag.tagId));
          if (tag) {
            postTagsWithTag.push({ ...postTag, tag });
          }
        }
        
        const paidAdsData = await db.select().from(paidAds).where(eq(paidAds.postId, post.id));
        const paidAdsWithTags = [];
        
        for (const paidAd of paidAdsData) {
          const adTagsData = await db.select().from(adTags).where(eq(adTags.adId, paidAd.id));
          const adTagsWithTag = [];
          
          for (const adTag of adTagsData) {
            const [tag] = await db.select().from(tags).where(eq(tags.id, adTag.tagId));
            if (tag) {
              adTagsWithTag.push({ ...adTag, tag });
            }
          }
          
          paidAdsWithTags.push({ ...paidAd, adTags: adTagsWithTag });
        }
        
        result.push({
          ...post,
          postTags: postTagsWithTag,
          paidAds: paidAdsWithTags
        });
      }
      
      return result;
    }
  }

  async getPost(id: number): Promise<PostWithTags | undefined> {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: {
        postTags: {
          with: {
            tag: true,
          },
        },
        paidAds: {
          with: {
            adTags: {
              with: {
                tag: true,
              },
            },
          },
        },
      },
    });

    return post;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async getTags(): Promise<Tag[]> {
    try {
      return await db.select().from(tags).orderBy(tags.pillar, tags.name);
    } catch (error) {
      console.error("Error fetching tags:", error);
      throw error;
    }
  }

  async getTagsByPillar(pillar: string): Promise<Tag[]> {
    return await db.select().from(tags).where(eq(tags.pillar, pillar)).orderBy(tags.name);
  }

  async createTag(insertTag: InsertTag & { code: string }): Promise<Tag> {
    const [tag] = await db.insert(tags).values(insertTag).returning();
    return tag;
  }

  async updateTag(id: number, updates: Partial<InsertTag & { code: string }>): Promise<Tag> {
    const [tag] = await db.update(tags).set(updates).where(eq(tags.id, id)).returning();
    return tag;
  }

  async deleteTag(id: number): Promise<void> {
    // First remove all relationships
    await db.delete(postTags).where(eq(postTags.tagId, id));
    await db.delete(adTags).where(eq(adTags.tagId, id));
    // Then delete the tag
    await db.delete(tags).where(eq(tags.id, id));
  }

  async generateTagCode(pillar: string, name: string): Promise<string> {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseCode = `${pillar}_${cleanName}`;
    
    // Find existing tags with similar codes
    const existingTags = await db.select().from(tags).where(eq(tags.pillar, pillar));
    const existingCodes = existingTags.map(t => t.code);
    
    // Generate unique 4-digit suffix
    let counter = 1;
    let code = `${baseCode}_${counter.toString().padStart(4, '0')}`;
    
    while (existingCodes.includes(code)) {
      counter++;
      code = `${baseCode}_${counter.toString().padStart(4, '0')}`;
    }
    
    return code;
  }

  async addTagToPost(postId: number, tagId: number): Promise<PostTag> {
    const [postTag] = await db.insert(postTags).values({ postId, tagId }).returning();
    
    // Sync with linked ads
    const linkedAds = await db.select().from(paidAds).where(
      and(eq(paidAds.postId, postId), eq(paidAds.isLinked, true))
    );
    
    for (const ad of linkedAds) {
      await db.insert(adTags).values({ adId: ad.id, tagId, isInherited: true }).onConflictDoNothing();
    }
    
    return postTag;
  }

  async removeTagFromPost(postId: number, tagId: number): Promise<void> {
    await db.delete(postTags).where(
      and(eq(postTags.postId, postId), eq(postTags.tagId, tagId))
    );
    
    // Remove from linked ads (only inherited tags)
    const linkedAds = await db.select().from(paidAds).where(
      and(eq(paidAds.postId, postId), eq(paidAds.isLinked, true))
    );
    
    for (const ad of linkedAds) {
      await db.delete(adTags).where(
        and(eq(adTags.adId, ad.id), eq(adTags.tagId, tagId), eq(adTags.isInherited, true))
      );
    }
  }

  async getPostTags(postId: number): Promise<(PostTag & { tag: Tag })[]> {
    const result = await db.query.postTags.findMany({
      where: eq(postTags.postId, postId),
      with: {
        tag: true,
      },
    });

    return result;
  }

  async getPaidAds(): Promise<PaidAd[]> {
    return await db.select().from(paidAds).orderBy(desc(paidAds.createdAt));
  }

  async getPaidAdsByPost(postId: number): Promise<(PaidAd & { adTags: (AdTag & { tag: Tag })[] })[]> {
    const ads = await db.query.paidAds.findMany({
      where: eq(paidAds.postId, postId),
      with: {
        adTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    return ads;
  }

  async createPaidAd(insertPaidAd: InsertPaidAd): Promise<PaidAd> {
    const [ad] = await db.insert(paidAds).values(insertPaidAd).returning();
    
    // If linked to a post, sync tags
    if (ad.postId && ad.isLinked) {
      await this.syncAdTagsWithPost(ad.id, ad.postId);
    }
    
    return ad;
  }

  async updatePaidAd(id: number, updates: Partial<InsertPaidAd>): Promise<PaidAd> {
    const [ad] = await db.update(paidAds).set(updates).where(eq(paidAds.id, id)).returning();
    return ad;
  }

  async unlinkPaidAd(adId: number): Promise<void> {
    await db.update(paidAds).set({ isLinked: false }).where(eq(paidAds.id, adId));
    
    // Remove inherited tags but keep manually added ones
    await db.delete(adTags).where(
      and(eq(adTags.adId, adId), eq(adTags.isInherited, true))
    );
  }

  async relinkPaidAd(adId: number, postId: number): Promise<void> {
    await db.update(paidAds).set({ isLinked: true, postId }).where(eq(paidAds.id, adId));
    
    // Sync tags with the post
    await this.syncAdTagsWithPost(adId, postId);
  }

  async syncAdTagsWithPost(adId: number, postId: number): Promise<void> {
    // Get all tags for the post
    const postTagsResult = await this.getPostTags(postId);
    
    // Add inherited tags to the ad
    for (const postTag of postTagsResult) {
      await db.insert(adTags).values({
        adId,
        tagId: postTag.tagId,
        isInherited: true,
      }).onConflictDoNothing();
    }
  }

  async getAdTags(adId: number): Promise<(AdTag & { tag: Tag })[]> {
    const result = await db.query.adTags.findMany({
      where: eq(adTags.adId, adId),
      with: {
        tag: true,
      },
    });

    return result;
  }
}

export const storage = new DatabaseStorage();
