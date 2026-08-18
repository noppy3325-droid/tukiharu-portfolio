import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as db from "../server/db.ts";

const baseUrl = process.env.PUBLIC_VERIFY_BASE_URL || "http://127.0.0.1:3000";
const port = 9231;
const profileDir = await mkdtemp(join(tmpdir(), "tsukiharu-blog-navigation-"));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const olderSlug = `verification-older-${suffix}`;
const newerSlug = `verification-newer-${suffix}`;
const olderTitle = "検証用の前の記事";
const newerTitle = "検証用の新しい記事";

async function getTarget() {
  for (let count = 0; count < 30; count += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find(target => target.type === "page" && target.url.startsWith(baseUrl));
      if (page?.webSocketDebuggerUrl) return page;
    } catch { /* Chromium is starting. */ }
    await wait(250);
  }
  throw new Error("Chromium DevTools に接続できません。");
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    socket.addEventListener("open", () => socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } })));
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      socket.close();
      if (message.error || message.result?.exceptionDetails) reject(new Error("ブラウザ評価に失敗しました。"));
      else resolve(message.result.result.value);
    });
    socket.addEventListener("error", () => reject(new Error("DevTools WebSocket 接続に失敗しました。")));
  });
}

const createdPostIds = [];
let browser;
try {
  await db.createPost({ title: olderTitle, slug: olderSlug, excerpt: "前後記事リンクの検証用です。", content: "<p>前の記事です。</p>", coverColor: "lilac", status: "published" });
  await wait(1100);
  await db.createPost({ title: newerTitle, slug: newerSlug, excerpt: "前後記事リンクの検証用です。", content: "<p>新しい記事です。</p>", coverColor: "mint", status: "published" });
  const publishedPosts = await db.listPublishedPosts();
  for (const post of publishedPosts) {
    if (post.slug === olderSlug || post.slug === newerSlug) createdPostIds.push(post.id);
  }
  if (createdPostIds.length !== 2) throw new Error("検証用Blog記事を取得できません。");
  const [newestPost, olderPost] = publishedPosts.filter(post => post.slug === olderSlug || post.slug === newerSlug);
  if (!newestPost || !olderPost) throw new Error("検証用Blog記事の公開順を取得できません。");

  browser = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, `${baseUrl}/blog`], { stdio: "ignore" });
  const target = await getTarget();
  const result = await evaluate(target.webSocketDebuggerUrl, `
    (async () => {
      const newerSlug = ${JSON.stringify(newestPost.slug)};
      const olderSlug = ${JSON.stringify(olderPost.slug)};
      const newerTitle = ${JSON.stringify(newestPost.title)};
      const olderTitle = ${JSON.stringify(olderPost.title)};
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      for (let count = 0; count < 20 && !document.querySelector('a[href="/blog/' + newerSlug + '"]'); count += 1) await wait(250);
      const newestLink = document.querySelector('a[href="/blog/' + newerSlug + '"]');
      if (!newestLink) return { success: false, reason: 'newest_blog_list_link_missing' };
      newestLink.click();
      for (let count = 0; count < 20 && !document.querySelector('.blog-article-navigation a[href="/blog/' + olderSlug + '"]'); count += 1) await wait(250);
      const olderLink = document.querySelector('.blog-article-navigation a[href="/blog/' + olderSlug + '"]');
      if (location.pathname !== '/blog/' + newerSlug || !document.body.textContent.includes(newerTitle) || !olderLink) return { success: false, reason: 'newest_blog_navigation_missing' };
      olderLink.click();
      for (let count = 0; count < 20 && (location.pathname !== '/blog/' + olderSlug || !document.querySelector('.blog-article-navigation a[href="/blog/' + newerSlug + '"]')); count += 1) await wait(250);
      const newerLink = document.querySelector('.blog-article-navigation a[href="/blog/' + newerSlug + '"]');
      if (location.pathname !== '/blog/' + olderSlug || !document.body.textContent.includes(olderTitle) || !newerLink) return { success: false, reason: 'older_blog_navigation_missing', pathname: location.pathname, hasOlderTitle: document.body.textContent.includes(olderTitle), navigationHtml: document.querySelector('.blog-article-navigation')?.innerHTML ?? '' };
      newerLink.click();
      for (let count = 0; count < 20 && location.pathname !== '/blog/' + newerSlug; count += 1) await wait(250);
      if (location.pathname !== '/blog/' + newerSlug || !document.body.textContent.includes(newerTitle)) return { success: false, reason: 'newer_blog_return_missing', pathname: location.pathname };
      return { success: true };
    })()
  `);
  if (!result?.success) throw new Error(JSON.stringify(result || { reason: "blog_post_navigation_failed" }));
  console.log("blog_post_navigation_verified");
} finally {
  browser?.kill("SIGTERM");
  await wait(500);
  await Promise.all(createdPostIds.map(id => db.deletePost(id)));
  await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
}

process.exit(0);
