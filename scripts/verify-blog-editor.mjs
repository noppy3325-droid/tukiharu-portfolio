import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const php = process.env.PHP_BIN || "php";
const phpArgs = php.endsWith(".exe")
  ? [
      "-d",
      `extension_dir=${path.dirname(php)}/ext`,
      ...["pdo_sqlite", "sqlite3", "gd", "fileinfo", "mbstring"].flatMap(
        name => ["-d", `extension=${name}`]
      ),
    ]
  : [];
const output = path.resolve(".tools/blog-editor-verified");
const root = path.join(output, `fixture-${Date.now()}`);
const publicDir = path.join(root, "public");
fs.mkdirSync(root, { recursive: true });
fs.cpSync("dist/public", publicDir, { recursive: true });
const env = {
  ...process.env,
  PORTFOLIO_PRIVATE_DIR: path.join(root, "private"),
};
const run = args => {
  const result = spawnSync(php, [...phpArgs, ...args], {
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};
run(["xserver/tests/fixture.php"]);
run([
  "-r",
  `require 'xserver/public/api/bootstrap.php';sql('INSERT INTO records(kind,payload) VALUES(?,?)',['posts',json_encode(['title'=>'以前の記事','slug'=>'legacy-editor','excerpt'=>'互換性の確認','content'=>'<h2>以前の見出し</h2><p>日本語の本文 <b>太字</b> <i>斜体</i> <a href="https://example.com">リンク</a><img src="/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp" alt="以前の写真"></p><ul><li>以前のリスト</li></ul>','status'=>'draft','coverColor'=>'mint','createdAt'=>now(),'updatedAt'=>now(),'publishedAt'=>null],JSON_UNESCAPED_UNICODE)]);`,
]);
const server = spawn(
  php,
  [
    ...phpArgs,
    "-d",
    "error_reporting=32767",
    "-S",
    "127.0.0.1:8080",
    "-t",
    publicDir,
    "xserver/router.php",
  ],
  { env, stdio: ["ignore", "ignore", "pipe"] }
);
let log = "";
server.stderr.on("data", data => (log += data));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  locale: "ja-JP",
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [],
  requests = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => requests.push(request.url()));
const base = "http://127.0.0.1:8080";
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await page.goto(base + "/admin");
  await page
    .getByLabel("管理者パスワード", { exact: true })
    .fill("Portfolio-QA-only-2026!");
  await page
    .getByRole("button", { name: "管理画面を開く", exact: true })
    .click();
  await page.getByRole("tab", { name: /Blog/ }).waitFor();
  assert(
    !requests.some(url => /RichTextEditor-/.test(url)),
    "editor must not load before opening Blog"
  );
  await page.getByRole('tab', { name: /自己紹介/ }).click();
  await page.getByLabel('詳しい自己紹介', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('方針・大切にしていること', { exact: true }).inputValue(), '');
  await page.getByLabel('詳しい自己紹介', { exact: true }).fill('自己紹介の確認用文章');
  await page.getByLabel('方針・大切にしていること', { exact: true }).fill('制作で大切にしていること\n発信の方針');
  await page.getByRole('button', { name: 'プロフィールを保存', exact: true }).click();
  await page.getByText('プロフィールを保存しました。', { exact: true }).waitFor();
  await page.reload();
  // The profile tab is already selected on reload.
  await page.getByLabel('方針・大切にしていること', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('詳しい自己紹介', { exact: true }).inputValue(), '自己紹介の確認用文章');
  assert.equal(await page.getByLabel('方針・大切にしていること', { exact: true }).inputValue(), '制作で大切にしていること\n発信の方針');
  const aboutCheck = await context.newPage();
  await aboutCheck.goto(base + '/about');
  await aboutCheck.locator('#policy .profile-prose').waitFor();
  assert.equal(await aboutCheck.locator('#about .profile-prose').textContent(), '自己紹介の確認用文章');
  assert.equal(await aboutCheck.locator('#policy .profile-prose').textContent(), '制作で大切にしていること\n発信の方針');
  assert(await aboutCheck.locator('#policy').evaluate(section => section.previousElementSibling?.id === 'about'));
  await aboutCheck.setViewportSize({ width: 375, height: 900 });
  await aboutCheck.getByText('このページの目次', { exact: true }).click();
  await aboutCheck.getByRole('link', { name: '方針', exact: true }).click();
  await aboutCheck.screenshot({ path: path.join(output, 'policy-mobile.png'), fullPage: true });
  await aboutCheck.close();
  await page.getByRole("tab", { name: /Blog/ }).click();
  const editor = page.getByRole("textbox", { name: "本文", exact: true });
  await editor.waitFor();
  await page.getByRole('group', { name: '段落の配置', exact: true }).getByRole('combobox', { name: '文字揃え' }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: '文字サイズ', exact: true }).count(), 0);
  const initialChooser = page.waitForEvent("filechooser", { timeout: 3000 });
  await page.getByRole("button", { name: "画像", exact: true }).click();
  await (await initialChooser).setFiles([]);
  assert.equal(
    await editor.locator("img[src]").count(),
    0,
    "cancelling the picker leaves the document unchanged"
  );
  const reset = async () => {
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
  };
  const shortcut = async (prefix, selector, text = "書きやすいノート") => {
    await reset();
    await page.keyboard.insertText(prefix);
    await page.keyboard.press("Space");
    await editor.locator(selector).waitFor({ state: "attached" });
    if (text) await page.keyboard.insertText(text);
  };
  await shortcut("#", "h2");
  await shortcut("＃＃", "h3");
  await reset();
  await page.keyboard.insertText("＃＃＃");
  await page.keyboard.insertText("　");
  await editor.locator("h4").waitFor();
  await page.keyboard.insertText("小さな見出し");
  await shortcut("#", "h2", "");
  await page.keyboard.press("Backspace");
  assert.equal(await editor.locator("h2").count(), 0);
  assert(
    (await editor.textContent()).includes("#"),
    `Backspace result: ${await editor.innerHTML()}`
  );
  await shortcut("#", "h2", "");
  await page.keyboard.press("Control+z");
  assert.equal(await editor.locator("h2").count(), 0);
  await page.keyboard.press("Control+Shift+z");
  await editor.locator("h2").waitFor();
  await reset();
  await page.keyboard.insertText("本文 # ");
  assert.equal(
    await editor.locator("h2").count(),
    0,
    "symbols in the middle are literal"
  );
  await shortcut("－", "ul li");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("二つ目");
  assert.equal(await editor.locator("li").count(), 2);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  assert.equal(
    await page
      .getByLabel("箇条書き", { exact: true })
      .getAttribute("aria-pressed"),
    "false"
  );
  await shortcut("３．", "ol li");
  assert.equal(await editor.locator("ol").getAttribute("start"), "3");
  await shortcut("＞", "blockquote");
  await shortcut("｀｀｀", "pre code", "const sample = '<script>';\n  safe();");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("# ");
  assert.equal(
    await editor.locator("h2").count(),
    0,
    "no shortcuts inside code"
  );
  await shortcut("－－－", "hr", "");
  // Chrome's IME composition path, without converting uncommitted Japanese input.
  await reset();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.imeSetComposition", {
    text: "＃",
    selectionStart: 1,
    selectionEnd: 1,
  });
  assert.equal(
    await editor.locator("h2").count(),
    0,
    "composition must not convert before commit"
  );
  await cdp.send("Input.insertText", { text: "＃" });
  await page.waitForTimeout(80);
  await page.keyboard.press("Space");
  await editor.locator("h2").waitFor();
  await page.keyboard.insertText("日本語入力からの見出し");
  await cdp.detach();
  // Save a complete article via the real PHP API and reload it for editing.
  await page
    .getByText("タイトル", { exact: true })
    .locator("..")
    .locator("input")
    .fill("ノートのある日々");
  await page
    .getByText("URL用スラッグ（半角英数字とハイフン）", { exact: true })
    .locator("..")
    .locator("input")
    .fill("editor-notebook");
  await page
    .getByText("短い紹介文", { exact: true })
    .locator("..")
    .locator("textarea")
    .fill("記号からことばを整える。");
  await reset();
  await page.keyboard.type("# ");
  await page.keyboard.insertText("ノートをひらく");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("日本語の本文。 ");
  await page.keyboard.type("**bold** ");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("３．");
  await page.keyboard.press("Space");
  await page.keyboard.insertText("はじまりは三つ目");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("＞");
  await page.keyboard.press("Space");
  await page.keyboard.insertText("日々のひとこと");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("``` ");
  await page.keyboard.insertText("const sky = '<script>';\n  keepIndent();");
  await editor.locator("h2").click();
  await page.getByRole("combobox", { name: "文字揃え", exact: true }).selectOption("center");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Control+End");
  await page
    .getByText("公開設定", { exact: true })
    .locator("..")
    .locator("select")
    .selectOption("published");
  await page.getByRole("button", { name: "Blogを保存", exact: true }).click();
  await page
    .getByRole("button", { name: "ノートのある日々を編集", exact: true })
    .waitFor();
  await page.reload();
  await page.getByRole("tab", { name: /Blog/ }).click();
  await page
    .getByRole("button", { name: "ノートのある日々を編集", exact: true })
    .click();
  await editor.locator("h2").filter({ hasText: "ノートをひらく" }).waitFor();
  await page
    .getByRole("button", { name: "画像の説明と画質設定", exact: true })
    .click();
  await page.getByLabel("画像の説明", { exact: true }).fill("ノートの小さな月");
  const panelPosition = await page
    .locator(".editor-image-panel")
    .evaluate(e => ({
      panel: e.getBoundingClientRect().top,
      editor: e.parentElement
        .querySelector(".editor-content")
        .getBoundingClientRect().top,
    }));
  assert(
    panelPosition.panel < panelPosition.editor,
    "image settings must be next to the toolbar, above long content"
  );
  const imageButton = page.getByRole("button", { name: "画像", exact: true });
  await imageButton.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert(await imageButton.evaluate(e => e === document.activeElement), "image button is keyboard reachable");
  assert.equal(
    await imageButton.evaluate(e => getComputedStyle(e).outlineStyle),
    "solid",
    "image button has a visible focus indicator"
  );
  const uploadChooser = page.waitForEvent("filechooser");
  await page.route("**/api/trpc/admin.content.upload.image*", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([{ error: { json: { message: "検証用の一時エラー", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path: "admin.content.upload.image" } } } }]),
  }), { times: 1 });
  await page.keyboard.press("Enter");
  await (
    await uploadChooser
  ).setFiles("client/src/assets/icons/favicon-32.png");
  await page.locator(".editor-image-error").filter({ hasText: "検証用の一時エラー" }).waitFor();
  assert.equal(await editor.locator('img[alt="ノートの小さな月"]').count(), 0);
  const retryChooser = page.waitForEvent("filechooser");
  await imageButton.click();
  await (await retryChooser).setFiles("client/src/assets/icons/favicon-32.png");
  await editor.locator('img[alt="ノートの小さな月"]').waitFor();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await editor.locator("h2").waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "ノートのある日々を編集", exact: true })
    .click();
  await editor.locator('img[alt="ノートの小さな月"]').waitFor();
  assert.equal(await editor.locator("ol").getAttribute("start"), "3");
  assert.equal(await editor.locator("h2").getAttribute("data-text-align"), "center");
  assert(
    (await editor.locator("pre").textContent()).includes("\n  keepIndent();")
  );
  assert.equal(
    await page
      .getByRole("button", { name: "元に戻す", exact: true })
      .isDisabled(),
    true,
    "loading an article must not import another article's undo history"
  );
  // Existing HTML, images, links and lists still load into the editor.
  await page
    .getByRole("button", { name: "以前の記事を編集", exact: true })
    .click();
  await editor.locator("h2").filter({ hasText: "以前の見出し" }).waitFor();
  assert.equal(
    await editor.locator("img[src]").getAttribute("alt"),
    "以前の写真"
  );
  assert.equal(
    await editor.locator("a").getAttribute("href"),
    "https://example.com"
  );
  assert.equal(await editor.locator("strong").count(), 1);
  assert.equal(await editor.locator("em").count(), 1);
  await page
    .getByRole("button", { name: "ノートのある日々を編集", exact: true })
    .click();
  await editor.locator("h2").filter({ hasText: "ノートをひらく" }).waitFor();
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      `page overflow ${width}`
    );
    assert(
      await page
        .locator(".blog-composer")
        .evaluate(e => e.scrollWidth <= e.clientWidth + 1),
      `editor overflow ${width}`
    );
    await page
      .locator(".blog-composer")
      .screenshot({ path: path.join(output, `editor-${width}.png`) });
  }
  const touchContext = await browser.newContext({
    locale: "ja-JP",
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    storageState: await context.storageState(),
  });
  const touch = await touchContext.newPage();
  await touch.goto(base + "/admin");
  await touch
    .getByRole("button", { name: "コンテンツを選ぶ", exact: true })
    .tap();
  await touch
    .locator(".admin-section-list")
    .getByRole("button", { name: /Blog/ })
    .tap();
  const touchEditor = touch.getByRole("textbox", { name: "本文", exact: true });
  await touchEditor.tap();
  await touch.keyboard.insertText("＃");
  await touch.keyboard.insertText("　");
  await touchEditor.locator("h2").waitFor();
  await touch.keyboard.insertText("スマホのノート");
  const touchChooser = touch.waitForEvent("filechooser");
  await touch.getByRole("button", { name: "画像", exact: true }).tap();
  await (await touchChooser).setFiles("client/src/assets/icons/favicon-32.png");
  await touchEditor.locator("img[src]").waitFor();
  await touch.getByRole("button", { name: "太字", exact: true }).tap();
  assert.equal(
    await touch
      .getByRole("button", { name: "太字", exact: true })
      .getAttribute("aria-pressed"),
    "true"
  );
  assert(
    await touch
      .getByRole("button", { name: "太字", exact: true })
      .evaluate(e => e.getBoundingClientRect().height >= 44)
  );
  await touch.screenshot({
    path: path.join(output, "editor-touch.png"),
    fullPage: true,
  });
  await touchContext.close();
  const published = await context.newPage();
  await published.goto(base + "/blog/editor-notebook");
  await published.locator(".simple-article-body h2").waitFor();
  await published.getByText('読みやすさ', { exact: true }).click();
  await published.getByLabel('文字サイズ', { exact: true }).selectOption('20');
  await published.getByLabel('行間', { exact: true }).selectOption('2.2');
  const headingStyles = () => published.evaluate(() => {
    const style = getComputedStyle(document.querySelector('.simple-article-body h2'));
    return [style.fontSize, style.lineHeight, style.textAlign];
  });
  assert.deepEqual(await headingStyles(), ["30px", "66px", "center"]);
  await published.reload();
  await published.locator(".simple-article-body h2").waitFor();
  assert.deepEqual(await headingStyles(), ["30px", "66px", "center"]);
  await published.getByText('読みやすさ', { exact: true }).click();
  await published.getByRole('button', { name: '標準に戻す' }).click();
  assert.equal((await headingStyles())[0], "24px");
  const cover = published.locator('.blog-article-cover img');
  await cover.waitFor();
  assert.equal(await cover.getAttribute('alt'), 'ノートの小さな月');
  assert.equal(await published.locator('.simple-article-body img').count(), 0, 'cover must not appear twice');
  assert(await cover.evaluate(image => image.complete && image.naturalWidth > 0));
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await published.setViewportSize({ width, height: 1000 });
    assert(await published.locator('.simple-article').evaluate(article =>
      article.firstElementChild?.classList.contains('blog-article-cover')
    ), 'cover must be first, before title and body');
    assert(await published.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `cover overflow at ${width}`);
  }
  assert.equal(
    await published.locator(".simple-article-body ol").getAttribute("start"),
    "3"
  );
  assert(
    (
      await published.locator(".simple-article-body pre").textContent()
    ).includes("<script>")
  );
  assert.equal(
    await published.locator(".simple-article-body script").count(),
    0
  );
  await published.screenshot({
    path: path.join(output, "published.png"),
    fullPage: true,
  });
  const coverSrc = await cover.getAttribute('src');
  for (const [slug, content] of [
    ['cover-multiple', `<p>最初の文章</p><p><img src="${coverSrc}" alt="カバー写真"></p><p>写真の説明を残す<img src="${coverSrc}" alt="本文写真"></p><p>最後の文章</p>`],
    ['cover-none', '<p>写真のない記事も表示できる</p>'],
  ]) {
    const payload = Buffer.from(JSON.stringify({ title: slug, slug, excerpt: 'カバー表示の検証', content, status: 'published', coverColor: 'mint' })).toString('base64');
    run(['-r', `require 'xserver/public/api/bootstrap.php';$p=json_decode(base64_decode('${payload}'),true);$p['createdAt']=now();$p['updatedAt']=now();$p['publishedAt']=now();sql('INSERT INTO records(kind,payload) VALUES(?,?)',['posts',json_encode($p)]);`]);
    await published.goto(base + '/blog/' + slug);
    await published.locator('.simple-article-body').waitFor();
    if (slug === 'cover-multiple') {
      assert.equal(await published.locator('.blog-article-cover img').getAttribute('alt'), 'カバー写真');
      assert.equal(await published.locator('.simple-article-body img').count(), 1);
      assert.equal(await published.locator('.simple-article-body img').getAttribute('alt'), '本文写真');
      assert((await published.locator('.simple-article-body').textContent()).includes('写真の説明を残す'));
    } else {
      assert.equal(await published.locator('.blog-article-cover').count(), 0);
      assert.equal(await published.locator('.simple-article-body').textContent(), '写真のない記事も表示できる');
    }
  }
  await published.close();
  const englishContext = await browser.newContext({ locale: "en-US", reducedMotion: "reduce" });
  const english = await englishContext.newPage();
  await english.goto(base);
  await english.getByRole("heading", { name: "Things I make, moments I keep" }).waitFor();
  assert.equal(await english.locator("html").getAttribute("lang"), "en");
  const switcher = english.getByRole("combobox", { name: "Language / 言語" });
  assert.equal(await switcher.inputValue(), "auto");
  await switcher.selectOption("ja");
  await english.getByRole("heading", { name: "制作と日々の記録" }).waitFor();
  await english.reload();
  await english.getByRole("heading", { name: "制作と日々の記録" }).waitFor();
  await switcher.selectOption("auto");
  await english.getByRole("heading", { name: "Things I make, moments I keep" }).waitFor();
  assert.deepEqual(await english.evaluate(async () => {
    const link = document.querySelector('link[rel="icon"]');
    const image = new Image();
    image.src = link.href;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, 32, 32);
    return [context.getImageData(0, 0, 1, 1).data[3], context.getImageData(16, 16, 1, 1).data[3]];
  }), [0, 255], 'favicon has transparent corners and a visible center');
  for (const route of ['/', '/works', '/photos', '/blog', '/about', '/blog/editor-notebook']) {
    await english.goto(base + route);
    await english.locator('.gallery-header').waitFor();
    for (const width of [320, 375, 430, 768, 1024, 1440]) {
      await english.setViewportSize({ width, height: 1000 });
      assert(await english.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `English overflow ${route} ${width}`);
      if (width < 768) {
        await english.getByRole('button', { name: 'Open menu', exact: true }).click();
        await english.getByText('Projects and the creative process', { exact: true }).waitFor();
        await english.getByRole('button', { name: 'Close menu', exact: true }).click();
      }
    }
  }
  await english.goto(base + '/blog/editor-notebook');
  await english.locator('.simple-article-body h2').waitFor();
  assert.equal(await english.locator('.simple-article-body h2').textContent(), 'ノートをひらく', 'post content stays original');
  await english.getByRole('heading', { name: 'Leave a comment' }).waitFor();
  await english.screenshot({ path: path.join(output, 'english-post.png'), fullPage: true });
  await english.goto(base + '/about');
  await english.getByRole('heading', { name: 'My gear' }).waitFor();
  await english.getByRole('heading', { name: 'Boarding pass & privacy' }).waitFor();
  await english.screenshot({ path: path.join(output, 'english-about.png'), fullPage: true });
  await englishContext.close();
  assert.deepEqual(errors, []);
  assert(!/PHP (?:Warning|Deprecated|Fatal error)/.test(log), log);
  console.log(
    "PASS: native picker from click/keyboard/touch; cancellation; same-file retry after a simulated error; image upload/save/reload; nearby settings; real PHP/SQLite/public view; ASCII/fullwidth shortcuts; IME composition replay; undo/redo; legacy HTML; six widths; lazy editor; reader typography and persistence; browser-language defaults/manual persistence/Auto reset; English navigation and original content; circular transparent favicon."
  );
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: false }).catch(() => {});
  fs.writeFileSync(path.join(output, 'failure-text.txt'), await page.locator('body').innerText().catch(() => ''));
  throw error;
} finally {
  fs.writeFileSync(path.join(output, "server.log"), log);
  await browser.close();
  server.kill();
}
