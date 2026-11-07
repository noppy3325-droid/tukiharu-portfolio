import { useEffect, useState, type CSSProperties } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { blogFontSizes, blogLineHeights } from "@shared/blogTypography";

const storageKey = "tsukiharu-blog-reading";
const defaults = { size: "16", spacing: "1.9" };

function readPreference() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return {
      size: blogFontSizes.some(size => size === saved?.size)
        ? (saved.size as string)
        : defaults.size,
      spacing: blogLineHeights.some(spacing => spacing === saved?.spacing)
        ? (saved.spacing as string)
        : defaults.spacing,
    };
  } catch {
    return defaults;
  }
}

export function BlogReadingBody({ html }: { html: string }) {
  const { locale } = useLocale();
  const [preference, setPreference] = useState(readPreference);
  const japanese = locale === "ja";
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preference));
    } catch {
      /* Reading settings still work for the current page. */
    }
  }, [preference]);

  return (
    <>
      <details className="blog-reading-settings">
        <summary>{japanese ? "読みやすさ" : "Reading settings"}</summary>
        <div className="blog-reading-controls">
          <label>
            {japanese ? "文字サイズ" : "Text size"}
            <select
              aria-label={japanese ? "文字サイズ" : "Text size"}
              value={preference.size}
              onChange={event =>
                setPreference({ ...preference, size: event.target.value })
              }
            >
              {blogFontSizes.map(size => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </label>
          <label>
            {japanese ? "行間" : "Line spacing"}
            <select
              aria-label={japanese ? "行間" : "Line spacing"}
              value={preference.spacing}
              onChange={event =>
                setPreference({ ...preference, spacing: event.target.value })
              }
            >
              {[...blogLineHeights, defaults.spacing]
                .sort((a, b) => Number(a) - Number(b))
                .map(spacing => (
                  <option key={spacing} value={spacing}>
                    {spacing}
                    {japanese ? "倍" : "×"}
                  </option>
                ))}
            </select>
          </label>
          <button type="button" onClick={() => setPreference(defaults)}>
            {japanese ? "標準に戻す" : "Reset"}
          </button>
        </div>
      </details>
      <div
        className="simple-article-body blog-reading-body"
        style={
          {
            "--reading-size": `${Number(preference.size) / 16}rem`,
            "--reading-spacing": preference.spacing,
          } as CSSProperties
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
