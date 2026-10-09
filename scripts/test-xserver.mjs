import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const php =
  process.env.PHP_BIN ||
  (fs.existsSync(".tools/php/php.exe")
    ? path.resolve(".tools/php/php.exe")
    : "php");
const extra = php.endsWith(".exe")
  ? [
      "-d",
      `extension_dir=${path.dirname(php)}/ext`,
      ...["pdo_sqlite", "sqlite3", "gd", "fileinfo", "mbstring"].flatMap(e => [
        "-d",
        `extension=${e}`,
      ]),
    ]
  : [];
const run = args => {
  const result = spawnSync(php, [...extra, ...args], { encoding: "utf8", env });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
};
const privateDir = path.resolve(".tools", `qa-${Date.now()}`);
const publicDir = path.resolve(".tools", `public-${Date.now()}`);
fs.cpSync("dist/public", publicDir, { recursive: true });
const env = { ...process.env, PORTFOLIO_PRIVATE_DIR: privateDir };
fs.mkdirSync(privateDir, { recursive: true });
for (const name of [
  "bootstrap.php",
  "procedures.php",
  "index.php",
  "media.php",
])
  run(["-l", `xserver/public/api/${name}`]);
run(["-l", "xserver/manage.php"]);
run(["-l", "xserver/router.php"]);
console.log(
  run(["xserver/tests/run.php"]).replace(
    /Isolated fixture:.*/,
    "Isolated fixture created."
  )
);
run(["xserver/tests/fixture.php"]);
const server = spawn(
  php,
  [
    ...extra,
    "-d",
    "upload_max_filesize=12M",
    "-d",
    "post_max_size=16M",
    "-S",
    "127.0.0.1:8080",
    "-t",
    publicDir,
    "xserver/router.php",
  ],
  { env, stdio: ["ignore", "ignore", "pipe"] }
);
let serverErrors = "";
server.stderr.on("data", d => (serverErrors += d));
const base = "http://127.0.0.1:8080";
function client() {
  let cookie = "";
  return {
    get cookie() {
      return cookie;
    },
    rpc: createTRPCProxyClient({
      links: [
        httpBatchLink({
          url: base + "/api/trpc",
          transformer: superjson,
          headers: { "X-Portfolio-Request": "1" },
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers);
            if (cookie) headers.set("Cookie", cookie);
            const r = await fetch(input, { ...init, headers });
            const cookies = r.headers.getSetCookie();
            for (const v of cookies)
              if (v.startsWith("portfolio_session=")) cookie = v.split(";")[0];
            return r;
          },
        }),
      ],
    }),
  };
}
const admin = client(),
  guest = client(),
  stranger = client();
const expectError = async (fn, code) => {
  await assert.rejects(fn, e => e.data?.code === code);
};
try {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(base + "/api/trpc/adminAccess.status");
      if (r.status === 200) break;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  const a = admin.rpc,
    g = guest.rpc,
    s = stranger.rpc;
  assert.equal((await a.adminAccess.status.query()).isAdmin, false);
  await expectError(
    () => a.admin.content.works.create.mutate({ title: "Forbidden" }),
    "FORBIDDEN"
  );
  await a.adminAccess.login.mutate({ password: "Portfolio-QA-only-2026!" });
  assert.equal((await a.adminAccess.status.query()).isAdmin, true);
  const initial = await a.content.profile.get.query();
  const profile = {
    ...initial,
    name: "月春",
    about: "プログラミング、写真、音楽。日々の制作を記録しています。",
    githubUrl: "https://github.com/noppy3325-droid",
    skills: ["TypeScript", "React", "Photography"],
    interests: [
      { category: "写真", items: ["風景", "日常"] },
      { category: "音楽", items: ["制作の時間"] },
    ],
    personal: ["気になったことは、まず試してみる。"],
    devices: [
      {
        name: "Development workspace",
        imageUrl: "",
        os: "Windows",
        cpu: "管理画面で登録できます",
        memory: "",
        storage: "",
        software: "Editor / Browser",
      },
    ],
    music: [
      {
        title: "制作時間のプレイリスト",
        artist: "Music library",
        genre: "LIBRARY",
        artworkUrl: "",
        url: "",
        note: "お気に入りの音楽をここに。",
      },
    ],
    activities: [
      {
        id: "qa",
        date: "2026-10-09",
        title: "ポートフォリオの記録",
        description: "プロフィール、制作、写真をひとつの場所に。",
        url: "",
      },
    ],
  };
  await a.admin.content.profile.update.mutate(profile);
  assert.deepEqual(await g.content.profile.get.query(), profile);
  await expectError(
    () =>
      a.admin.content.profile.update.mutate({
        ...profile,
        xUrl: "javascript:alert(1)",
      }),
    "BAD_REQUEST"
  );
  const work = {
    title: "制作の記録",
    summary: "テスト用の作品です。",
    category: "Web",
    url: "https://example.com",
    thumbnailUrl: "",
    pdfUrl: "",
    accent: "mint",
    sortOrder: 0,
  };
  await a.admin.content.works.create.mutate(work);
  const [w] = await g.content.works.list.query();
  assert(w.createdAt instanceof Date);
  await a.admin.content.works.update.mutate({
    ...work,
    id: w.id,
    summary: "更新済み",
  });
  assert.equal((await g.content.works.list.query())[0].summary, "更新済み");
  const post = {
    title: "制作日記",
    slug: "qa-note",
    excerpt: "ローカル確認用の記事。",
    content:
      '<p>日本語の本文<img src="javascript:alert(1)"><script>bad()</script></p>',
    coverColor: "mint",
    status: "draft",
  };
  await a.admin.blog.posts.create.mutate(post);
  assert.equal((await g.blog.list.query()).length, 0);
  await expectError(
    () => g.blog.bySlug.query({ slug: "qa-note" }),
    "NOT_FOUND"
  );
  const [draft] = await a.admin.blog.posts.list.query();
  await a.admin.blog.posts.update.mutate({
    ...post,
    id: draft.id,
    status: "published",
  });
  const published = await g.blog.bySlug.query({ slug: "qa-note" });
  assert(!published.content.includes("script"));
  assert(published.publishedAt instanceof Date);
  await expectError(
    () => a.admin.blog.posts.create.mutate({ ...post, status: "published" }),
    "BAD_REQUEST"
  );
  const [l1, l2] = await Promise.all([
    g.blog.likes.query({ id: published.id }),
    g.blog.navigation.query({ id: published.id }),
  ]);
  assert.equal(l1, 0);
  assert.equal(l2.newer, null);
  await g.blog.like.mutate({
    id: published.id,
    visitorKey: "stable-visitor-key",
  });
  await g.blog.like.mutate({
    id: published.id,
    visitorKey: "stable-visitor-key",
  });
  assert.equal(await g.blog.likes.query({ id: published.id }), 1);
  await g.blog.unlike.mutate({
    id: published.id,
    visitorKey: "stable-visitor-key",
  });
  assert.equal(await g.blog.likes.query({ id: published.id }), 0);
  await expectError(
    () => g.blog.addComment.mutate({ id: published.id, body: "No session" }),
    "UNAUTHORIZED"
  );
  await g.visitor.start.mutate({ name: "QA Visitor" });
  await g.blog.addComment.mutate({ id: published.id, body: "感想です。" });
  const [comment] = await g.blog.comments.query({ id: published.id });
  assert.equal(comment.authorName, "QA Visitor");
  assert(comment.createdAt instanceof Date);
  await s.visitor.start.mutate({ name: "Other Visitor" });
  await expectError(
    () => s.blog.updateComment.mutate({ id: comment.id, body: "Spoof" }),
    "FORBIDDEN"
  );
  await g.blog.updateComment.mutate({ id: comment.id, body: "編集済み" });
  const undo = await g.blog.removeComment.mutate({ id: comment.id });
  assert(undo.undoExpiresAt instanceof Date);
  assert.equal((await g.blog.comments.query({ id: published.id })).length, 0);
  await g.blog.restoreComment.mutate({ id: comment.id });
  // GD-generated image avoids relying on a damaged or mislabeled fixture.
  const generated = run([
    "-r",
    "$im=imagecreatetruecolor(800,600);imagefill($im,0,0,imagecolorallocate($im,100,160,190));ob_start();imagepng($im);echo base64_encode(ob_get_clean());",
  ]);
  const image = await a.admin.content.upload.image.mutate({
    filename: "test.png",
    mimeType: "image/png",
    base64: generated,
    scope: "gallery",
  });
  assert.match(image.url, /^\/uploads\/[a-f0-9]+\.(webp|png|jpg)$/);
  assert.equal((await fetch(base + image.url)).status, 200);
  await expectError(
    () =>
      a.admin.content.upload.image.mutate({
        filename: "test.png",
        mimeType: "image/png",
        base64: Buffer.from("<?php bad();").toString("base64"),
        scope: "gallery",
      }),
    "BAD_REQUEST"
  );
  await a.admin.content.gallery.create.mutate({
    title: "テストの写真",
    caption: "ローカル検証用",
    imageUrl: image.url,
    camera: "",
    lens: "",
    location: "",
    takenAt: new Date("2026-10-09T00:00:00Z"),
    rotation: 0,
    sortOrder: 0,
  });
  assert((await g.content.gallery.list.query())[0].takenAt instanceof Date);
  const pdf = new FormData();
  pdf.append(
    "file",
    new Blob(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"], {
      type: "application/pdf",
    }),
    "work.pdf"
  );
  const pdfResponse = await fetch(base + "/api/media.php", {
    method: "POST",
    headers: { Cookie: admin.cookie, "X-Portfolio-Request": "1" },
    body: pdf,
  });
  assert.equal(pdfResponse.status, 200);
  const pdfResult = await pdfResponse.json();
  assert.match(pdfResult.url, /\.pdf$/);
  await a.admin.content.works.update.mutate({
    ...work,
    id: w.id,
    pdfUrl: pdfResult.url,
    thumbnailUrl: image.url,
  });
  assert.equal((await g.content.works.list.query())[0].pdfUrl, pdfResult.url);
  for (const headers of [
    { Cookie: admin.cookie },
    {
      Cookie: admin.cookie,
      "X-Portfolio-Request": "1",
      Origin: "https://evil.example",
    },
  ]) {
    const r = await fetch(base + "/api/trpc/admin.content.works.remove", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ json: { id: w.id } }),
    });
    assert.equal((await r.json()).error.json.data.code, "FORBIDDEN");
  }
  const badGet = await fetch(
    base +
      "/api/trpc/admin.content.works.remove?input=" +
      encodeURIComponent(JSON.stringify({ json: { id: w.id } })),
    { headers: { Cookie: admin.cookie } }
  );
  assert.equal(
    (await badGet.json()).error.json.data.code,
    "METHOD_NOT_SUPPORTED"
  );
  const malformed = await fetch(base + "/api/trpc/admin.content.works.remove", {
    method: "POST",
    headers: {
      Cookie: admin.cookie,
      "Content-Type": "application/json",
      "X-Portfolio-Request": "1",
    },
    body: "invalid JSON",
  });
  assert.equal((await malformed.json()).error.json.data.code, "BAD_REQUEST");
  const deniedPdf = await fetch(base + "/api/media.php", {
    method: "POST",
    headers: { "X-Portfolio-Request": "1" },
    body: new FormData(),
  });
  assert.equal(deniedPdf.status, 403);
  const book = {
    title: "読書の記録",
    author: "著者",
    note: "テスト用メモ",
    coverImageUrl: "",
    coverColor: "mint",
    sortOrder: 0,
  };
  await a.admin.content.books.create.mutate(book);
  const [savedBook] = await g.content.books.list.query();
  await a.admin.content.books.update.mutate({
    ...book,
    id: savedBook.id,
    note: "更新済み",
  });
  assert.equal((await g.content.books.list.query())[0].note, "更新済み");
  await a.admin.content.books.remove.mutate({ id: savedBook.id });
  await g.blog.like.mutate({
    id: published.id,
    visitorKey: "migration-visitor",
  });
  const exported = run(["xserver/manage.php", "export"]);
  const exportFile = path.join(privateDir, "content.export.json");
  fs.writeFileSync(exportFile, exported);
  const importDir = path.resolve(".tools", `import-${Date.now()}`);
  fs.mkdirSync(importDir, { recursive: true });
  const importEnv = { ...env, PORTFOLIO_PRIVATE_DIR: importDir };
  for (const args of [
    ["xserver/tests/fixture.php"],
    ["xserver/manage.php", "import", exportFile],
  ]) {
    const result = spawnSync(php, [...extra, ...args], {
      encoding: "utf8",
      env: importEnv,
    });
    assert.equal(result.status, 0, result.stderr);
  }
  const imported = JSON.parse(
    spawnSync(php, [...extra, "xserver/manage.php", "export"], {
      encoding: "utf8",
      env: importEnv,
    }).stdout
  );
  assert.deepEqual(imported.profile, JSON.parse(exported).profile);
  assert.equal(imported.comments.length, 1);
  assert.equal(imported.likes.length, 1);
  assert.equal(imported.comments[0].postId, imported.posts[0].id);
  assert.equal(imported.likes[0].postId, imported.posts[0].id);
  assert.equal(
    spawnSync(php, [...extra, "xserver/manage.php", "import", exportFile], {
      encoding: "utf8",
      env: importEnv,
    }).status,
    1
  );
  await a.adminAccess.changePassword.mutate({
    password: "Changed-QA-only-2026!",
  });
  await a.adminAccess.logout.mutate();
  assert.equal((await a.adminAccess.status.query()).isAdmin, false);
  await expectError(() => a.admin.blog.posts.list.query(), "FORBIDDEN");
  await a.adminAccess.login.mutate({ password: "Changed-QA-only-2026!" });
  await a.admin.blog.posts.remove.mutate({ id: published.id });
  assert.equal((await g.blog.list.query()).length, 0);
  // Recreate a published sample for browser QA; these records stay in ignored local fixtures only.
  await a.admin.blog.posts.create.mutate({
    ...post,
    content: "<p>制作のあしあとを、少しずつ残しています。</p>",
    status: "published",
  });
  for (let i = 0; i < 5; i++) {
    try {
      await s.adminAccess.login.mutate({ password: "wrong-password" });
    } catch {}
  }
  await expectError(
    () => s.adminAccess.login.mutate({ password: "wrong-password" }),
    "TOO_MANY_REQUESTS"
  );
  fs.writeFileSync(
    ".tools/preview.json",
    JSON.stringify({ privateDir, publicDir })
  );
  console.log(
    "PASS: PHP transport, dates, batching, auth, CRUD, drafts, HTML safety, CSRF, comments, likes, images, PDF, export/import, password changes and rate limits."
  );
} catch (error) {
  console.error(serverErrors);
  throw error;
} finally {
  server.kill();
}
