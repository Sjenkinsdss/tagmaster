import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertTagSchema, insertPaidAdSchema, type InsertTag } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch posts" });
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
      res.status(500).json({ message: "Failed to fetch tags" });
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
