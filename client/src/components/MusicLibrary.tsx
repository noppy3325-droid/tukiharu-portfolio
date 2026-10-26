import type { MusicItem } from "@shared/profile";
import React from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";

export function MusicLibrary({ items }: { items: MusicItem[] }) {
  const groups = new Map<string, MusicItem[]>();
  for (const item of items) {
    const artist = item.artist.trim() || "アーティスト未登録";
    const tracks = groups.get(artist) ?? [];
    tracks.push(item);
    groups.set(artist, tracks);
  }
  const artists = Array.from(groups).sort(
    ([a, tracksA], [b, tracksB]) =>
      tracksB.length - tracksA.length || a.localeCompare(b, "ja")
  );
  if (!items.length) return null;
  const midpoint = Math.ceil(artists.length / 2);
  const columns = [artists.slice(0, midpoint), artists.slice(midpoint)];
  return (
    <div className="listening-library">
      <p className="listening-caption">
        {items.length}曲 / {artists.length}
        組。アーティスト名を開くと曲一覧が見られます。
      </p>
      <div className="listening-artists">
        {columns.map((column, columnIndex) => (
          <div className="listening-column" key={columnIndex}>
            {column.map(([artist, tracks]) => (
              <details className="listening-artist" key={artist}>
                <summary>
                  <span className="listening-artist-copy">
                    <span className="listening-artist-name">{artist}</span>
                    <span className="listening-preview">
                      {tracks
                        .slice(0, 3)
                        .map(track => track.title)
                        .join("、")}
                      {tracks.length > 3 && " ほか"}
                    </span>
                  </span>
                  <span className="listening-count">{tracks.length}曲</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <ol className="listening-tracks">
                  {tracks.map((track, index) => (
                    <li key={`${track.title}-${track.note}-${index}`}>
                      {track.artworkUrl && (
                        <img
                          className="listening-artwork"
                          loading="lazy"
                          src={track.artworkUrl}
                          alt=""
                        />
                      )}
                      <div className="listening-track-copy">
                        <span className="listening-title">{track.title}</span>
                        {(track.note || track.genre) && (
                          <span className="listening-note">
                            {[track.note, track.genre]
                              .filter(Boolean)
                              .join(" / ")}
                          </span>
                        )}
                      </div>
                      {/^https:\/\//i.test(track.url) && (
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${track.title} / ${artist}：${linkLabel(track.url)}（新しいタブ）`}
                        >
                          {linkLabel(track.url)}
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function linkLabel(url: string) {
  let link: URL;
  try {
    link = new URL(url);
  } catch {
    return "楽曲を開く";
  }
  if (["www.youtube.com", "youtube.com", "youtu.be"].includes(link.hostname)) {
    return link.pathname === "/results" ? "YouTubeで探す" : "YouTubeで聴く";
  }
  return "楽曲を開く";
}
