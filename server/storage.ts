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
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, updates: Partial<InsertTag>): Promise<Tag>;
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
    const postsWithTags = await db.query.posts.findMany({
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
    return await db.select().from(tags).orderBy(tags.pillar, tags.name);
  }

  async getTagsByPillar(pillar: string): Promise<Tag[]> {
    return await db.select().from(tags).where(eq(tags.pillar, pillar)).orderBy(tags.name);
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values(insertTag).returning();
    return tag;
  }

  async updateTag(id: number, updates: Partial<InsertTag>): Promise<Tag> {
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
