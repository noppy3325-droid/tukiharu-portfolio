import sanitizeHtml from "sanitize-html";

const allowedTags = ["p", "br", "strong", "b", "em", "i", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "img"];

export function sanitizeBlogHtml(content: string) {
  return sanitizeHtml(content, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title", "width", "height"],
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
