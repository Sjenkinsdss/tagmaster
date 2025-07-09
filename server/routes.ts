import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertTagSchema, insertPaidAdSchema, type InsertTag } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";

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

  // Get campaign data (using brand_tags since campaign_name doesn't exist)
  app.get("/api/campaigns", async (req, res) => {
    try {
      // Use brand_tags as campaign proxy since campaign_name doesn't exist
      const campaignResult = await db.execute(sql`
        SELECT 
          COALESCE(brand_tags, 'Untagged') as campaign_name,
          COUNT(*) as post_count
        FROM debra_posts 
        WHERE brand_tags IS NOT NULL 
        AND brand_tags != ''
        GROUP BY brand_tags
        ORDER BY post_count DESC
        LIMIT 50
      `);
      
      res.json({ success: true, campaigns: campaignResult.rows });
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

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
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
      
      // Generate unique code
      const code = await storage.generateTagCode(tagData.pillar, tagData.name);
      
      const tag = await storage.createTag({
        ...tagData,
        code,
      });
      
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tag data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create tag" });
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

  // Post-Tag relationship routes
  app.post("/api/posts/:postId/tags", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const { tagId } = req.body;
      
      const postTag = await storage.addTagToPost(postId, tagId);
      res.status(201).json(postTag);
    } catch (error) {
      res.status(500).json({ message: "Failed to add tag to post" });
    }
  });

  app.delete("/api/posts/:postId/tags/:tagId", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const tagId = parseInt(req.params.tagId);
      
      await storage.removeTagFromPost(postId, tagId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove tag from post" });
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

  const httpServer = createServer(app);
  return httpServer;
}
