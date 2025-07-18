import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  platform: text("platform").notNull(), // instagram, tiktok, youtube
  embedUrl: text("embed_url").notNull(),
  url: text("url"), // Original URL from debra_posts.url column
  thumbnailUrl: text("thumbnail_url"),
  campaignName: text("campaign_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // likes, comments, shares, etc.
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // type_category_name_####
  type: text("type"), // ad, campaign, client, post, ai, influencer
  category: text("category"), // Vertical, Creative, etc.
  pillar: text("pillar").notNull(), // Kept for backwards compatibility
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postTags = pgTable("post_tags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull(),
});

export const paidAds = pgTable("paid_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  platform: text("platform").notNull(), // facebook, instagram, twitter, etc.
  thumbnailUrl: text("thumbnail_url"),
  postId: integer("post_id").references(() => posts.id),
  isLinked: boolean("is_linked").default(true).notNull(),
  performance: jsonb("performance"), // ctr, reach, spend
  status: text("status").default("active").notNull(), // active, paused, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adTags = pgTable("ad_tags", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").references(() => paidAds.id).notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull(),
  isInherited: boolean("is_inherited").default(false).notNull(),
});

// Relations
export const postsRelations = relations(posts, ({ many }) => ({
  postTags: many(postTags),
  paidAds: many(paidAds),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
  adTags: many(adTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const paidAdsRelations = relations(paidAds, ({ one, many }) => ({
  post: one(posts, {
    fields: [paidAds.postId],
    references: [posts.id],
  }),
  adTags: many(adTags),
}));

export const adTagsRelations = relations(adTags, ({ one }) => ({
  ad: one(paidAds, {
    fields: [adTags.adId],
    references: [paidAds.id],
  }),
  tag: one(tags, {
    fields: [adTags.tagId],
    references: [tags.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  code: true,
  createdAt: true,
}).extend({
  category: z.string().optional(),
});

export const insertPaidAdSchema = createInsertSchema(paidAds).omit({
  id: true,
  createdAt: true,
});

export const insertPostTagSchema = createInsertSchema(postTags).omit({
  id: true,
});

export const insertAdTagSchema = createInsertSchema(adTags).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type PaidAd = typeof paidAds.$inferSelect;
export type InsertPaidAd = z.infer<typeof insertPaidAdSchema>;

export type PostTag = typeof postTags.$inferSelect;
export type InsertPostTag = z.infer<typeof insertPostTagSchema>;

export type AdTag = typeof adTags.$inferSelect;
export type InsertAdTag = z.infer<typeof insertAdTagSchema>;

// Extended types for API responses
export type PostWithTags = Post & {
  postTags: (PostTag & { tag: Tag })[];
  paidAds: (PaidAd & { adTags: (AdTag & { tag: Tag })[] })[];
};

export type TagWithRelations = Tag & {
  postTags: (PostTag & { post: Post })[];
  adTags: (AdTag & { ad: PaidAd })[];
};
