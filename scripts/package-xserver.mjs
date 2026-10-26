import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareXserverRelease } from "./xserver-release.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
await prepareXserverRelease(root);
if (process.platform === "win32") {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-File",
      fileURLToPath(new URL("./zip-xserver.ps1", import.meta.url)),
    ],
    { stdio: "inherit" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Could not create the update ZIP");
}
console.log(
  "Update: upload the contents of dist/update (Windows: dist/update.zip)."
);
console.log(
  "Overwrite files in public_html; do not delete or mirror the destination."
);
console.log("First installation only: dist/public includes uploads/.htaccess.");
