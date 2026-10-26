import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareXserverRelease } from "./xserver-release.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "portfolio-release-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = {
    "dist/public/index.html": "<html>portfolio</html>",
    "dist/public/assets/app.js": "app",
    "xserver/public/api/index.php": "<?php // API",
    "xserver/public/api/departure.php": "<?php // Departure adapter",
    "xserver/public/api/music-library.json": "[]",
    "xserver/public/api/google-books.php": "<?php // Google Books adapter",
    "xserver/public/api/private.sqlite": "private",
    "xserver/public/api/config.php": "private config",
    "xserver/public/uploads/.htaccess": "Options -Indexes",
    "xserver/public/uploads/photo.webp": "uploaded media",
    "xserver/public/.htaccess": "RewriteEngine On",
    "xserver/config.php": "private config",
    "dist/update/stale.js": "old release",
  };
  for (const [file, contents] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), contents);
  }
  return root;
}

test("update excludes uploads and private data, keeps routing and clears old release files", async t => {
  const root = await fixture(t);
  await prepareXserverRelease(root);
  assert.deepEqual((await readdir(path.join(root, "dist/update"))).sort(), [
    ".htaccess",
    "api",
    "assets",
    "index.html",
  ]);
  assert.deepEqual(await readdir(path.join(root, "dist/update/api")), [
    "departure.php",
    "index.php",
    "music-library.json",
  ]);
  assert.equal(
    await readFile(path.join(root, "dist/update/.htaccess"), "utf8"),
    "RewriteEngine On"
  );
  assert.equal((await readdir(path.join(root, "dist/update/api"))).includes("google-books.php"), false);
  assert.deepEqual(await readdir(path.join(root, "dist/public/uploads")), [
    ".htaccess",
  ]);
  assert.equal(
    await readFile(
      path.join(root, "xserver/public/uploads/photo.webp"),
      "utf8"
    ),
    "uploaded media"
  );
  assert.equal(
    await readFile(path.join(root, "xserver/config.php"), "utf8"),
    "private config"
  );
});

test("unexpected private files in the build fail packaging", async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, "dist/public/config.php"), "private");
  await assert.rejects(prepareXserverRelease(root), /Unexpected file/);
});

test("runtime media in the build fail packaging", async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, "dist/public/uploads"));
  await writeFile(path.join(root, "dist/public/uploads/photo.webp"), "media");
  await assert.rejects(prepareXserverRelease(root), /Runtime media/);
});
