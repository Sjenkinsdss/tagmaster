import { 
  type User, 
  type Post, 
  type Tag, 
  type PostTag, 
  type PaidAd, 
  type AdTag, 
  type InsertUser, 
  type InsertPost, 
  type InsertTag, 
  type InsertPostTag, 
  type InsertPaidAd, 
  type InsertAdTag, 
  type PostWithTags 
} from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";

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
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    throw new Error("User creation not supported");
  }

  async getPosts(): Promise<PostWithTags[]> {
    try {
      console.log('Starting to fetch posts from production database...');
      
      // Get posts from production database - very simple query to start
      const postsResult = await db.execute(sql`
        SELECT 
          id,
          COALESCE(title, content, 'Untitled Post') as display_title,
          url as embed_url,
          platform_name as platform,
          post_image as thumbnail_url
        FROM debra_posts 
        WHERE id IS NOT NULL 
        AND post_image IS NOT NULL
        ORDER BY id DESC 
        LIMIT 5
      `);

      console.log(`Found ${postsResult.rows.length} posts`);

      const posts = postsResult.rows.map((row: any) => ({
        id: row.id,
        title: row.display_title || `Post ${row.id}`,
        platform: row.platform || 'unknown',
        embedUrl: row.embed_url || '',
        thumbnailUrl: row.thumbnail_url,
        campaignName: 'Production Content',
        createdAt: new Date(),
        metadata: {},
        postTags: [] as any[],
        paidAds: [] as any[]
      })) as PostWithTags[];

      console.log('Successfully fetched posts');
      return posts;
    } catch (error) {
      console.error('Error fetching posts from production DB:', error);
      return [];
    }
  }

  async getPost(id: number): Promise<PostWithTags | undefined> {
    const posts = await this.getPosts();
    return posts.find(p => p.id === id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    return {
      id: Date.now(),
      title: insertPost.title,
      platform: insertPost.platform,
      embedUrl: insertPost.embedUrl,
      thumbnailUrl: insertPost.thumbnailUrl || null,
      campaignName: insertPost.campaignName,
      createdAt: new Date(),
      metadata: insertPost.metadata,
    };
  }

  async getTags(): Promise<Tag[]> {
    try {
      const tagsResult = await db.execute(sql`
        SELECT 
          id,
          name,
          tag_type_id
        FROM debra_influencertag 
        ORDER BY name 
        LIMIT 100
      `);

      return tagsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: `tag_${row.name.toLowerCase().replace(/\s+/g, '_')}_${String(row.id).padStart(4, '0')}`,
        pillar: row.tag_type_id === 1 ? 'product' : 'content',
        isAiGenerated: true,
        createdAt: new Date(),
      }));
    } catch (error) {
      console.error('Error fetching tags from production DB:', error);
      return [];
    }
  }

  async getTagsByPillar(pillar: string): Promise<Tag[]> {
    const tags = await this.getTags();
    return tags.filter(tag => tag.pillar === pillar);
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
    const tag = tags.find(t => t.id === id);
    if (!tag) throw new Error("Tag not found");
    return { ...tag, ...updates };
  }

  async deleteTag(id: number): Promise<void> {
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
    };
  }

  async removeTagFromPost(postId: number, tagId: number): Promise<void> {
    console.log("Removing tag from post:", postId, tagId);
  }

  async getPostTags(postId: number): Promise<(PostTag & { tag: Tag })[]> {
    const tags = await this.getTags();
    return [
      {
        id: 1,
        postId,
        tagId: 1,
        tag: tags[0],
      },
    ];
  }

  async getPaidAds(): Promise<PaidAd[]> {
    return [
      {
        id: 1,
        title: "Summer Ad",
        status: "active",
        platform: "instagram",
        thumbnailUrl: null,
        postId: 1,
        isLinked: true,
        performance: { clicks: 150, impressions: 5000 },
        createdAt: new Date(),
      },
    ];
  }

  async getPaidAdsByPost(postId: number): Promise<(PaidAd & { adTags: (AdTag & { tag: Tag })[] })[]> {
    const tags = await this.getTags();
    return [
      {
        id: 1,
        title: "Summer Ad",
        status: "active",
        platform: "instagram",
        thumbnailUrl: null,
        postId,
        isLinked: true,
        performance: { clicks: 150, impressions: 5000 },
        createdAt: new Date(),
        adTags: [
          {
            id: 1,
            adId: 1,
            tagId: 1,
            isInherited: true,
            tag: tags[0],
          },
        ],
      },
    ];
  }

  async createPaidAd(insertPaidAd: InsertPaidAd): Promise<PaidAd> {
    return {
      id: Date.now(),
      title: insertPaidAd.title,
      status: insertPaidAd.status || "active",
      platform: insertPaidAd.platform,
      thumbnailUrl: insertPaidAd.thumbnailUrl || null,
      postId: insertPaidAd.postId || null,
      isLinked: insertPaidAd.isLinked || false,
      performance: insertPaidAd.performance || {},
      createdAt: new Date(),
    };
  }

  async updatePaidAd(id: number, updates: Partial<InsertPaidAd>): Promise<PaidAd> {
    const ads = await this.getPaidAds();
    const ad = ads.find(a => a.id === id);
    if (!ad) throw new Error("Ad not found");
    return { ...ad, ...updates };
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
    const tags = await this.getTags();
    return [
      {
        id: 1,
        adId,
        tagId: 1,
        isInherited: true,
        tag: tags[0],
      },
    ];
  }
}

export const storage = new DatabaseStorage();