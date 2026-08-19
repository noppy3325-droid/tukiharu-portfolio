function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 管理者が入力した画像説明を、本文へ挿入するimg要素のalt属性として安全に保存する。
 * 空文字列は装飾画像として明示的に扱う。
 */
export function buildInlineBlogImageHtml(url: string, altText: string) {
  return `<img src="${escapeHtmlAttribute(url)}" alt="${escapeHtmlAttribute(altText.trim())}" />`;
}
