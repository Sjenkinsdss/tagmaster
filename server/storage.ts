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
      console.log('Finding real ads for campaign 3746 "2025 Annual: Weekday"...');
      
      // Find the campaign report ID for campaign 3746
      const campaignReportResult = await db.execute(sql`
        SELECT campaign_report_id FROM debra_brandjobpost WHERE id = 3746
      `);
      
      const campaignReportId = campaignReportResult.rows[0].campaign_report_id;
      
      if (!campaignReportId) {
        console.log('Campaign 3746 has no campaign_report_id. Using TikTok business integration to find real ads...');
        
        // Use the actual query structure that connects through TikTok business integration tables
        // Prioritize ads with post URLs for interactive media
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
        
        console.log(`Found ${realAdsResult.rows.length} real ads for campaign 3746 through TikTok integration`);
        
        if (realAdsResult.rows.length > 0) {
          return this.convertAdsToPostFormat(realAdsResult.rows);
        }
        
        // Fallback: H&M client ads if no direct campaign connection
        console.log('No direct campaign ads found, falling back to H&M client ads...');
        const hmAdsResult = await db.execute(sql`
          SELECT DISTINCT
            aa.id,
            aa.name,
            aa.platform_name,
            aa.created_time as created_at,
            '' as embed_url
          FROM ads_ad aa
          WHERE aa.name IS NOT NULL
          AND aa.name != ''
          AND (aa.name ILIKE '%H&M%' OR aa.name ILIKE '%HM%')
          ORDER BY aa.created_time DESC
          LIMIT 30
        `);
        
        console.log(`Found ${hmAdsResult.rows.length} H&M related ads as fallback`);
        return this.convertAdsToPostFormat(hmAdsResult.rows);
      }
      
      console.log(`Found campaign report ID: ${campaignReportId}`);
      
      // Find ads linked to this campaign through post reports
      const adsResult = await db.execute(sql`
        SELECT DISTINCT
          aa.id,
          aa.name,
          aa.platform_name,
          aa.created_time as created_at,
          cpr.post_url as embed_url
        FROM ads_ad aa
        JOIN campaign_report_campaignpostreport cpr ON aa.post_report_id = cpr.id
        WHERE cpr.campaign_report_id = ${campaignReportId}
        ORDER BY aa.created_time DESC
        LIMIT 50
      `);
      
      console.log(`Found ${adsResult.rows.length} ads for campaign 3746`);
      return this.convertAdsToPostFormat(adsResult.rows);
    } catch (error) {
      console.error('Error fetching ads for campaign 3746:', error);
      return [];
    }
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
      
      // Get actual ads connected to this specific post
      const adsResult = await db.execute(sql`
        SELECT 
          id,
          name,
          platform_name,
          created_time,
          auto_connected_post_id,
          auto_connected_post_report_id,
          post_report_id,
          auto_connected_post_confidence_score
        FROM ads_ad 
        WHERE (auto_connected_post_id = ${postId} 
           OR auto_connected_post_report_id = ${postId} 
           OR post_report_id = ${postId})
        AND name IS NOT NULL 
        AND name != ''
        ORDER BY 
          auto_connected_post_confidence_score DESC NULLS LAST,
          created_time DESC
        LIMIT 10
      `);

      console.log(`Found ${adsResult.rows.length} ads connected to post ${postId}`);
      
      return adsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        postId: postId,
        createdAt: new Date(row.created_time || Date.now()),
        adTags: []
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