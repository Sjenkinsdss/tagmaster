import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertTagSchema, insertPaidAdSchema, type InsertTag } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Personalized category recommendation system
async function getPersonalizedCategories(tagType: string) {
  try {
    // Define category mappings for different tag types
    const categoryMappings = {
      'ad': [
        'creative', 'campaign', 'targeting', 'placement', 'optimization', 'performance', 
        'brand', 'platform', 'boosted', 'paid', 'media', 'treatment', 
        'app', 'store', 'partnership', 'miscellaneous'
      ],
      'campaign': [
        'timing', 'seasonality', 'brand', 'campaign', 'optimization', 'targeting', 
        'geography', 'vertical', 'holiday', 'season', 'name', 'client', 'brand'
      ],
      'client': [
        'brand', 'vertical', 'category', 'client', 'partnership', 'collaboration', 
        'avon', 'sams', 'subcategory'
      ],
      'post': [
        'content', 'creative', 'style', 'production', 'niche', 'topics', 'audience', 
        'engagement', 'length', 'humor', 'setting', 'trend', 'hook', 'location', 
        'product', 'subject', 'timing', 'stylistic', 'energy', 'features', 
        'people', 'pets', 'physical', 'diy', 'tactic'
      ],
      'ai': [
        'automation', 'optimization', 'performance', 'targeting', 'analytics', 
        'insights', 'behavior', 'features', 'treatment'
      ],
      'influencer': [
        'niche', 'topics', 'audience', 'demographics', 'engagement', 'creative', 
        'content', 'personality', 'influencer', 'age', 'type', 'schtick', 'profession', 
        'race', 'ethnicity', 'size', 'people', 'pets', 'physical', 'sexual', 
        'orientation', 'inclusivity', 'gender', 'negotiation'
      ]
    };

    const relevantKeywords = categoryMappings[tagType.toLowerCase()] || [];
    
    if (relevantKeywords.length === 0) {
      // Fallback to all categories if tag type not found
      const allCategoriesResult = await db.execute(sql`
        SELECT 
          ditt.id,
          ditt.name as category_name,
          COUNT(dit.id) as tag_count
        FROM debra_influencertagtype ditt
        LEFT JOIN debra_influencertag dit ON ditt.id = dit.tag_type_id
        WHERE ditt.name IS NOT NULL 
        AND ditt.name != ''
        GROUP BY ditt.id, ditt.name
        HAVING COUNT(dit.id) > 0
        ORDER BY ditt.name
      `);

      return allCategoriesResult.rows.map((row: any) => ({
        id: row.id,
        name: row.category_name,
        tagCount: row.tag_count,
        relevanceScore: 0.5
      }));
    }

    // Get all categories first
    const allCategoriesResult = await db.execute(sql`
      SELECT 
        ditt.id,
        ditt.name as category_name,
        COUNT(dit.id) as tag_count
      FROM debra_influencertagtype ditt
      LEFT JOIN debra_influencertag dit ON ditt.id = dit.tag_type_id
      WHERE ditt.name IS NOT NULL 
      AND ditt.name != ''
      GROUP BY ditt.id, ditt.name
      HAVING COUNT(dit.id) > 0
      ORDER BY ditt.name
    `);

    // Apply strict filtering and scoring for only relevant categories
    const categories = allCategoriesResult.rows
      .map((row: any) => {
        const categoryName = row.category_name.toLowerCase();
        
        // Check if category name matches any relevant keywords with better precision
        const isRelevant = relevantKeywords.some(keyword => {
          const keywordLower = keyword.toLowerCase();
          const categoryLower = categoryName.toLowerCase();
          
          // More precise matching: word boundaries and partial matches
          return categoryLower.includes(keywordLower) || 
                 categoryLower.split(/[:\s\-_]+/).some(word => 
                   word.includes(keywordLower) || keywordLower.includes(word)
                 );
        });

        // Apply tag type specific exclusions
        const hasExclusions = (() => {
          if (tagType.toLowerCase() === 'ad') {
            // Exclude vertical categories from ad tags
            return categoryName.toLowerCase().includes('vertical');
          }
          return false;
        })();

        const finalRelevant = isRelevant && !hasExclusions;
        
        // Calculate relevance score
        const relevanceScore = finalRelevant ? 1.0 : 0.0;
        
        // Calculate usage frequency (normalized by total categories)
        const usageFrequency = parseFloat(row.tag_count) / Math.max(allCategoriesResult.rows.length, 1);
        
        // Calculate final score (80% relevance, 20% usage)
        const finalScore = relevanceScore * 0.8 + usageFrequency * 0.2;
        
        return {
          id: row.id,
          name: row.category_name,
          tagCount: row.tag_count,
          relevanceScore: finalScore,
          usageFrequency: usageFrequency,
          isRelevant: finalRelevant,
          isRecommended: relevanceScore > 0.0
        };
      })
      // Only show categories that are relevant to the tag type
      .filter(category => category.isRelevant);

    // Sort by relevance and return all relevant categories (no limit)
    const categoriesResult = {
      rows: categories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
    };

    return categoriesResult.rows;

  } catch (error) {
    console.error("Error in getPersonalizedCategories:", error);
    // Fallback to basic query
    const fallbackResult = await db.execute(sql`
      SELECT 
        ditt.id,
        ditt.name as category_name,
        COUNT(dit.id) as tag_count
      FROM debra_influencertagtype ditt
      LEFT JOIN debra_influencertag dit ON ditt.id = dit.tag_type_id
      WHERE ditt.name IS NOT NULL 
      AND ditt.name != ''
      GROUP BY ditt.id, ditt.name
      HAVING COUNT(dit.id) > 0
      ORDER BY ditt.name
      LIMIT 20
    `);

    return fallbackResult.rows.map((row: any) => ({
      id: row.id,
      name: row.category_name,
      tagCount: row.tag_count,
      relevanceScore: 0.5
    }));
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test route for direct database connection
  app.get("/api/test-db", async (req, res) => {
    try {
      const tablesResult = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
      const tables = tablesResult.rows;
      
      res.json({ success: true, tables });
    } catch (error) {
      console.error("Database test error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Test posts query directly
  app.get("/api/test-posts", async (req, res) => {
    try {
      const postsResult = await db.execute(sql`
        SELECT 
          id,
          COALESCE(title, content, 'Untitled Post') as display_title,
          platform_name as platform
        FROM debra_posts 
        LIMIT 5
      `);
      
      res.json({ success: true, posts: postsResult.rows });
    } catch (error) {
      console.error("Posts test error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Get campaign data from debra_brandjobpost title column
  app.get("/api/campaigns", async (req, res) => {
    try {
      // Get campaign names from debra_brandjobpost title column
      const campaignResult = await db.execute(sql`
        SELECT 
          title as campaign_name,
          COUNT(*) as post_count
        FROM debra_brandjobpost 
        WHERE title IS NOT NULL 
        AND title != ''
        GROUP BY title
        ORDER BY post_count DESC
        LIMIT 50
      `);
      
      // Add the default campaign
      const campaigns = [
        { campaign_name: '2025 Annual: Weekday', post_count: 50 },
        ...campaignResult.rows
      ];
      
      res.json({ success: true, campaigns });
    } catch (error) {
      console.error("Campaign query error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Get table structure
  app.get("/api/table-structure/:tableName", async (req, res) => {
    try {
      const tableName = req.params.tableName;
      const structureResult = await db.execute(sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = ${tableName} ORDER BY ordinal_position`);
      
      // Sample data (with safe identifier)
      const sampleResult = await db.execute(sql.raw(`SELECT * FROM ${tableName} LIMIT 5`));
      
      res.json({ success: true, structure: structureResult.rows, sampleData: sampleResult.rows });
    } catch (error) {
      console.error("Table structure error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Create tables in production database
  app.post("/api/create-tables", async (req, res) => {
    try {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.execute(sql`CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        platform TEXT NOT NULL,
        embed_url TEXT,
        thumbnail_url TEXT,
        campaign_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )`);

      await db.execute(sql`CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        pillar TEXT NOT NULL,
        is_ai_generated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.execute(sql`CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id, tag_id)
      )`);

      await db.execute(sql`CREATE TABLE IF NOT EXISTS paid_ads (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL,
        ad_url TEXT NOT NULL,
        thumbnail_url TEXT,
        campaign_name TEXT,
        post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.execute(sql`CREATE TABLE IF NOT EXISTS ad_tags (
        ad_id INTEGER REFERENCES paid_ads(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ad_id, tag_id)
      )`);

      res.json({ success: true, message: "Tables created successfully" });
    } catch (error) {
      console.error("Database creation error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Raw query endpoint for debugging
  app.post("/api/raw-query", async (req, res) => {
    try {
      const { query } = req.body;
      const result = await db.execute(sql.raw(query));
      res.json({ success: true, result: result.rows });
    } catch (error) {
      console.error("Raw query error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getPostsPaginated(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts", error: String(error) });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Tags routes
  app.get("/api/tags", async (req, res) => {
    try {
      const { pillar } = req.query;
      const tags = pillar 
        ? await storage.getTagsByPillar(pillar as string)
        : await storage.getTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags", error: String(error) });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      
      // Generate unique code using three-tier format if available
      console.log("Generating code with params:", {
        pillar: tagData.pillar,
        name: tagData.name,
        type: tagData.type,
        category: tagData.category
      });
      const code = await storage.generateTagCode(
        tagData.pillar, 
        tagData.name, 
        tagData.type, 
        tagData.category
      );
      
      // Use createNewTag to save to Replit database
      const tag = await storage.createNewTag({
        ...tagData,
        code,
        isAiGenerated: tagData.isAiGenerated || false
      });
      
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tag data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create tag", error: String(error) });
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertTagSchema.partial().parse(req.body);
      
      // If name is being updated, regenerate code
      let updatesWithCode: Partial<InsertTag & { code: string }> = updates;
      if (updates.name && updates.pillar) {
        const code = await storage.generateTagCode(updates.pillar, updates.name);
        updatesWithCode = { ...updates, code };
      }
      
      const tag = await storage.updateTag(id, updatesWithCode);
      res.json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tag data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update tag" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTag(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // Enhanced Tag Categories with Personalized Recommendations
  app.get("/api/tag-categories", async (req, res) => {
    try {
      const tagType = req.query.tagType as string;
      
      // If no tag type specified, return all categories (legacy behavior)
      if (!tagType) {
        const categoriesResult = await db.execute(sql`
          SELECT 
            ditt.id,
            ditt.name as category_name,
            COUNT(dit.id) as tag_count
          FROM debra_influencertagtype ditt
          LEFT JOIN debra_influencertag dit ON ditt.id = dit.tag_type_id
          WHERE ditt.name IS NOT NULL 
          AND ditt.name != ''
          GROUP BY ditt.id, ditt.name
          HAVING COUNT(dit.id) > 0
          ORDER BY ditt.name
        `);

        const categories = categoriesResult.rows.map((row: any) => ({
          id: row.id,
          name: row.category_name,
          tagCount: row.tag_count
        }));

        return res.json({ success: true, categories });
      }

      // Personalized category recommendations based on tag type
      const personalizedCategories = await getPersonalizedCategories(tagType);
      res.json({ success: true, categories: personalizedCategories, tagType });
    } catch (error) {
      console.error("Error fetching tag categories:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get("/api/tags-by-category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      const tagsResult = await db.execute(sql`
        SELECT 
          dit.id,
          dit.name as tag_name,
          dit.tag_type_id,
          ditt.name as category_name
        FROM debra_influencertag dit
        JOIN debra_influencertagtype ditt ON dit.tag_type_id = ditt.id
        WHERE dit.tag_type_id = ${categoryId}
        AND dit.name IS NOT NULL 
        AND dit.name != ''
        AND TRIM(dit.name) != ''
        ORDER BY dit.name
      `);

      const tags = tagsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.tag_name,
        categoryId: row.tag_type_id,
        categoryName: row.category_name
      }));

      res.json({ success: true, tags, categoryId });
    } catch (error) {
      console.error("Error fetching tags by category:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Post-Tag relationship routes
  app.get("/api/posts/:postId/tags", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const postTags = await storage.getPostTags(postId);
      res.json(postTags);
    } catch (error) {
      console.error("Error fetching tags for post:", error);
      res.status(500).json({ message: "Failed to fetch tags for post" });
    }
  });

  app.post("/api/posts/:postId/tags", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const { tagId } = req.body;
      
      // Return error for read-only database
      res.status(403).json({ 
        message: "Cannot modify data: Connected to read-only production database",
        error: "READONLY_DATABASE",
        details: "This interface is connected to a live production database with read-only access for safety."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to add tag to post" });
    }
  });

  app.delete("/api/posts/:postId/tags/:tagId", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const tagId = parseInt(req.params.tagId);
      
      // Return error for read-only database
      res.status(403).json({ 
        message: "Cannot modify data: Connected to read-only production database",
        error: "READONLY_DATABASE",
        details: "This interface is connected to a live production database with read-only access for safety."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove tag from post" });
    }
  });

  // Advanced Tag Operations Routes
  app.post("/api/tags/merge", async (req, res) => {
    try {
      // Return error for read-only database
      res.status(403).json({ 
        message: "Cannot modify data: Connected to read-only production database",
        error: "READONLY_DATABASE",
        details: "Tag merge operations are not available in read-only mode."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to merge tags" });
    }
  });

  app.post("/api/tags/split", async (req, res) => {
    try {
      // Return error for read-only database
      res.status(403).json({ 
        message: "Cannot modify data: Connected to read-only production database",
        error: "READONLY_DATABASE",
        details: "Tag split operations are not available in read-only mode."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to split tag" });
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      // Return error for read-only database
      res.status(403).json({ 
        message: "Cannot modify data: Connected to read-only production database",
        error: "READONLY_DATABASE",
        details: "Tag editing is not available in read-only mode."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update tag" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      // Return error for read-only database
      res.status(403).json({ 
        message: "Cannot modify data: Connected to read-only production database",
        error: "READONLY_DATABASE",
        details: "Tag deletion is not available in read-only mode."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // Paid Ads routes
  app.get("/api/paid-ads", async (req, res) => {
    try {
      const { postId } = req.query;
      const ads = postId 
        ? await storage.getPaidAdsByPost(parseInt(postId as string))
        : await storage.getPaidAds();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch paid ads" });
    }
  });

  // Get ads for a specific post
  app.get("/api/posts/:postId/ads", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const ads = await storage.getPaidAdsByPost(postId);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching ads for post:", error);
      res.status(500).json({ message: "Failed to fetch ads for post" });
    }
  });

  app.post("/api/paid-ads", async (req, res) => {
    try {
      const adData = insertPaidAdSchema.parse(req.body);
      const ad = await storage.createPaidAd(adData);
      res.status(201).json(ad);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ad data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create paid ad" });
    }
  });

  app.put("/api/paid-ads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertPaidAdSchema.partial().parse(req.body);
      
      const ad = await storage.updatePaidAd(id, updates);
      res.json(ad);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ad data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update paid ad" });
    }
  });

  app.post("/api/paid-ads/:id/unlink", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.unlinkPaidAd(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to unlink paid ad" });
    }
  });

  app.post("/api/paid-ads/:id/relink", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { postId } = req.body;
      
      await storage.relinkPaidAd(id, postId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to relink paid ad" });
    }
  });

  // Tag Recommendation Engine API Routes
  app.get("/api/posts/:postId/tag-recommendations", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      console.log(`Getting tag recommendations for post ${postId}`);
      const recommendations = await storage.getTagRecommendations(postId, limit);
      
      res.json({
        success: true,
        postId,
        recommendations,
        total: recommendations.length
      });
    } catch (error) {
      console.error("Error getting tag recommendations:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get tag recommendations",
        error: String(error)
      });
    }
  });

  // Apply AI recommendation - creates tag in Replit DB and connects to post
  app.post("/api/posts/:postId/apply-recommendation", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const { tagId } = req.body;
      
      console.log(`Applying AI recommendation: tag ${tagId} to post ${postId}`);
      
      // First, check if this is a production tag that needs to be recreated in Replit DB
      const allTags = await storage.getTags();
      const sourceTag = allTags.find(t => t.id === tagId);
      
      if (!sourceTag) {
        return res.status(404).json({
          success: false,
          message: "Tag not found"
        });
      }
      
      let replitTagId = tagId;
      
      // If this is a production tag (ID < 100000), create it in Replit DB
      if (tagId < 100000) {
        console.log(`Creating production tag "${sourceTag.name}" in Replit database`);
        
        // Generate a new code for the Replit tag
        const newCode = await storage.generateTagCode(sourceTag.pillar, sourceTag.name);
        
        // Create the tag in Replit DB
        const newTag = await storage.createNewTag({
          name: sourceTag.name,
          pillar: sourceTag.pillar,
          isAiGenerated: true,
          code: newCode
        });
        
        replitTagId = newTag.id;
        console.log(`Created new tag in Replit DB with ID: ${replitTagId}`);
      }
      
      // Add the tag to the post in Replit DB
      const postTag = await storage.addTagToPostReplit(postId, replitTagId);
      
      res.json({
        success: true,
        postTag,
        tagId: replitTagId,
        message: "AI recommendation applied successfully"
      });
    } catch (error) {
      console.error("Error applying AI recommendation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply AI recommendation",
        error: String(error)
      });
    }
  });

  app.get("/api/tag-analytics/co-occurrence", async (req, res) => {
    try {
      console.log("Getting tag co-occurrence data");
      const coOccurrenceData = await storage.getTagCoOccurrenceData();
      
      res.json({
        success: true,
        data: coOccurrenceData,
        total: coOccurrenceData.length
      });
    } catch (error) {
      console.error("Error getting co-occurrence data:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get tag co-occurrence data",
        error: String(error)
      });
    }
  });

  app.post("/api/content/similar-tags", async (req, res) => {
    try {
      const { content, limit = 5 } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Content text is required"
        });
      }
      
      console.log("Getting content-similar tags for:", content.substring(0, 100) + "...");
      const similarTags = await storage.getContentSimilarTags(content, limit);
      
      res.json({
        success: true,
        tags: similarTags,
        total: similarTags.length
      });
    } catch (error) {
      console.error("Error getting content-similar tags:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get content-similar tags",
        error: String(error)
      });
    }
  });

  app.get("/api/user/tagging-patterns", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      console.log("Getting user tagging patterns for user:", userId || "general");
      const patterns = await storage.getUserTaggingPatterns(userId);
      
      res.json({
        success: true,
        patterns,
        total: patterns.length
      });
    } catch (error) {
      console.error("Error getting user tagging patterns:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get user tagging patterns",
        error: String(error)
      });
    }
  });

  // Replit Database Write Operations
  app.post("/api/tags/create", async (req, res) => {
    try {
      const { name, pillar, code, isAiGenerated } = req.body;
      
      if (!name || !pillar || !code) {
        return res.status(400).json({
          success: false,
          message: "Name, pillar, and code are required"
        });
      }
      
      console.log("Creating new tag:", { name, pillar, code, isAiGenerated });
      
      const newTag = await storage.createNewTag({
        name,
        pillar,
        code,
        isAiGenerated: isAiGenerated || false
      });
      
      res.json({
        success: true,
        tag: newTag,
        message: "Tag created successfully"
      });
    } catch (error) {
      console.error("Error creating new tag:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create tag",
        error: String(error)
      });
    }
  });

  app.post("/api/posts/:postId/tags/:tagId/replit", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const tagId = parseInt(req.params.tagId);
      
      console.log(`Adding tag ${tagId} to post ${postId} in Replit database`);
      
      const postTag = await storage.addTagToPostReplit(postId, tagId);
      
      res.json({
        success: true,
        postTag,
        message: "Tag added to post successfully"
      });
    } catch (error) {
      console.error("Error adding tag to post:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add tag to post",
        error: String(error)
      });
    }
  });

  app.delete("/api/posts/:postId/tags/:tagId/replit", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const tagId = parseInt(req.params.tagId);
      
      console.log(`Removing tag ${tagId} from post ${postId} in Replit database`);
      
      await storage.removeTagFromPostReplit(postId, tagId);
      
      res.json({
        success: true,
        message: "Tag removed from post successfully"
      });
    } catch (error) {
      console.error("Error removing tag from post:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove tag from post",
        error: String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
