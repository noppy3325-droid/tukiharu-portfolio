import { readFileSync } from "node:fs";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MusicLibrary } from "./MusicLibrary";
import { defaultProfile, type MusicItem } from "@shared/profile";
import { profileSchema } from "@shared/profileSchema";

const items: MusicItem[] = JSON.parse(
  readFileSync(
    new URL("../../../xserver/public/api/music-library.json", import.meta.url),
    "utf8"
  )
);

describe("curated music library", () => {
  it("fits the editor schema without duplicate recordings or missing artists", () => {
    expect(
      profileSchema.safeParse({ ...defaultProfile, music: items }).success
    ).toBe(true);
    expect(items).toHaveLength(163);
    expect(
      new Set(items.map(item => `${item.title}|${item.artist}|${item.note}`))
        .size
    ).toBe(items.length);
    expect(
      items.every(
        item =>
          item.title &&
          item.artist &&
          new URL(item.url).hostname === "www.youtube.com"
      )
    ).toBe(true);
    expect(items.find(item => item.title === "愛言葉V")?.artist).toBe(
      "DECO*27"
    );
    expect(
      items.filter(item => item.title === "今はいいんだよ。")
    ).toHaveLength(2);
  });
  it("accepts up to 200 tracks and rejects 201", () => {
    expect(
      profileSchema.safeParse({
        ...defaultProfile,
        music: Array(200).fill(items[0]),
      }).success
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        ...defaultProfile,
        music: Array(201).fill(items[0]),
      }).success
    ).toBe(false);
  });
  it("distinguishes exact videos from search links and preserves custom metadata", () => {
    const markup = renderToStaticMarkup(
      <MusicLibrary
        items={[
          {
            ...items[0],
            title: "直接リンク",
            url: "https://www.youtube.com/watch?v=Wiz0Ap2ge5U",
            genre: "Vocaloid",
          },
          {
            ...items[0],
            title: "検索リンク",
            url: "https://www.youtube.com/results?search_query=test",
            note: "Piano Ver.",
          },
        ]}
      />
    );
    expect(markup.match(/<details /g)).toHaveLength(1);
    expect(markup.match(/<li>/g)).toHaveLength(2);
    expect(markup).toContain("YouTubeで聴く");
    expect(markup).toContain("YouTubeで探す");
    expect(markup).toContain("Piano Ver.");
    expect(markup).toContain("Vocaloid");
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});
