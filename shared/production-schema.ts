import { pgTable, serial, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Production database tables (adapted to existing structure)
export const debraPosts = pgTable("debra_posts", {
  id: serial("id").primaryKey(),
  platformName: text("platform_name"), // platform field
  postUrl: text("post_url"), // embed URL
  content: text("content"),
  authorName: text("author_name"),
  createDate: timestamp("create_date"),
  // Add other fields as needed based on actual table structure
});

export const debraInfluencerTag = pgTable("debra_influencertag", {
  id: serial("id").primaryKey(),
  name: text("name"),
  // Add other fields as needed
});

export const debraPostsInfluencerTags = pgTable("debra_posts_influencer_tags", {
  id: serial("id").primaryKey(),
  postsId: integer("posts_id").references(() => debraPosts.id),
  influencertagId: integer("influencertag_id").references(() => debraInfluencerTag.id),
});

export const adsAd = pgTable("ads_ad", {
  id: serial("id").primaryKey(),
  name: text("name"),
  // Add other fields as needed
});

// Relations for production tables
export const debraPostsRelations = relations(debraPosts, ({ many }) => ({
  postTags: many(debraPostsInfluencerTags),
}));

export const debraInfluencerTagRelations = relations(debraInfluencerTag, ({ many }) => ({
  postTags: many(debraPostsInfluencerTags),
}));

export const debraPostsInfluencerTagsRelations = relations(debraPostsInfluencerTags, ({ one }) => ({
  post: one(debraPosts, { fields: [debraPostsInfluencerTags.postsId], references: [debraPosts.id] }),
  tag: one(debraInfluencerTag, { fields: [debraPostsInfluencerTags.influencertagId], references: [debraInfluencerTag.id] }),
}));

// Types for production data
export type ProductionPost = typeof debraPosts.$inferSelect;
export type ProductionTag = typeof debraInfluencerTag.$inferSelect;
export type ProductionPostTag = typeof debraPostsInfluencerTags.$inferSelect;
export type ProductionAd = typeof adsAd.$inferSelect;

// Mapped types for compatibility with existing interface
export type Post = {
  id: number;
  platform: string;
  embedUrl: string;
  thumbnailUrl?: string;
  campaignName: string;
  createdAt: Date;
  metadata?: any;
};

export type Tag = {
  id: number;
  name: string;
  code: string;
  pillar: string;
  isAiGenerated: boolean;
  createdAt: Date;
};

export type PostTag = {
  id: number;
  postId: number;
  tagId: number;
  createdAt: Date;
};

export type PaidAd = {
  id: number;
  name: string;
  postId?: number;
  createdAt: Date;
};

export type AdTag = {
  id: number;
  adId: number;
  tagId: number;
  createdAt: Date;
};

export type PostWithTags = Post & {
  postTags: (PostTag & { tag: Tag })[];
  paidAds: (PaidAd & { adTags: (AdTag & { tag: Tag })[] })[];
};

// Sample data for development
export const samplePosts: PostWithTags[] = [
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
];

export const sampleTags: Tag[] = [
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
];