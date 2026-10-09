import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const { privateDir, publicDir } = JSON.parse(
  fs.readFileSync(".tools/preview.json", "utf8")
);
const php = process.env.PHP_BIN || path.resolve(".tools/php/php.exe");
const extensions = php.endsWith(".exe")
  ? [
      "-d",
      `extension_dir=${path.dirname(php)}/ext`,
      ...["pdo_sqlite", "sqlite3", "gd", "fileinfo", "mbstring"].flatMap(e => [
        "-d",
        `extension=${e}`,
      ]),
    ]
  : [];
const env = { ...process.env, PORTFOLIO_PRIVATE_DIR: privateDir };
if (!privateDir.startsWith(path.resolve(".tools") + path.sep))
  throw new Error("Preview requires an isolated local fixture");
if (!publicDir.startsWith(path.resolve(".tools") + path.sep))
  throw new Error("Preview requires an isolated public fixture");
spawnSync(
  php,
  [
    ...extensions,
    "-r",
    "require 'xserver/public/api/bootstrap.php'; sql('DELETE FROM attempts');",
  ],
  { env, stdio: "inherit" }
);
const server = spawn(
  php,
  [
    ...extensions,
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
  { env, stdio: "inherit" }
);
console.log("Local preview: http://127.0.0.1:8080/about (isolated QA content)");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.kill();
    process.exit();
  });
