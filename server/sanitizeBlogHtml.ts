import sanitizeHtml from "sanitize-html";
import { blogTypographyAttributes } from "../shared/blogTypography";

const allowedTags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "a",
  "img",
];

export function sanitizeBlogHtml(content: string) {
  return sanitizeHtml(content, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title", "width", "height"],
      ol: ["start"],
      code: ["class"],
      ...Object.fromEntries(
        ["p", "h2", "h3", "h4"].map(tag => [
          tag,
          Object.values(blogTypographyAttributes).map(config => config.html),
        ])
      ),
    },
    allowedClasses: { code: [/^language-[a-zA-Z0-9_-]{1,40}$/] },
    transformTags: {
      ...Object.fromEntries(
        ["p", "h2", "h3", "h4"].map(tag => [
          tag,
          (tagName: string, attribs: Record<string, string>) => ({
            tagName,
            attribs: Object.fromEntries(
              Object.values(blogTypographyAttributes)
                .filter(config =>
                  (config.values as readonly string[]).includes(
                    attribs[config.html]
                  )
                )
                .map(config => [config.html, attribs[config.html]])
            ),
          }),
        ])
      ),
      ol: (tagName, attribs) => {
        const clean: Record<string, string> = {};
        if (/^\d{1,4}$/.test(attribs.start ?? "")) clean.start = attribs.start;
        return { tagName, attribs: clean };
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    exclusiveFilter: frame => frame.tag === "img" && !frame.attribs.src,
  });
}

export function sanitizeBlogPost<T extends { content: string }>(post: T): T {
  return { ...post, content: sanitizeBlogHtml(post.content) };
}
