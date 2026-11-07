/** Derive the cover without changing the saved article HTML. Browser only. */
export function splitBlogCover(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const image = template.content.querySelector("img[src]");
  if (!image) return { cover: null, body: html };

  const cover = {
    src: image.getAttribute("src") ?? "",
    alt: image.getAttribute("alt") ?? "",
  };
  const parent = image.parentElement;
  image.remove();
  // Remove only the paragraph emptied by the cover; keep captions and text.
  if (parent?.tagName === "P" && !parent.textContent?.trim() && !parent.querySelector("img, br")) {
    parent.remove();
  }
  return { cover, body: template.innerHTML };
}
