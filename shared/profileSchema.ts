import { z } from "zod";
const text = z.string().trim().max(3000);
const url = z
  .string()
  .max(2048)
  .refine(
    v =>
      v === "" ||
      /^https:\/\//i.test(v) ||
      /^\/uploads\/[a-f0-9]+\.(webp|jpg|png|pdf)$/.test(v),
    "HTTPSまたはアップロード済みのURLを入力してください。"
  );
export const profileSchema = z.object({
  introduction: text.min(1),
  name: text.min(1).max(160),
  headline: text.max(300),
  avatarUrl: url,
  about: z.string().max(12000),
  githubUrl: url,
  xUrl: url,
  skills: z.array(text.max(100)).max(60),
  personal: z.array(text).max(30),
  interests: z
    .array(
      z.object({
        category: text.max(100),
        items: z.array(text.max(100)).max(40),
      })
    )
    .max(20),
  devices: z
    .array(
      z.object({
        name: text.max(160),
        imageUrl: url,
        os: text,
        cpu: text,
        memory: text,
        storage: text,
        software: text,
      })
    )
    .max(20),
  music: z
    .array(
      z.object({
        title: text.max(200),
        artist: text.max(200),
        genre: text.max(160),
        artworkUrl: url,
        url,
        note: text,
      })
    )
    .max(40),
  activities: z
    .array(
      z.object({
        id: z.string().max(100),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        title: text.min(1).max(200),
        description: text,
        url,
      })
    )
    .max(200),
  links: z
    .array(z.object({ label: text.min(1).max(100), url: url.refine(v => !!v) }))
    .max(30),
});
