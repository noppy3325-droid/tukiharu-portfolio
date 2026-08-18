import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { ownerProcedure } from "./guards";

const workInput = z.object({ title: z.string().min(1).max(160), summary: z.string().min(1).max(2000), category: z.string().min(1).max(80), url: z.string().url().optional().or(z.literal("")), accent: z.string().max(30), sortOrder: z.number().int().min(0).max(999) });
const bookInput = z.object({ title: z.string().min(1).max(180), author: z.string().min(1).max(160), note: z.string().min(1).max(2000), coverColor: z.string().max(30), sortOrder: z.number().int().min(0).max(999) });
const galleryInput = z.object({ title: z.string().min(1).max(160), caption: z.string().min(1).max(2000), imageUrl: z.string().url().max(2048), camera: z.string().max(180).optional().or(z.literal("")), lens: z.string().max(180).optional().or(z.literal("")), location: z.string().max(240).optional().or(z.literal("")), takenAt: z.date().nullable(), rotation: z.number().int().min(-20).max(20), sortOrder: z.number().int().min(0).max(999) });
const idInput = z.object({ id: z.number().int().positive() });
const introductionInput = z.object({ introduction: z.string().trim().min(1, "自己紹介文を入力してください。").max(3000) });

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
    create: ownerProcedure.input(workInput).mutation(({ input }) => db.createWork({ ...input, url: input.url || null })),
    update: ownerProcedure.input(idInput.merge(workInput)).mutation(({ input }) => db.updateWork(input.id, { ...input, url: input.url || null })),
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deleteWork(input.id)),
  }),
  books: router({
    list: ownerProcedure.query(() => db.listBooks()),
    create: ownerProcedure.input(bookInput).mutation(({ input }) => db.createBook(input)),
    update: ownerProcedure.input(idInput.merge(bookInput)).mutation(({ input }) => db.updateBook(input.id, input)),
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deleteBook(input.id)),
  }),
  gallery: router({
    list: ownerProcedure.query(() => db.listGalleryItems()),
    create: ownerProcedure.input(galleryInput).mutation(({ input }) => db.createGalleryItem({ ...input, camera: input.camera || null, lens: input.lens || null, location: input.location || null })),
    update: ownerProcedure.input(idInput.merge(galleryInput)).mutation(({ input }) => db.updateGalleryItem(input.id, { ...input, camera: input.camera || null, lens: input.lens || null, location: input.location || null })),
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deleteGalleryItem(input.id)),
  }),
});
