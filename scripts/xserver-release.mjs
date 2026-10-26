import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

// Source uploads and private files are runtime data, never release inputs.
export async function prepareXserverRelease(root) {
  const publicDir = path.resolve(root, "dist/public");
  const updateDir = path.resolve(root, "dist/update");
  const html = await readFile(path.join(publicDir, "index.html"), "utf8");
  if (/__manus__|VITE_ANALYTICS|manus-runtime/.test(html))
    throw new Error("Legacy runtime reference in build");

  const apiDir = path.resolve(root, "xserver/public/api");
  const apiFiles = new Set([
    "index.php",
    "bootstrap.php",
    "procedures.php",
    "media.php",
    "music-library.json",
    "departure.php",
  ]);
  await cp(apiDir, path.join(publicDir, "api"), {
    recursive: true,
    filter: source => source === apiDir || apiFiles.has(path.basename(source)),
  });
  await cp(
    path.resolve(root, "xserver/public/.htaccess"),
    path.join(publicDir, ".htaccess")
  );
  await mkdir(path.join(publicDir, "uploads"), { recursive: true });
  await cp(
    path.resolve(root, "xserver/public/uploads/.htaccess"),
    path.join(publicDir, "uploads/.htaccess")
  );

  const allowed = new Set([
    "index.html",
    "assets",
    "api",
    ".htaccess",
    "uploads",
  ]);
  const files = await readdir(publicDir);
  if (files.some(name => !allowed.has(name)))
    throw new Error("Unexpected file in deploy output");
  if (
    (await readdir(path.join(publicDir, "uploads"))).some(
      name => name !== ".htaccess"
    )
  )
    throw new Error("Runtime media in deploy output");

  // Only this generated local directory is cleared, never server runtime data.
  if (path.dirname(updateDir) !== path.resolve(root, "dist"))
    throw new Error("Update output must be inside dist");
  await rm(updateDir, { recursive: true, force: true });
  await mkdir(updateDir, { recursive: true });
  for (const name of files.filter(name => name !== "uploads")) {
    await cp(path.join(publicDir, name), path.join(updateDir, name), {
      recursive: true,
    });
  }
}
