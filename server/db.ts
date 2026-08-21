import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { adminCredentials, adminLoginAttempts, blogComments, blogLikes, blogPosts, books, galleryItems, InsertUser, siteSettings, users, works } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    values.role = "user";
    updateSet.role = "user";

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("データベースに接続できません。");
  return db;
}

export async function getAdminCredential() { const db = await requireDb(); const rows = await db.select().from(adminCredentials).where(eq(adminCredentials.id, 1)).limit(1); return rows[0]; }
export async function setAdminCredential(passwordHash: string, passwordSalt: string) { const db = await requireDb(); await db.insert(adminCredentials).values({ id: 1, passwordHash, passwordSalt }).onDuplicateKeyUpdate({ set: { passwordHash, passwordSalt } }); return { success: true }; }
export async function getAdminLoginAttempt(keyHash: string) { const db = await requireDb(); const rows = await db.select().from(adminLoginAttempts).where(eq(adminLoginAttempts.keyHash, keyHash)).limit(1); return rows[0]; }
export async function recordAdminLoginFailure(keyHash: string, attemptedAt: Date, expiredBefore: Date) {
  const db = await requireDb();
  await db.insert(adminLoginAttempts).values({ keyHash, failedAttempts: 1, windowStartedAt: attemptedAt }).onDuplicateKeyUpdate({
    set: {
      failedAttempts: sql`IF(${adminLoginAttempts.windowStartedAt} < ${expiredBefore}, 1, ${adminLoginAttempts.failedAttempts} + 1)`,
      windowStartedAt: sql`IF(${adminLoginAttempts.windowStartedAt} < ${expiredBefore}, ${attemptedAt}, ${adminLoginAttempts.windowStartedAt})`,
    },
  });
}
export async function clearAdminLoginAttempt(keyHash: string) { const db = await requireDb(); await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.keyHash, keyHash)); }

const DEFAULT_INTRODUCTION = "つくったもの、読んだもの、Gallery、日々のBlog記事をまとめる個人のアーカイブです。気になることがあれば、下のメールアドレスから気軽にご連絡ください。";
export async function getSiteSettings() { const db = await requireDb(); const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1); return rows[0] ?? { id: 1, introduction: DEFAULT_INTRODUCTION, updatedAt: null }; }
export async function setSiteIntroduction(introduction: string) { const db = await requireDb(); await db.insert(siteSettings).values({ id: 1, introduction }).onDuplicateKeyUpdate({ set: { introduction } }); return { success: true }; }

export async function listWorks() { const db = await requireDb(); return db.select().from(works).orderBy(works.sortOrder, desc(works.createdAt)); }
export async function createWork(input: typeof works.$inferInsert) { const db = await requireDb(); await db.insert(works).values(input); return { success: true }; }
export async function updateWork(id: number, input: Partial<typeof works.$inferInsert>) { const db = await requireDb(); await db.update(works).set(input).where(eq(works.id, id)); return { success: true }; }
export async function deleteWork(id: number) { const db = await requireDb(); await db.delete(works).where(eq(works.id, id)); return { success: true }; }

export async function listBooks() { const db = await requireDb(); return db.select().from(books).orderBy(books.sortOrder, desc(books.createdAt)); }
export async function createBook(input: typeof books.$inferInsert) { const db = await requireDb(); await db.insert(books).values(input); return { success: true }; }
export async function updateBook(id: number, input: Partial<typeof books.$inferInsert>) { const db = await requireDb(); await db.update(books).set(input).where(eq(books.id, id)); return { success: true }; }
export async function deleteBook(id: number) { const db = await requireDb(); await db.delete(books).where(eq(books.id, id)); return { success: true }; }

export async function listGalleryItems() { const db = await requireDb(); return db.select().from(galleryItems).orderBy(galleryItems.sortOrder, desc(galleryItems.createdAt)); }
export async function createGalleryItem(input: typeof galleryItems.$inferInsert) { const db = await requireDb(); await db.insert(galleryItems).values(input); return { success: true }; }
export async function updateGalleryItem(id: number, input: Partial<typeof galleryItems.$inferInsert>) { const db = await requireDb(); await db.update(galleryItems).set(input).where(eq(galleryItems.id, id)); return { success: true }; }
export async function deleteGalleryItem(id: number) { const db = await requireDb(); await db.delete(galleryItems).where(eq(galleryItems.id, id)); return { success: true }; }

export async function listPublishedPosts() { const db = await requireDb(); return db.select().from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt)); }
export async function getAdjacentPublishedPosts(id: number) {
  const db = await requireDb();
  const posts = await db.select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, publishedAt: blogPosts.publishedAt, createdAt: blogPosts.createdAt }).from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
  const index = posts.findIndex(post => post.id === id);
  return { newer: index > 0 ? posts[index - 1] : null, older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : null };
}
export async function listAllPosts() { const db = await requireDb(); return db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt)); }
export async function getPublishedPostBySlug(slug: string) { const db = await requireDb(); const rows = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published"))).limit(1); return rows[0]; }
export async function getPublishedPostById(id: number) { const db = await requireDb(); const rows = await db.select().from(blogPosts).where(and(eq(blogPosts.id, id), eq(blogPosts.status, "published"))).limit(1); return rows[0]; }
export async function createPost(input: { title: string; slug: string; excerpt: string; content: string; coverColor: string; status: "draft" | "published" }) { const db = await requireDb(); await db.insert(blogPosts).values({ ...input, publishedAt: input.status === "published" ? new Date() : null }); return { success: true }; }
export async function updatePost(id: number, input: { title: string; slug: string; excerpt: string; content: string; coverColor: string; status: "draft" | "published" }) { const db = await requireDb(); const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1); const current = rows[0]; if (!current) throw new Error("記事が見つかりません。"); await db.update(blogPosts).set({ ...input, publishedAt: input.status === "published" ? (current.publishedAt ?? new Date()) : null }).where(eq(blogPosts.id, id)); return { success: true }; }
export async function deletePost(id: number) { const db = await requireDb(); await db.delete(blogLikes).where(eq(blogLikes.postId, id)); await db.delete(blogComments).where(eq(blogComments.postId, id)); await db.delete(blogPosts).where(eq(blogPosts.id, id)); return { success: true }; }

export async function getLikeCount(postId: number) { const db = await requireDb(); const rows = await db.select({ value: count() }).from(blogLikes).where(eq(blogLikes.postId, postId)); return rows[0]?.value ?? 0; }
export async function addLike(postId: number, visitorKey: string) { const db = await requireDb(); await db.insert(blogLikes).values({ postId, visitorKey }).onDuplicateKeyUpdate({ set: { visitorKey } }); return { liked: true, count: await getLikeCount(postId) }; }
export async function removeLike(postId: number, visitorKey: string) { const db = await requireDb(); await db.delete(blogLikes).where(and(eq(blogLikes.postId, postId), eq(blogLikes.visitorKey, visitorKey))); return { liked: false, count: await getLikeCount(postId) }; }

export async function listComments(postId: number) { const db = await requireDb(); return db.select({ id: blogComments.id, body: blogComments.body, createdAt: blogComments.createdAt, authorName: users.name, authorId: users.id }).from(blogComments).innerJoin(users, eq(blogComments.authorId, users.id)).where(and(eq(blogComments.postId, postId), isNull(blogComments.deletedAt))).orderBy(desc(blogComments.createdAt)); }
export async function addComment(postId: number, authorId: number, body: string) { const db = await requireDb(); await db.insert(blogComments).values({ postId, authorId, body }); return { success: true }; }
export async function updateCommentByAuthorWithinWindow(id: number, authorId: number, body: string, editableSince: Date) { const db = await requireDb(); const rows = await db.select({ id: blogComments.id }).from(blogComments).where(and(eq(blogComments.id, id), eq(blogComments.authorId, authorId), gte(blogComments.createdAt, editableSince), isNull(blogComments.deletedAt))).limit(1); if (!rows[0]) return false; await db.update(blogComments).set({ body }).where(eq(blogComments.id, id)); return true; }
export async function deleteCommentByAuthor(id: number, authorId: number) { const db = await requireDb(); const rows = await db.select({ id: blogComments.id }).from(blogComments).where(and(eq(blogComments.id, id), eq(blogComments.authorId, authorId), isNull(blogComments.deletedAt))).limit(1); if (!rows[0]) return false; await db.update(blogComments).set({ deletedAt: new Date() }).where(eq(blogComments.id, id)); return true; }
export async function restoreCommentByAuthor(id: number, authorId: number, restoreSince: Date) { const db = await requireDb(); const rows = await db.select({ id: blogComments.id }).from(blogComments).where(and(eq(blogComments.id, id), eq(blogComments.authorId, authorId), gte(blogComments.deletedAt, restoreSince))).limit(1); if (!rows[0]) return false; await db.update(blogComments).set({ deletedAt: null }).where(eq(blogComments.id, id)); return true; }
export async function deleteComment(id: number) { const db = await requireDb(); await db.delete(blogComments).where(eq(blogComments.id, id)); return { success: true }; }
