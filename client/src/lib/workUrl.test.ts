import { describe, expect, it } from "vitest";
import { displayWorkUrl, getSafeWorkUrl } from "./workUrl";

describe("Works URL", () => {
  it("accepts HTTPS URLs and preserves an external destination", () => {
    const url = getSafeWorkUrl("https://example.com/project/");
    expect(url).toBe("https://example.com/project/");
    expect(displayWorkUrl(url!)).toBe("example.com/project");
  });

  it("rejects missing, relative, HTTP, and javascript URLs", () => {
    expect(getSafeWorkUrl("")).toBeNull();
    expect(getSafeWorkUrl("example.com/project")).toBeNull();
    expect(getSafeWorkUrl("http://example.com/project")).toBeNull();
    expect(getSafeWorkUrl("javascript:alert(1)")).toBeNull();
  });
});
