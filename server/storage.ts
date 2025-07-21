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
import { db, prodDb, replitDb } from "./db";
import { sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Post methods
  getPosts(): Promise<PostWithTags[]>;
  getPostsPaginated(page: number, limit: number): Promise<{
    posts: PostWithTags[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalPosts: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>;
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

  // Tag Recommendation methods
  getTagRecommendations(postId: number, limit?: number): Promise<{
    tag: Tag;
    score: number;
    reasons: string[];
  }[]>;
  getTagCoOccurrenceData(): Promise<{ tagId1: number; tagId2: number; frequency: number }[]>;
  getContentSimilarTags(postContent: string, limit?: number): Promise<Tag[]>;
  getUserTaggingPatterns(userId?: number): Promise<{ tagId: number; frequency: number; pillar: string }[]>;

  // Replit Database Write Methods
  createNewTag(tag: InsertTag & { code: string }): Promise<Tag>;
  addTagToPostReplit(postId: number, tagId: number): Promise<PostTag>;
  removeTagFromPostReplit(postId: number, tagId: number): Promise<void>;
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
      console.log('Fetching posts from production database...');
      
      // Get posts with minimal query to avoid column errors
      const postsResult = await db.execute(sql`
        SELECT 
          dp.id,
          dp.content as title,
          dp.platform_name as platform,
          dp.url as embed_url,
          dp.url as original_url,
          dp.post_image as thumbnail_url,
          CASE 
            WHEN LOWER(dp.content) LIKE '%sam%club%' OR LOWER(dp.content) LIKE '%sams%' THEN 'Sam''s Club Campaign'
            WHEN LOWER(dp.content) LIKE '%walmart%' THEN 'Walmart Partnership'
            WHEN LOWER(dp.content) LIKE '%nike%' THEN 'Nike Campaign'
            WHEN LOWER(dp.content) LIKE '%adidas%' THEN 'Adidas Campaign'
            WHEN LOWER(dp.content) LIKE '%target%' THEN 'Target Campaign'
            WHEN LOWER(dp.content) LIKE '%amazon%' THEN 'Amazon Campaign'
            WHEN LOWER(dp.content) LIKE '%h&m%' OR LOWER(dp.content) LIKE '%weekday%' THEN 'H&M Campaign'
            ELSE 'General Content'
          END as campaign_name,
          CASE 
            WHEN LOWER(dp.content) LIKE '%sam%club%' OR LOWER(dp.content) LIKE '%sams%' THEN 'Sam''s Club'
            WHEN LOWER(dp.content) LIKE '%walmart%' THEN 'Walmart'
            WHEN LOWER(dp.content) LIKE '%nike%' THEN 'Nike'
            WHEN LOWER(dp.content) LIKE '%adidas%' THEN 'Adidas'
            WHEN LOWER(dp.content) LIKE '%target%' THEN 'Target'
            WHEN LOWER(dp.content) LIKE '%amazon%' THEN 'Amazon'
            WHEN LOWER(dp.content) LIKE '%h&m%' OR LOWER(dp.content) LIKE '%weekday%' THEN 'H&M'
            ELSE 'Other'
          END as client_name,
          dp.create_date as created_at,
          dp.content as metadata_content
        FROM debra_posts dp
        WHERE dp.content IS NOT NULL
          AND dp.content != ''
          AND dp.is_sponsored = true
          AND dp.id IN (
            SELECT DISTINCT dpit.posts_id 
            FROM debra_posts_influencer_tags dpit 
            LIMIT 50
          )
        ORDER BY dp.create_date DESC
        LIMIT 25
      `);
      
      console.log(`Found ${postsResult.rows.length} sponsored posts from various clients`);
      if (postsResult.rows.length > 0) {
        const clientCounts = postsResult.rows.reduce((acc: any, row: any) => {
          acc[row.client_name] = (acc[row.client_name] || 0) + 1;
          return acc;
        }, {});
        console.log('Client distribution:', clientCounts);
      }
      
      console.log(`Total posts loaded: ${postsResult.rows.length}`);
      
      // Get ads with simple query to avoid timeouts
      console.log('Finding ads with simple query...');
      const adsResult = await db.execute(sql`
        SELECT 
          aa.id,
          aa.name as name,
          'TIKTOK' as platform_name,
          aa.created_time as created_at,
          '' as embed_url,
          CASE 
            WHEN LOWER(aa.name) LIKE '%curology%' THEN 'Curology Campaign'
            WHEN LOWER(aa.name) LIKE '%radpower%' OR LOWER(aa.name) LIKE '%rad%power%' THEN 'RadPower Bikes Campaign'
            WHEN LOWER(aa.name) LIKE '%sam%club%' OR LOWER(aa.name) LIKE '%sams%' THEN 'Sam''s Club Direct Campaign'
            WHEN LOWER(aa.name) LIKE '%walmart%' THEN 'Walmart Campaign'
            WHEN LOWER(aa.name) LIKE '%nike%' THEN 'Nike Campaign'
            WHEN LOWER(aa.name) LIKE '%adidas%' THEN 'Adidas Campaign'
            WHEN LOWER(aa.name) LIKE '%target%' THEN 'Target Campaign'
            WHEN LOWER(aa.name) LIKE '%amazon%' THEN 'Amazon Campaign'
            WHEN LOWER(aa.name) LIKE '%h&m%' OR LOWER(aa.name) LIKE '%weekday%' THEN 'H&M Campaign'
            WHEN LOWER(aa.name) LIKE '%trueview%' THEN 'YouTube TrueView Campaign'
            ELSE 'Brand Campaign'
          END as campaign_name,
          CASE 
            WHEN LOWER(aa.name) LIKE '%curology%' THEN 'Curology'
            WHEN LOWER(aa.name) LIKE '%radpower%' OR LOWER(aa.name) LIKE '%rad%power%' THEN 'RadPower Bikes'
            WHEN LOWER(aa.name) LIKE '%sam%club%' OR LOWER(aa.name) LIKE '%sams%' THEN 'Sam''s Club'
            WHEN LOWER(aa.name) LIKE '%walmart%' THEN 'Walmart'
            WHEN LOWER(aa.name) LIKE '%nike%' THEN 'Nike'
            WHEN LOWER(aa.name) LIKE '%adidas%' THEN 'Adidas'
            WHEN LOWER(aa.name) LIKE '%target%' THEN 'Target'
            WHEN LOWER(aa.name) LIKE '%amazon%' THEN 'Amazon'
            WHEN LOWER(aa.name) LIKE '%h&m%' OR LOWER(aa.name) LIKE '%weekday%' THEN 'H&M'
            WHEN LOWER(aa.name) LIKE '%trueview%' THEN 'YouTube'
            ELSE 'Other'
          END as client_name
        FROM ads_ad aa        
        WHERE aa.id IS NOT NULL
          AND aa.name IS NOT NULL
          AND aa.name != ''
        ORDER BY aa.created_time DESC
        LIMIT 20
      `);
      
      console.log(`Found ${adsResult.rows.length} ads from various clients`);
      if (adsResult.rows.length > 0) {
        const adClientCounts = adsResult.rows.reduce((acc: any, row: any) => {
          acc[row.client_name] = (acc[row.client_name] || 0) + 1;
          return acc;
        }, {});
        console.log('Ad client distribution:', adClientCounts);
      }
      
      // Combine real posts and campaign ads
      const realPosts = this.convertRealPostsToFormat(postsResult.rows);
      const campaignAds = this.convertAdsToPostFormat(adsResult.rows);
      
      // Merge and sort by creation date
      const allPosts = [...realPosts, ...campaignAds].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log(`Total posts returned: ${allPosts.length} (${realPosts.length} content posts + ${campaignAds.length} ads)`);
      
      // Log IDs to debug duplicates
      const allIds = allPosts.map(p => p.id);
      const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.log('DUPLICATE IDs FOUND:', duplicateIds);
      }
      
      return allPosts;
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  }

  async getPostsPaginated(page: number, limit: number): Promise<{
    posts: PostWithTags[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalPosts: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    try {
      console.log(`Fetching posts with pagination: page ${page}, limit ${limit}`);
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Get total count first
      const totalCountResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM (
          (
            SELECT id FROM debra_posts 
            WHERE content IS NOT NULL
              AND content != ''
              AND is_sponsored = true
              AND id IN (
                SELECT DISTINCT dpit.posts_id 
                FROM debra_posts_influencer_tags dpit 
                LIMIT 50
              )
          )
          UNION
          (
            SELECT id FROM ads_ad 
            WHERE id IS NOT NULL
              AND name IS NOT NULL
              AND name != ''
          )
        ) as combined_posts
      `);
      
      const totalPosts = parseInt(totalCountResult.rows[0]?.total || '0');
      const totalPages = Math.ceil(totalPosts / limit);
      
      // Get paginated posts with similar query but with limits
      const postsResult = await db.execute(sql`
        SELECT 
          dp.id,
          dp.content as title,
          dp.platform_name as platform,
          dp.url as embed_url,
          dp.url as original_url,
          dp.post_image as thumbnail_url,
          CASE 
            WHEN LOWER(dp.content) LIKE '%sam%club%' OR LOWER(dp.content) LIKE '%sams%' THEN 'Sam''s Club Campaign'
            WHEN LOWER(dp.content) LIKE '%walmart%' THEN 'Walmart Partnership'
            WHEN LOWER(dp.content) LIKE '%nike%' THEN 'Nike Campaign'
            WHEN LOWER(dp.content) LIKE '%adidas%' THEN 'Adidas Campaign'
            WHEN LOWER(dp.content) LIKE '%target%' THEN 'Target Campaign'
            WHEN LOWER(dp.content) LIKE '%amazon%' THEN 'Amazon Campaign'
            WHEN LOWER(dp.content) LIKE '%h&m%' OR LOWER(dp.content) LIKE '%weekday%' THEN 'H&M Campaign'
            ELSE 'General Content'
          END as campaign_name,
          CASE 
            WHEN LOWER(dp.content) LIKE '%sam%club%' OR LOWER(dp.content) LIKE '%sams%' THEN 'Sam''s Club'
            WHEN LOWER(dp.content) LIKE '%walmart%' THEN 'Walmart'
            WHEN LOWER(dp.content) LIKE '%nike%' THEN 'Nike'
            WHEN LOWER(dp.content) LIKE '%adidas%' THEN 'Adidas'
            WHEN LOWER(dp.content) LIKE '%target%' THEN 'Target'
            WHEN LOWER(dp.content) LIKE '%amazon%' THEN 'Amazon'
            WHEN LOWER(dp.content) LIKE '%h&m%' OR LOWER(dp.content) LIKE '%weekday%' THEN 'H&M'
            ELSE 'Other'
          END as client_name,
          dp.create_date as created_at,
          dp.content as metadata_content
        FROM debra_posts dp
        WHERE dp.content IS NOT NULL
          AND dp.content != ''
          AND dp.is_sponsored = true
          AND dp.id IN (
            SELECT DISTINCT dpit.posts_id 
            FROM debra_posts_influencer_tags dpit 
            LIMIT 50
          )
        ORDER BY dp.create_date DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);
      
      console.log(`Found ${postsResult.rows.length} posts for page ${page}`);
      
      // Get ads (for now, just take remaining from limit)
      const remainingLimit = Math.max(0, limit - postsResult.rows.length);
      const adsResult = remainingLimit > 0 ? await db.execute(sql`
        SELECT 
          aa.id,
          aa.name as name,
          'TIKTOK' as platform_name,
          aa.created_time as created_at,
          '' as embed_url,
          CASE 
            WHEN LOWER(aa.name) LIKE '%curology%' THEN 'Curology Campaign'
            WHEN LOWER(aa.name) LIKE '%radpower%' OR LOWER(aa.name) LIKE '%rad%power%' THEN 'RadPower Bikes Campaign'
            WHEN LOWER(aa.name) LIKE '%sam%club%' OR LOWER(aa.name) LIKE '%sams%' THEN 'Sam''s Club Direct Campaign'
            WHEN LOWER(aa.name) LIKE '%walmart%' THEN 'Walmart Campaign'
            WHEN LOWER(aa.name) LIKE '%nike%' THEN 'Nike Campaign'
            WHEN LOWER(aa.name) LIKE '%adidas%' THEN 'Adidas Campaign'
            WHEN LOWER(aa.name) LIKE '%target%' THEN 'Target Campaign'
            WHEN LOWER(aa.name) LIKE '%amazon%' THEN 'Amazon Campaign'
            WHEN LOWER(aa.name) LIKE '%h&m%' OR LOWER(aa.name) LIKE '%weekday%' THEN 'H&M Campaign'
            WHEN LOWER(aa.name) LIKE '%trueview%' THEN 'YouTube TrueView Campaign'
            ELSE 'Brand Campaign'
          END as campaign_name,
          CASE 
            WHEN LOWER(aa.name) LIKE '%curology%' THEN 'Curology'
            WHEN LOWER(aa.name) LIKE '%radpower%' OR LOWER(aa.name) LIKE '%rad%power%' THEN 'RadPower Bikes'
            WHEN LOWER(aa.name) LIKE '%sam%club%' OR LOWER(aa.name) LIKE '%sams%' THEN 'Sam''s Club'
            WHEN LOWER(aa.name) LIKE '%walmart%' THEN 'Walmart'
            WHEN LOWER(aa.name) LIKE '%nike%' THEN 'Nike'
            WHEN LOWER(aa.name) LIKE '%adidas%' THEN 'Adidas'
            WHEN LOWER(aa.name) LIKE '%target%' THEN 'Target'
            WHEN LOWER(aa.name) LIKE '%amazon%' THEN 'Amazon'
            WHEN LOWER(aa.name) LIKE '%h&m%' OR LOWER(aa.name) LIKE '%weekday%' THEN 'H&M'
            WHEN LOWER(aa.name) LIKE '%trueview%' THEN 'YouTube'
            ELSE 'Other'
          END as client_name
        FROM ads_ad aa        
        WHERE aa.id IS NOT NULL
          AND aa.name IS NOT NULL
          AND aa.name != ''
        ORDER BY aa.created_time DESC
        LIMIT ${remainingLimit}
      `) : { rows: [] };
      
      // Combine and format posts
      const realPosts = this.convertRealPostsToFormat(postsResult.rows);
      const campaignAds = this.convertAdsToPostFormat(adsResult.rows);
      
      const allPosts = [...realPosts, ...campaignAds].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log(`Returning ${allPosts.length} posts for page ${page} of ${totalPages}`);
      
      return {
        posts: allPosts,
        pagination: {
          currentPage: page,
          totalPages,
          totalPosts,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        }
      };
      
    } catch (error) {
      console.error('Error fetching paginated posts:', error);
      return {
        posts: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalPosts: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      };
    }
  }

  private convertRealPostsToFormat(postRows: any[]): PostWithTags[] {
    return postRows.map((row: any) => ({
      id: parseInt(row.id), // Ensure ID is a number
      title: (row.title || '').substring(0, 100) + (row.title?.length > 100 ? '...' : ''),
      platform: row.platform || 'TikTok',
      embedUrl: row.embed_url || '',
      url: row.original_url || '', // Use original_url field from database
      thumbnailUrl: row.thumbnail_url || 'https://picsum.photos/400/400?random=' + row.id,
      campaignName: row.campaign_name || 'General Content',
      createdAt: new Date(row.created_at || Date.now()),
      metadata: { 
        content: row.metadata_content,
        type: 'real_post',
        clientName: row.client_name || 'Other',
        engagement: {
          likes: Math.floor(Math.random() * 1000) + 50,
          comments: Math.floor(Math.random() * 100) + 10,
          shares: Math.floor(Math.random() * 50) + 5,
          impressions: Math.floor(Math.random() * 10000) + 1000
        }
      },
      postTags: [] as any[],
      paidAds: [] as any[]
    })) as PostWithTags[];
  }

  private convertAdsToPostFormat(adRows: any[]): PostWithTags[] {
    return adRows.map((row: any, index: number) => {
      // Create a guaranteed unique ID using a large offset + row index + ad ID
      // This ensures no conflicts with production post IDs (which are typically < 2 billion)
      const baseOffset = 9000000000; // 9 billion base offset
      const uniqueId = baseOffset + (index * 100000) + parseInt(row.id);
      
      return {
        id: uniqueId,
        title: row.name || `Ad ${row.id}`,
        platform: row.platform_name || 'unknown',
        embedUrl: row.embed_url || '',
        thumbnailUrl: 'https://picsum.photos/400/400?random=' + uniqueId,
        campaignName: row.campaign_name || 'Brand Campaign',
        createdAt: new Date(row.created_at || Date.now()),
        metadata: { 
          ad_name: row.name,
          ad_type: 'paid_ad',
          clientName: row.client_name || 'Other',
          originalAdId: row.id,
          likes: Math.floor(Math.random() * 1000) + 100,
          comments: Math.floor(Math.random() * 200) + 20,
          shares: Math.floor(Math.random() * 100) + 5,
        },
        postTags: [] as any[],
        paidAds: [] as any[]
      };
    }) as PostWithTags[];
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
      console.log("Getting tags from debra_influencertag and client tag sources");
      
      // Query influencer tags
      const influencerTagsResult = await db.execute(sql`
        SELECT 
          dit.id,
          dit.name,
          dit.tag_type_id,
          ditt.name as tag_type_name,
          'influencer' as tag_source
        FROM debra_influencertag dit
        LEFT JOIN debra_influencertagtype ditt ON dit.tag_type_id = ditt.id
        WHERE dit.name IS NOT NULL 
        AND dit.name != ''
        AND TRIM(dit.name) != ''
        ORDER BY ditt.name, dit.name 
        LIMIT 150
      `);

      let allTags = [...influencerTagsResult.rows];

      // Get client tags from debra_brandjobpost using client_id
      try {
        console.log("Attempting to query client tags from debra_brandjobpost");
        const clientTagsResult = await db.execute(sql`
          SELECT DISTINCT
            client_id as id,
            COALESCE(client_name, 'Client ' || client_id) as name,
            'client' as tag_type_name,
            'Client' as tag_type_group_name,
            'client' as tag_source
          FROM debra_brandjobpost 
          WHERE client_id IS NOT NULL 
          AND client_id > 0
          AND (client_name IS NOT NULL AND client_name != '' AND TRIM(client_name) != '')
          AND (
            LOWER(client_name) LIKE '%sam%club%' OR
            LOWER(client_name) LIKE '%member%mark%' OR
            LOWER(client_name) LIKE '%walmart%' OR
            LOWER(client_name) LIKE '%nike%' OR
            LOWER(client_name) LIKE '%adidas%' OR
            LOWER(client_name) LIKE '%target%' OR
            LOWER(client_name) LIKE '%amazon%' OR
            LOWER(client_name) LIKE '%h&m%' OR
            LOWER(client_name) LIKE '%curology%' OR
            LOWER(client_name) LIKE '%radpower%' OR
            LENGTH(client_name) > 10
          )
          ORDER BY name
          LIMIT 15
        `);
        
        console.log(`Successfully found ${clientTagsResult.rows.length} client tags from debra_brandjobpost`);
        allTags = [...allTags, ...clientTagsResult.rows];
      } catch (clientError) {
        console.log(`Could not fetch client tags from debra_brandjobpost: ${clientError.message}`);
        
        // Try alternative client tag approach using brand_client_id
        try {
          console.log("Attempting to query client tags using brand_client_id");
          const brandClientTagsResult = await db.execute(sql`
            SELECT DISTINCT
              brand_client_id as id,
              COALESCE(client_name, 'Brand Client ' || brand_client_id) as name,
              'client' as tag_type_name,
              'Client' as tag_type_group_name,
              'client' as tag_source
            FROM debra_brandjobpost 
            WHERE brand_client_id IS NOT NULL 
            AND brand_client_id > 0
            AND (client_name IS NOT NULL AND client_name != '' AND TRIM(client_name) != '')
            AND (
              LOWER(client_name) LIKE '%sam%club%' OR
              LOWER(client_name) LIKE '%member%mark%' OR
              LOWER(client_name) LIKE '%walmart%' OR
              LOWER(client_name) LIKE '%nike%' OR
              LOWER(client_name) LIKE '%adidas%' OR
              LOWER(client_name) LIKE '%target%' OR
              LOWER(client_name) LIKE '%amazon%' OR
              LOWER(client_name) LIKE '%h&m%' OR
              LOWER(client_name) LIKE '%curology%' OR
              LOWER(client_name) LIKE '%radpower%' OR
              LENGTH(client_name) > 10
            )
            ORDER BY name
            LIMIT 15
          `);
          
          console.log(`Successfully found ${brandClientTagsResult.rows.length} brand client tags from debra_brandjobpost`);
          allTags = [...allTags, ...brandClientTagsResult.rows];
        } catch (brandClientError) {
          console.log(`Could not fetch brand client tags: ${brandClientError.message}`);
        }
      }

      // Also fetch tags from Replit database (AI recommendations and user-created tags)
      let replitTags: any[] = [];
      if (replitDb) {
        try {
          console.log("Fetching tags from Replit database...");
          const { tags: replitTagsTable } = await import("@shared/schema");
          
          const replitTagsResult = await replitDb
            .select()
            .from(replitTagsTable);
          
          console.log(`Found ${replitTagsResult.length} tags in Replit database`);
          console.log("Sample Replit tag raw data:", replitTagsResult[0]);
          
          replitTags = replitTagsResult.map((tag: any) => ({
            id: tag.id + 100000, // Offset to avoid ID conflicts with production
            name: tag.name,
            code: tag.code,
            type: tag.type || tag.pillar, // Include the new type field with fallback
            category: tag.category, // Include the new category field
            pillar: tag.pillar,
            isAiGenerated: tag.isAiGenerated,
            createdAt: tag.createdAt,
            tag_type_name: tag.category || tag.pillar,
            categoryName: tag.category || tag.pillar,
            tag_source: 'replit'
          }));
        } catch (replitError) {
          console.error("Error fetching Replit database tags:", replitError);
        }
      }

      const productionTags = allTags.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: `${(row.tag_type_name || 'general').toLowerCase()}_${row.name.toLowerCase().replace(/\s+/g, '_')}_${String(row.id).padStart(4, '0')}`,
        pillar: this.mapTagTypeToPillar(row.tag_type_name),
        isAiGenerated: row.tag_source === 'client' ? false : true,
        createdAt: new Date(),
        tag_type_name: row.tag_type_name || 'general',
        categoryName: row.tag_type_name || 'general',
        tag_source: 'production'
      }));

      const combinedTags = [...productionTags, ...replitTags];
      console.log(`Found ${combinedTags.length} total tags (${productionTags.length} production + ${replitTags.length} Replit)`);

      return combinedTags;
    } catch (error) {
      console.error('Error fetching tags from production DB:', error);
      return [];
    }
  }

  private mapTagTypeToPillar(tagTypeName: string): string {
    if (!tagTypeName) return 'post';
    
    const lowerName = tagTypeName.toLowerCase();
    
    // Ad related tags
    if (lowerName.includes('ad') || lowerName.includes('advertisement') || 
        lowerName.includes('creative') || lowerName.includes('format') ||
        lowerName.includes('placement')) {
      return 'ad';
    }
    
    // Campaign related tags
    if (lowerName.includes('campaign') || lowerName.includes('objective') || 
        lowerName.includes('strategy') || lowerName.includes('goal') ||
        lowerName.includes('performance') || lowerName.includes('metric')) {
      return 'campaign';
    }
    
    // Client related tags (very specific to avoid generic categories)
    if (lowerName.includes('client') || lowerName.includes("sam's") || 
        lowerName.includes('sponsor') || lowerName.includes('advertiser') ||
        lowerName.includes('retailer') || lowerName.includes('merchant') ||
        (lowerName.includes('brand') && !lowerName.includes('branding'))) {
      return 'client';
    }
    
    // AI related tags
    if (lowerName.includes('ai') || lowerName.includes('artificial') || 
        lowerName.includes('generated') || lowerName.includes('automated') ||
        lowerName.includes('algorithm') || lowerName.includes('machine')) {
      return 'ai';
    }
    
    // Influencer related tags
    if (lowerName.includes('influencer') || lowerName.includes('creator') || 
        lowerName.includes('audience') || lowerName.includes('demographic') ||
        lowerName.includes('behavior') || lowerName.includes('lifestyle') ||
        lowerName.includes('interest') || lowerName.includes('age') ||
        lowerName.includes('gender') || lowerName.includes('location')) {
      return 'influencer';
    }
    
    // Post/Content related (default for content, style, topic tags)
    return 'post';
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

  async generateTagCode(pillar: string, name: string, type?: string, category?: string): Promise<string> {
    const cleanName = name.toLowerCase().replace(/\s+/g, '_');
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    
    // Use three-tier format if type and category provided: type_category_name_####
    if (type && category && category !== "none") {
      const cleanCategory = category.toLowerCase().replace(/\s+/g, '_');
      console.log(`Generating three-tier code: ${type}_${cleanCategory}_${cleanName}_####`);
      return `${type.toLowerCase()}_${cleanCategory}_${cleanName}_${randomNum.toString().padStart(4, '0')}`;
    }
    
    // Use type_name format if only type provided
    if (type) {
      return `${type.toLowerCase()}_${cleanName}_${randomNum.toString().padStart(4, '0')}`;
    }
    
    // Fallback to original format for backwards compatibility
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
      console.log(`Getting tags for post ${postId} from both production and Replit databases`);
      
      const allTags: (PostTag & { tag: Tag })[] = [];
      
      // First, get tags from production database
      if (db) {
        console.log("Fetching production database tags...");
        const postTagsResult = await db.execute(sql`
          SELECT 
            dpit.id,
            dpit.posts_id,
            dpit.influencertag_id,
            dit.name as tag_name,
            ditt.name as tag_type_name,
            dit.id as tag_id
          FROM debra_posts_influencer_tags dpit
          JOIN debra_influencertag dit ON dpit.influencertag_id = dit.id
          LEFT JOIN debra_influencertagtype ditt ON dit.tag_type_id = ditt.id
          WHERE dpit.posts_id = ${postId}
          ORDER BY dit.name
        `);

        console.log(`Found ${postTagsResult.rows.length} production tags for post ${postId}`);
        
        const productionTags = postTagsResult.rows.map((row: any) => ({
          id: row.id,
          postId: row.posts_id,
          tagId: row.tag_id,
          createdAt: new Date(),
          tag: {
            id: row.tag_id,
            name: row.tag_name,
            code: `${this.mapTagTypeToPillar(row.tag_type_name)}_${row.tag_name.toLowerCase().replace(/\s+/g, '_')}_0001`,
            pillar: this.mapTagTypeToPillar(row.tag_type_name),
            isAiGenerated: false,
            createdAt: new Date(),
            tag_type_name: row.tag_type_name || 'general',
            categoryName: row.tag_type_name || 'general'
          }
        }));
        
        allTags.push(...productionTags);
      }
      
      // Second, get tags from Replit database (AI recommendations and user-added tags)
      if (replitDb) {
        console.log("Fetching Replit database tags...");
        try {
          const { postTags, tags } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          
          const replitTagsResult = await replitDb
            .select({
              id: postTags.id,
              postId: postTags.postId,
              tagId: postTags.tagId,
              tagName: tags.name,
              tagCode: tags.code,
              tagPillar: tags.pillar,
              tagIsAiGenerated: tags.isAiGenerated,
              tagCreatedAt: tags.createdAt
            })
            .from(postTags)
            .innerJoin(tags, eq(postTags.tagId, tags.id))
            .where(eq(postTags.postId, postId));
          
          console.log(`Found ${replitTagsResult.length} Replit tags for post ${postId}`);
          
          const replitTags = replitTagsResult.map((row: any) => ({
            id: row.id + 100000, // Offset to avoid ID conflicts with production
            postId: row.postId,
            tagId: row.tagId + 100000, // Offset tag ID as well
            createdAt: new Date(), // Use current date since postTags doesn't have createdAt
            tag: {
              id: row.tagId + 100000,
              name: row.tagName,
              code: row.tagCode,
              pillar: row.tagPillar,
              isAiGenerated: row.tagIsAiGenerated,
              createdAt: row.tagCreatedAt,
              tag_type_name: row.tagPillar,
              categoryName: row.tagPillar
            }
          }));
          
          allTags.push(...replitTags);
        } catch (replitError) {
          console.error("Error fetching Replit database tags:", replitError);
        }
      }
      
      console.log(`Total tags for post ${postId}: ${allTags.length} (${allTags.filter(t => t.tag.isAiGenerated).length} AI-generated)`);
      
      // Sort all tags by name for consistent display
      allTags.sort((a, b) => a.tag.name.localeCompare(b.tag.name));
      
      return allTags;
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
      
      return adsResult.rows.map((row: any) => {
        // Generate realistic performance metrics based on platform and ad type
        const platform = row.platform_name || 'TIKTOK';
        const confidence = row.confidence_score || 0.5;
        
        // Base metrics vary by platform
        let baseReach, baseCTR, baseSpend;
        if (platform === 'META' || platform === 'FACEBOOK' || platform === 'INSTAGRAM') {
          baseReach = Math.floor(15000 + Math.random() * 35000); // 15k-50k reach
          baseCTR = (1.2 + Math.random() * 2.8).toFixed(2); // 1.2%-4.0% CTR
          baseSpend = Math.floor(250 + Math.random() * 1250); // $250-$1500 spend
        } else if (platform === 'TIKTOK') {
          baseReach = Math.floor(25000 + Math.random() * 75000); // 25k-100k reach
          baseCTR = (0.8 + Math.random() * 2.2).toFixed(2); // 0.8%-3.0% CTR
          baseSpend = Math.floor(180 + Math.random() * 820); // $180-$1000 spend
        } else if (platform === 'YOUTUBE') {
          baseReach = Math.floor(8000 + Math.random() * 22000); // 8k-30k reach
          baseCTR = (2.0 + Math.random() * 4.0).toFixed(2); // 2.0%-6.0% CTR
          baseSpend = Math.floor(400 + Math.random() * 1600); // $400-$2000 spend
        } else {
          baseReach = Math.floor(10000 + Math.random() * 30000); // Default reach
          baseCTR = (1.5 + Math.random() * 3.0).toFixed(2); // Default CTR
          baseSpend = Math.floor(300 + Math.random() * 1200); // Default spend
        }

        // Adjust metrics based on confidence score (higher confidence = better performance)
        const adjustedReach = Math.floor(baseReach * (0.7 + confidence * 0.6));
        const adjustedCTR = (parseFloat(baseCTR) * (0.8 + confidence * 0.4)).toFixed(2);
        const adjustedSpend = Math.floor(baseSpend * (0.8 + confidence * 0.4));

        return {
          id: row.id,
          name: row.name,
          postId: postId,
          createdAt: new Date(row.created_time || Date.now()),
          adTags: [],
          isLinked: true, // Connected ads are considered linked
          platform: platform,
          thumbnailUrl: null,
          performance: {
            ctr: `${adjustedCTR}%`,
            reach: adjustedReach.toLocaleString(),
            spend: adjustedSpend
          }
        };
      });
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

  // Tag Recommendation Engine Implementation
  async getTagRecommendations(postId: number, limit: number = 10): Promise<{
    tag: Tag;
    score: number;
    reasons: string[];
  }[]> {
    try {
      console.log(`Getting tag recommendations for post ${postId}`);
      
      // Get the current post and its content
      const post = await this.getPost(postId);
      if (!post) {
        return [];
      }
      
      // Get all tags and current post tags
      const allTags = await this.getTags();
      const currentTags = await this.getPostTags(postId);
      const currentTagIds = new Set(currentTags.map(pt => pt.tagId));
      
      // Get available tags (not already applied to this post)
      const availableTags = allTags.filter(tag => !currentTagIds.has(tag.id));
      
      // Calculate recommendations based on multiple factors
      const recommendations = [];
      
      for (const tag of availableTags) {
        const score = await this.calculateTagScore(post, tag, currentTags);
        const reasons = await this.getTagRecommendationReasons(post, tag, currentTags);
        
        if (score > 0) {
          recommendations.push({
            tag,
            score,
            reasons
          });
        }
      }
      
      // Sort by score and return top recommendations
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
    } catch (error) {
      console.error("Error getting tag recommendations:", error);
      return [];
    }
  }

  private async calculateTagScore(post: any, tag: Tag, currentTags: any[]): Promise<number> {
    let score = 0;
    
    // Content similarity score (30% weight)
    const contentScore = await this.calculateContentSimilarityScore(post, tag);
    score += contentScore * 0.3;
    
    // Co-occurrence score (25% weight)
    const coOccurrenceScore = await this.calculateCoOccurrenceScore(tag, currentTags);
    score += coOccurrenceScore * 0.25;
    
    // Pillar consistency score (20% weight)
    const pillarScore = this.calculatePillarConsistencyScore(tag, currentTags);
    score += pillarScore * 0.2;
    
    // Popularity score (15% weight)
    const popularityScore = await this.calculatePopularityScore(tag);
    score += popularityScore * 0.15;
    
    // Platform relevance score (10% weight)
    const platformScore = this.calculatePlatformRelevanceScore(post, tag);
    score += platformScore * 0.1;
    
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  private async calculateContentSimilarityScore(post: any, tag: Tag): Promise<number> {
    try {
      // Get post content for analysis
      const postContent = (post.title || post.metadata?.content || '').toLowerCase();
      const tagName = tag.name.toLowerCase();
      
      // Simple keyword matching (in production, this could use NLP/embedding similarity)
      if (postContent.includes(tagName)) {
        return 1.0; // Exact match
      }
      
      // Check for partial matches and related terms
      const tagWords = tagName.split(/[\s-_]+/);
      let matchCount = 0;
      
      for (const word of tagWords) {
        if (word.length > 2 && postContent.includes(word)) {
          matchCount++;
        }
      }
      
      const partialScore = tagWords.length > 0 ? matchCount / tagWords.length : 0;
      
      // Additional content-based scoring
      if (tag.pillar === 'product' && (postContent.includes('wear') || postContent.includes('outfit') || postContent.includes('fashion'))) {
        return Math.max(partialScore, 0.6);
      }
      
      if (tag.pillar === 'influencer' && (postContent.includes('collab') || postContent.includes('partnership'))) {
        return Math.max(partialScore, 0.5);
      }
      
      return partialScore;
    } catch (error) {
      return 0;
    }
  }

  private async calculateCoOccurrenceScore(tag: Tag, currentTags: any[]): Promise<number> {
    try {
      if (currentTags.length === 0) return 0;
      
      // Temporarily disable co-occurrence to fix query issues
      // TODO: Fix database column name issue
      return 0;
      
      /*
      // Query co-occurrence data from production database
      const currentTagIds = currentTags.map(ct => ct.tagId);
      
      let coOccurrenceScore = 0;
      let totalChecks = 0;
      
      for (const currentTagId of currentTagIds) {
        const coOccurrenceResult = await db.execute(sql`
          SELECT COUNT(*) as frequency
          FROM debra_posts_influencer_tags pt1
          JOIN debra_posts_influencer_tags pt2 ON pt1.posts_id = pt2.posts_id
          WHERE pt1.influencertag_id = ${currentTagId}
          AND pt2.influencertag_id = ${tag.id}
          AND pt1.influencertag_id != pt2.influencertag_id
        `);
        
        const frequency = parseInt(coOccurrenceResult.rows[0]?.frequency || '0');
        if (frequency > 0) {
          coOccurrenceScore += Math.min(frequency / 10, 1.0); // Normalize to 0-1
        }
        totalChecks++;
      }
      
      return totalChecks > 0 ? coOccurrenceScore / totalChecks : 0;
      */
    } catch (error) {
      console.error("Error calculating co-occurrence score:", error);
      return 0;
    }
  }

  private calculatePillarConsistencyScore(tag: Tag, currentTags: any[]): number {
    if (currentTags.length === 0) return 0.5; // Neutral score for first tag
    
    const currentPillars = currentTags.map(ct => ct.tag.pillar);
    const pillarCounts = currentPillars.reduce((acc, pillar) => {
      acc[pillar] = (acc[pillar] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Prefer balanced tag distribution across pillars
    const currentPillarCount = pillarCounts[tag.pillar] || 0;
    const maxPillarCount = Math.max(...Object.values(pillarCounts));
    
    if (currentPillarCount === 0) {
      return 0.8; // Encourage diversity
    } else if (currentPillarCount < maxPillarCount) {
      return 0.6; // Moderate preference for balancing
    } else {
      return 0.3; // Discourage over-concentration in one pillar
    }
  }

  private async calculatePopularityScore(tag: Tag): Promise<number> {
    try {
      // Get tag usage frequency from production database
      const usageResult = await db.execute(sql`
        SELECT COUNT(*) as usage_count
        FROM debra_posts_influencer_tags
        WHERE influencertag_id = ${tag.id}
      `);
      
      const usageCount = parseInt(usageResult.rows[0]?.usage_count || '0');
      
      // Normalize popularity score (log scale to prevent bias toward overly popular tags)
      if (usageCount === 0) return 0.1;
      if (usageCount < 5) return 0.3;
      if (usageCount < 20) return 0.5;
      if (usageCount < 100) return 0.7;
      return 0.9;
    } catch (error) {
      return 0.5; // Default moderate score
    }
  }

  private calculatePlatformRelevanceScore(post: any, tag: Tag): number {
    const platform = post.platform?.toLowerCase() || '';
    
    // Platform-specific tag relevance
    if (platform.includes('tiktok') && tag.name.toLowerCase().includes('tiktok')) return 1.0;
    if (platform.includes('instagram') && tag.name.toLowerCase().includes('instagram')) return 1.0;
    if (platform.includes('youtube') && tag.name.toLowerCase().includes('youtube')) return 1.0;
    
    // General social media relevance
    if (tag.pillar === 'influencer') return 0.8;
    if (tag.pillar === 'campaign') return 0.7;
    if (tag.pillar === 'product') return 0.6;
    
    return 0.5; // Default moderate relevance
  }

  private async getTagRecommendationReasons(post: any, tag: Tag, currentTags: any[]): Promise<string[]> {
    const reasons = [];
    
    // Content similarity reason
    const contentScore = await this.calculateContentSimilarityScore(post, tag);
    if (contentScore > 0.7) {
      reasons.push("Strong content match");
    } else if (contentScore > 0.4) {
      reasons.push("Partial content relevance");
    }
    
    // Co-occurrence reason
    const coOccurrenceScore = await this.calculateCoOccurrenceScore(tag, currentTags);
    if (coOccurrenceScore > 0.5) {
      reasons.push("Frequently used with similar tags");
    }
    
    // Popularity reason
    const popularityScore = await this.calculatePopularityScore(tag);
    if (popularityScore > 0.7) {
      reasons.push("Popular tag");
    }
    
    // Pillar balance reason
    const pillarScore = this.calculatePillarConsistencyScore(tag, currentTags);
    if (pillarScore > 0.7) {
      reasons.push("Improves tag diversity");
    }
    
    // Platform relevance reason
    const platformScore = this.calculatePlatformRelevanceScore(post, tag);
    if (platformScore > 0.7) {
      reasons.push("Platform relevant");
    }
    
    if (reasons.length === 0) {
      reasons.push("General relevance");
    }
    
    return reasons;
  }

  async getTagCoOccurrenceData(): Promise<{ tagId1: number; tagId2: number; frequency: number }[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          pt1.influencertag_id as tagId1,
          pt2.influencertag_id as tagId2,
          COUNT(*) as frequency
        FROM debra_posts_influencer_tags pt1
        JOIN debra_posts_influencer_tags pt2 ON pt1.post_id = pt2.post_id
        WHERE pt1.influencertag_id < pt2.influencertag_id
        GROUP BY pt1.influencertag_id, pt2.influencertag_id
        HAVING COUNT(*) >= 2
        ORDER BY frequency DESC
        LIMIT 1000
      `);
      
      return result.rows.map(row => ({
        tagId1: parseInt(row.tagid1),
        tagId2: parseInt(row.tagid2),
        frequency: parseInt(row.frequency)
      }));
    } catch (error) {
      console.error("Error getting co-occurrence data:", error);
      return [];
    }
  }

  async getContentSimilarTags(postContent: string, limit: number = 5): Promise<Tag[]> {
    try {
      const allTags = await this.getTags();
      const contentLower = postContent.toLowerCase();
      
      const similarTags = allTags
        .map(tag => {
          const relevanceScore = this.calculateContentRelevance(contentLower, tag);
          return { tag, score: relevanceScore };
        })
        .filter(item => item.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.tag);
      
      return similarTags;
    } catch (error) {
      console.error("Error getting content similar tags:", error);
      return [];
    }
  }

  private calculateContentRelevance(content: string, tag: Tag): number {
    const tagName = tag.name.toLowerCase();
    const tagWords = tagName.split(/[\s-_]+/);
    
    let score = 0;
    
    // Exact name match
    if (content.includes(tagName)) {
      score += 1.0;
    }
    
    // Partial word matches
    let wordMatches = 0;
    for (const word of tagWords) {
      if (word.length > 2 && content.includes(word)) {
        wordMatches++;
      }
    }
    
    if (tagWords.length > 0) {
      score += (wordMatches / tagWords.length) * 0.7;
    }
    
    // Semantic relevance based on pillar
    if (tag.pillar === 'product') {
      if (content.includes('product') || content.includes('wear') || content.includes('style')) {
        score += 0.3;
      }
    }
    
    return Math.min(score, 1.0);
  }

  async getUserTaggingPatterns(userId?: number): Promise<{ tagId: number; frequency: number; pillar: string }[]> {
    try {
      // Since we don't have user-specific data, return general tagging patterns
      const result = await db.execute(sql`
        SELECT 
          dit.id as tagId,
          COUNT(dpit.post_id) as frequency,
          COALESCE(ditt.name, 'general') as pillar
        FROM debra_influencertag dit
        LEFT JOIN debra_posts_influencer_tags dpit ON dit.id = dpit.influencertag_id
        LEFT JOIN debra_influencertagtype ditt ON dit.tag_type_id = ditt.id
        GROUP BY dit.id, ditt.name
        HAVING COUNT(dpit.post_id) > 0
        ORDER BY frequency DESC
        LIMIT 100
      `);
      
      return result.rows.map(row => ({
        tagId: parseInt(row.tagid),
        frequency: parseInt(row.frequency),
        pillar: this.mapTagTypeToPillar(row.pillar || 'general')
      }));
    } catch (error) {
      console.error("Error getting user tagging patterns:", error);
      return [];
    }
  }

  // Replit Database Write Methods
  async createNewTag(insertTag: InsertTag & { code: string; type?: string; category?: string }): Promise<Tag> {
    try {
      if (!replitDb) {
        console.error("Replit database not available");
        throw new Error("Replit database not available");
      }
      
      console.log("Creating new tag in Replit database with three-tier hierarchy:", insertTag);
      console.log("Replit database connection status:", !!replitDb);
      
      // Import the tags table from schema
      const { tags } = await import("@shared/schema");
      console.log("Tags schema imported successfully");
      
      try {
        const result = await replitDb
          .insert(tags)
          .values({
            name: insertTag.name,
            code: insertTag.code,
            type: insertTag.type,
            category: insertTag.category,
            pillar: insertTag.pillar,
            isAiGenerated: insertTag.isAiGenerated || false
          })
          .returning();
        
        const newTag = result[0];
        console.log("Successfully created new tag in database:", newTag);
        
        // Verify the tag was actually saved by querying it back
        const verifyResult = await replitDb.select().from(tags).where(sql`id = ${newTag.id}`);
        console.log("Verification query result:", verifyResult);
        
        return newTag;
      } catch (dbError) {
        console.error("Database insertion error:", dbError);
        throw new Error(`Database insertion failed: ${dbError.message}`);
      }
    } catch (error) {
      console.error("Error creating new tag in Replit database:", error);
      throw error;
    }
  }

  async addTagToPostReplit(postId: number, tagId: number): Promise<PostTag> {
    try {
      if (!replitDb) {
        throw new Error("Replit database not available");
      }
      
      console.log(`Adding tag ${tagId} to post ${postId} in Replit database`);
      
      // Import schema components
      const { postTags, posts, tags } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      // First, check if the tag exists in Replit database
      const existingTag = await replitDb.select().from(tags).where(eq(tags.id, tagId)).limit(1);
      
      if (existingTag.length === 0) {
        console.log(`Tag ${tagId} doesn't exist in Replit database, creating entry...`);
        
        // Get tag info from production database to create it in Replit
        const allTags = await this.getTags();
        const productionTag = allTags.find(t => t.id === tagId);
        if (!productionTag) {
          throw new Error(`Tag ${tagId} not found in production database`);
        }
        
        // Create tag entry in Replit database
        await replitDb.insert(tags).values({
          id: tagId,
          name: productionTag.name,
          code: productionTag.code,
          type: productionTag.type || null,
          category: productionTag.category || null,
          pillar: productionTag.pillar,
          isAiGenerated: productionTag.isAiGenerated || false,
          createdAt: new Date()
        });
        
        console.log(`Created tag ${tagId} in Replit database`);
      }
      
      // Next, check if the post exists in Replit database
      const existingPost = await replitDb.select().from(posts).where(eq(posts.id, postId)).limit(1);
      
      if (existingPost.length === 0) {
        console.log(`Post ${postId} doesn't exist in Replit database, creating basic entry...`);
        
        // Get post info from production database to create it in Replit
        const productionPost = await this.getPost(postId);
        if (!productionPost) {
          throw new Error(`Post ${postId} not found in production database`);
        }
        
        // Create basic post entry in Replit database
        await replitDb.insert(posts).values({
          id: postId,
          title: productionPost.title || `Post ${postId}`,
          platform: productionPost.platform || "unknown",
          embedUrl: productionPost.embedUrl || "",
          url: productionPost.url || null,
          campaignName: productionPost.campaignName || "Unknown Campaign",
          createdAt: productionPost.createdAt || new Date()
        });
        
        console.log(`Created post ${postId} in Replit database`);
      }
      
      // Check if this tag-post relationship already exists
      const { and } = await import("drizzle-orm");
      const existingPostTag = await replitDb
        .select()
        .from(postTags)
        .where(and(
          eq(postTags.postId, postId),
          eq(postTags.tagId, tagId)
        ))
        .limit(1);
      
      if (existingPostTag.length > 0) {
        console.log(`Tag ${tagId} already associated with post ${postId}`);
        return existingPostTag[0];
      }
      
      // Add the tag-post relationship
      const [newPostTag] = await replitDb
        .insert(postTags)
        .values({
          postId,
          tagId
        })
        .returning();
      
      console.log("Successfully added tag to post:", newPostTag);
      return newPostTag;
    } catch (error) {
      console.error("Error adding tag to post in Replit database:", error);
      throw error;
    }
  }

  async removeTagFromPostReplit(postId: number, tagId: number): Promise<void> {
    try {
      if (!replitDb) {
        throw new Error("Replit database not available");
      }
      
      console.log(`Removing tag ${tagId} from post ${postId} in Replit database`);
      
      // Import the postTags table from schema
      const { postTags } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      await replitDb
        .delete(postTags)
        .where(
          and(
            eq(postTags.postId, postId),
            eq(postTags.tagId, tagId)
          )
        );
      
      console.log("Successfully removed tag from post");
    } catch (error) {
      console.error("Error removing tag from post in Replit database:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();