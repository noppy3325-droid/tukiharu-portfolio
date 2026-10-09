import { spawn } from "node:child_process";
import path from "node:path";
const mode = process.argv[2] || "dev";
if (!["dev", "build"].includes(mode)) throw new Error("Use dev or build");
const server = spawn(
  process.env.PHP_BIN || "php",
  [
    "-S",
    "127.0.0.1:8080",
    "-t",
    mode === "build" ? "dist/public" : "xserver/public",
    "xserver/router.php",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORTFOLIO_PRIVATE_DIR:
        process.env.PORTFOLIO_PRIVATE_DIR ||
        path.resolve("xserver/portfolio-private"),
    },
  }
);
server.on("error", () => {
  console.error(
    "PHP could not start. Install PHP with the required extensions or set PHP_BIN."
  );
  process.exitCode = 1;
});
server.on("exit", code => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill());
