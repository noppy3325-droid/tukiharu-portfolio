import { describe, expect, it } from "vitest";
import { defaultProfile } from "@shared/profile";
import { profileSchema } from "@shared/profileSchema";

describe("profile policy", () => {
  it("keeps legacy introductions and defaults a missing policy to empty", () => {
    const { policy, ...legacy } = { ...defaultProfile, about: "既存の自己紹介" };
    const parsed = profileSchema.parse(legacy);
    expect(parsed.about).toBe("既存の自己紹介");
    expect(parsed.policy).toBe("");
  });
  it("preserves separate multiline policy text and limits its length", () => {
    const parsed = profileSchema.parse({ ...defaultProfile, about: "自己紹介", policy: "制作の方針\n発信の方針" });
    expect(parsed.about).toBe("自己紹介");
    expect(parsed.policy).toBe("制作の方針\n発信の方針");
    expect(profileSchema.safeParse({ ...parsed, policy: "a".repeat(12001) }).success).toBe(false);
  });
});
