import { cp, mkdir, readdir, readFile } from "node:fs/promises";
await mkdir("dist/public", { recursive: true });
await cp("xserver/public", "dist/public", { recursive: true });
// Never copy private settings, databases, sessions or source code into public_html.
const files = await readdir("dist/public");
if (files.some(name => name.endsWith(".sqlite") || name === "config.php"))
  throw new Error("Private file in deploy output");
const html = await readFile("dist/public/index.html", "utf8");
if (/__manus__|VITE_ANALYTICS|manus-runtime/.test(html))
  throw new Error("Legacy runtime reference in build");
console.log(
  "XServer release prepared in dist/public (React assets + PHP API)."
);
