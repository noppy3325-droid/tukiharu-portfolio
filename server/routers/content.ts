import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { createImageStorageKey, decodeAndValidateImage, IMAGE_UPLOAD_BASE64_MAX_LENGTH, allowedImageMimeTypes } from "../imageUpload";
import { ownerProcedure } from "./guards";
import { storagePut } from "../storage";
import { isAllowedContentImageUrl, isHttpsUrl } from "../contentUrl";

const contentImageUrl = z.string().max(2048).refine(isAllowedContentImageUrl, "HTTPSまたはアップロード済みの画像URLを入力してください。");
const optionalContentImageUrl = contentImageUrl.optional().or(z.literal(""));
const workInput = z.object({ title: z.string().min(1).max(160), summary: z.string().min(1).max(2000), category: z.string().min(1).max(80), url: z.string().max(2048).refine(value => value === "" || isHttpsUrl(value), "作品リンクはHTTPS URLを入力してください。"), thumbnailUrl: optionalContentImageUrl, accent: z.string().max(30), sortOrder: z.number().int().min(0).max(999) });
const bookInput = z.object({ title: z.string().min(1).max(180), author: z.string().min(1).max(160), note: z.string().min(1).max(2000), coverImageUrl: optionalContentImageUrl, coverColor: z.string().max(30), sortOrder: z.number().int().min(0).max(999) });
const galleryInput = z.object({ title: z.string().min(1).max(160), caption: z.string().min(1).max(2000), imageUrl: contentImageUrl, camera: z.string().max(180).optional().or(z.literal("")), lens: z.string().max(180).optional().or(z.literal("")), location: z.string().max(240).optional().or(z.literal("")), takenAt: z.date().nullable(), rotation: z.number().int().min(-20).max(20), sortOrder: z.number().int().min(0).max(999) });
const idInput = z.object({ id: z.number().int().positive() });
const introductionInput = z.object({ introduction: z.string().trim().min(1, "自己紹介文を入力してください。").max(3000) });
const imageUploadInput = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(allowedImageMimeTypes),
  base64: z.string().min(4).max(IMAGE_UPLOAD_BASE64_MAX_LENGTH),
  scope: z.enum(["gallery", "works", "books", "blog"]).default("gallery"),
});

export const contentRouter = router({
  profile: router({ get: publicProcedure.query(() => db.getSiteSettings()) }),
  works: router({ list: publicProcedure.query(() => db.listWorks()) }),
  books: router({ list: publicProcedure.query(() => db.listBooks()) }),
  gallery: router({ list: publicProcedure.query(() => db.listGalleryItems()) }),
});

export const adminContentRouter = router({
  profile: router({
    get: ownerProcedure.query(() => db.getSiteSettings()),
    update: ownerProcedure.input(introductionInput).mutation(({ input }) => db.setSiteIntroduction(input.introduction)),
  }),
  works: router({
    list: ownerProcedure.query(() => db.listWorks()),
    create: ownerProcedure.input(workInput).mutation(({ input }) => db.createWork({ ...input, url: input.url || null, thumbnailUrl: input.thumbnailUrl || null })),
    update: ownerProcedure.input(idInput.merge(workInput)).mutation(({ input }) => db.updateWork(input.id, { ...input, url: input.url || null, thumbnailUrl: input.thumbnailUrl || null })),
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deleteWork(input.id)),
  }),
  books: router({
    list: ownerProcedure.query(() => db.listBooks()),
    create: ownerProcedure.input(bookInput).mutation(({ input }) => db.createBook({ ...input, coverImageUrl: input.coverImageUrl || null })),
    update: ownerProcedure.input(idInput.merge(bookInput)).mutation(({ input }) => db.updateBook(input.id, { ...input, coverImageUrl: input.coverImageUrl || null })),
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deleteBook(input.id)),
  }),
  gallery: router({
    list: ownerProcedure.query(() => db.listGalleryItems()),
    create: ownerProcedure.input(galleryInput).mutation(({ input }) => db.createGalleryItem({ ...input, camera: input.camera || null, lens: input.lens || null, location: input.location || null })),
    update: ownerProcedure.input(idInput.merge(galleryInput)).mutation(({ input }) => db.updateGalleryItem(input.id, { ...input, camera: input.camera || null, lens: input.lens || null, location: input.location || null })),
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deleteGalleryItem(input.id)),
  }),
  upload: router({
    image: ownerProcedure.input(imageUploadInput).mutation(async ({ input }) => {
      try {
        const data = decodeAndValidateImage(input.base64, input.mimeType);
        return await storagePut(createImageStorageKey(input.filename, input.mimeType, input.scope), data, input.mimeType);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "画像をアップロードできませんでした。" });
      }
    }),
  }),
});
