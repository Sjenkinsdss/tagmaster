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
      console.log('Fetching posts from debra_posts and campaign ads...');
      
      // First, get real posts from debra_posts table (especially for 2025 Annual: Weekday campaign)
      // Include specific test post 1378685242 for connected ads testing
      const realPostsResult = await db.execute(sql`
        (
          SELECT 
            dp.id,
            dp.content as title,
            dp.platform_name as platform,
            dp.url as embed_url,
            dp.post_image as thumbnail_url,
            '2025 Annual: Weekday' as campaign_name,
            dp.create_date as created_at,
            dp.content as metadata_content
          FROM debra_posts dp
          WHERE dp.id = 1378685242
        )
        UNION
        (
          SELECT 
            dp.id,
            dp.content as title,
            dp.platform_name as platform,
            dp.url as embed_url,
            dp.post_image as thumbnail_url,
            '2025 Annual: Weekday' as campaign_name,
            dp.create_date as created_at,
            dp.content as metadata_content
          FROM debra_posts dp
          WHERE dp.is_sponsored = true
            AND dp.content IS NOT NULL
            AND dp.content != ''
            AND dp.url IS NOT NULL
            AND dp.id != 1378685242
          ORDER BY dp.create_date DESC
          LIMIT 49
        )
      `);
      
      console.log(`Found ${realPostsResult.rows.length} real posts from debra_posts`);
      
      // Then get campaign ads as well
      console.log('Finding campaign ads for "2025 Annual: Weekday"...');
      const realAdsResult = await db.execute(sql`
        SELECT 
          aa.id,
          c."name" as name,
          'TIKTOK' as platform_name,
          aa.created_time as created_at,
          COALESCE(cpr.post_url, '') as embed_url,
          e."name" as Campaign_name,
          bjp.client_name,
          bjp.title as bjp_title
        FROM ads_ad aa        
        LEFT JOIN tiktok_business_integration_tiktokad c
          ON aa.tiktok_ad_id = c.tiktokbase_ptr_id 
        LEFT JOIN tiktok_business_integration_tiktokadgroup d
          ON c.ad_group_id = d.tiktokbase_ptr_id 
        LEFT JOIN tiktok_business_integration_tiktokcampaign e
          ON d.campaign_id = e.tiktokbase_ptr_id
        LEFT JOIN debra_brandjobpost bjp
          ON e.campaign_id = bjp.id   
        LEFT JOIN campaign_report_campaignpostreport cpr
          ON aa.post_report_id = cpr.id
        WHERE bjp.title = '2025 Annual: Weekday'
          AND aa.id IS NOT NULL
          AND c."name" IS NOT NULL
          AND c."name" != ''
        ORDER BY 
          CASE WHEN cpr.post_url IS NOT NULL AND cpr.post_url != '' THEN 0 ELSE 1 END,
          aa.created_time DESC
        LIMIT 30
      `);
      
      console.log(`Found ${realAdsResult.rows.length} campaign ads through TikTok integration`);
      
      // Combine real posts and campaign ads
      const realPosts = this.convertRealPostsToFormat(realPostsResult.rows);
      const campaignAds = this.convertAdsToPostFormat(realAdsResult.rows);
      
      // Merge and sort by creation date
      const allPosts = [...realPosts, ...campaignAds].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log(`Total posts returned: ${allPosts.length} (${realPosts.length} real posts + ${campaignAds.length} campaign ads)`);
      return allPosts;
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  }

  private convertRealPostsToFormat(postRows: any[]): PostWithTags[] {
    return postRows.map((row: any) => ({
      id: row.id,
      title: (row.title || '').substring(0, 100) + (row.title?.length > 100 ? '...' : ''),
      platform: row.platform || 'TikTok',
      embedUrl: row.embed_url || '',
      thumbnailUrl: row.thumbnail_url || 'https://picsum.photos/400/400?random=' + row.id,
      campaignName: row.campaign_name || '2025 Annual: Weekday',
      createdAt: new Date(row.created_at || Date.now()),
      metadata: { 
        content: row.metadata_content,
        type: 'real_post'
      },
      postTags: [] as any[],
      paidAds: [] as any[]
    })) as PostWithTags[];
  }

  private convertAdsToPostFormat(adRows: any[]): PostWithTags[] {
    return adRows.map((row: any) => ({
      id: row.id,
      title: row.name || `Ad ${row.id}`,
      platform: row.platform_name || 'unknown',
      embedUrl: row.embed_url || '',
      thumbnailUrl: 'https://picsum.photos/400/400?random=' + row.id,
      campaignName: '2025 Annual: Weekday',
      createdAt: new Date(row.created_at || Date.now()),
      metadata: { 
        ad_name: row.name,
        ad_type: 'paid_ad'
      },
      postTags: [] as any[],
      paidAds: [] as any[]
    })) as PostWithTags[];
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
          dit.id,
          dit.name,
          dit.tag_type_id,
          ditt.name as tag_type_name
        FROM debra_influencertag dit
        LEFT JOIN debra_influencertagtype ditt ON dit.tag_type_id = ditt.id
        WHERE dit.name IS NOT NULL 
        AND dit.name != ''
        AND TRIM(dit.name) != ''
        ORDER BY ditt.name, dit.name 
        LIMIT 200
      `);

      return tagsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: `${(row.tag_type_name || 'general').toLowerCase()}_${row.name.toLowerCase().replace(/\s+/g, '_')}_${String(row.id).padStart(4, '0')}`,
        pillar: this.mapTagTypeToPillar(row.tag_type_name),
        isAiGenerated: true,
        createdAt: new Date(),
      }));
    } catch (error) {
      console.error('Error fetching tags from production DB:', error);
      return [];
    }
  }

  private mapTagTypeToPillar(tagTypeName: string): string {
    if (!tagTypeName) return 'product';
    
    const lowerName = tagTypeName.toLowerCase();
    
    // Influencer/Audience related  
    if (lowerName.includes('audience') || lowerName.includes('behavior') || lowerName.includes('activity') ||
        lowerName.includes('age') || lowerName.includes('gender') || lowerName.includes('location') ||
        lowerName.includes('interest') || lowerName.includes('lifestyle') || lowerName.includes('demographic') ||
        lowerName.includes('influencer') || lowerName.includes('creator')) {
      return 'influencer';
    }
    
    // Product/Brand related (default for most business tags)
    return 'product';
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
    try {
      console.log(`Looking for tags connected to post ${postId}...`);
      
      // Get actual tags connected to this specific post from production tables
      const postTagsResult = await db.execute(sql`
        SELECT 
          dpit.id,
          dpit.post_id,
          dpit.influencer_tag_id,
          dit.name as tag_name,
          ditt.name as tag_type_name,
          dit.id as tag_id
        FROM debra_posts_influencer_tags dpit
        JOIN debra_influencertag dit ON dpit.influencer_tag_id = dit.id
        JOIN debra_influencertagtype ditt ON dit.tag_type_id = ditt.id
        WHERE dpit.post_id = ${postId}
        ORDER BY dit.name
      `);

      console.log(`Found ${postTagsResult.rows.length} tags connected to post ${postId}`);
      
      return postTagsResult.rows.map((row: any) => ({
        id: row.id,
        postId: row.post_id,
        tagId: row.tag_id,
        createdAt: new Date(),
        tag: {
          id: row.tag_id,
          name: row.tag_name,
          code: `${this.mapTagTypeToPillar(row.tag_type_name)}_${row.tag_name.toLowerCase().replace(/\s+/g, '_')}_0001`,
          pillar: this.mapTagTypeToPillar(row.tag_type_name),
          isAiGenerated: false,
          createdAt: new Date()
        }
      }));
    } catch (error) {
      console.error('Error fetching post tags:', error);
      return [];
    }
  }

  async getPaidAds(): Promise<PaidAd[]> {
    try {
      // Get actual ad names from ads_ad table (for ad names)
      const adsResult = await db.execute(sql`
        SELECT 
          id,
          name,
          platform_name,
          created_time
        FROM ads_ad 
        WHERE name IS NOT NULL 
        AND name != ''
        ORDER BY created_time DESC 
        LIMIT 20
      `);

      return adsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        postId: null,
        createdAt: new Date(row.created_time || Date.now()),
      }));
    } catch (error) {
      console.error('Error fetching ads from ads_ad:', error);
      return [];
    }
  }

  async getPaidAdsByPost(postId: number): Promise<(PaidAd & { adTags: (AdTag & { tag: Tag })[] })[]> {
    try {
      console.log(`Looking for ads connected to post ${postId}...`);
      
      // Get actual ads connected to this specific post using all connection methods
      const adsResult = await db.execute(sql`
        (
          SELECT 
            aa.id,
            aa.name,
            aa.platform_name,
            aa.created_time,
            aa.auto_connected_post_confidence_score as confidence_score,
            'direct_post' as connection_method
          FROM ads_ad aa
          WHERE aa.auto_connected_post_id = ${postId}
            AND aa.name IS NOT NULL 
            AND aa.name != ''
        )
        UNION
        (
          SELECT 
            aa.id,
            aa.name,
            aa.platform_name,
            aa.created_time,
            aa.post_report_confidence_score as confidence_score,
            'post_report' as connection_method
          FROM ads_ad aa
          WHERE aa.post_report_id IN (
            SELECT cpr.id 
            FROM campaign_report_campaignpostreport cpr 
            WHERE cpr.post_id = ${postId}
          )
            AND aa.name IS NOT NULL 
            AND aa.name != ''
        )
        UNION
        (
          SELECT 
            aa.id,
            aa.name,
            aa.platform_name,
            aa.created_time,
            aa.auto_connected_post_report_confidence_score as confidence_score,
            'auto_post_report' as connection_method
          FROM ads_ad aa
          WHERE aa.auto_connected_post_report_id IN (
            SELECT cpr.id 
            FROM campaign_report_campaignpostreport cpr 
            WHERE cpr.post_id = ${postId}
          )
            AND aa.name IS NOT NULL 
            AND aa.name != ''
        )
        ORDER BY confidence_score DESC NULLS LAST, created_time DESC
        LIMIT 10
      `);

      console.log(`Found ${adsResult.rows.length} ads connected to post ${postId}`);
      
      return adsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        postId: postId,
        createdAt: new Date(row.created_time || Date.now()),
        adTags: [],
        isLinked: true, // Connected ads are considered linked
        platform: row.platform_name || 'TIKTOK',
        thumbnailUrl: null,
        performance: {}
      }));
    } catch (error) {
      console.error('Error fetching ads by post from ads_ad:', error);
      return [];
    }
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