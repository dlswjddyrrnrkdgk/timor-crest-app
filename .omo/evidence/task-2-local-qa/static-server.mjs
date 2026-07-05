import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , rootArg, portFileArg] = process.argv;
const root = path.resolve(rootArg || process.cwd());
const portFile = path.resolve(portFileArg || path.join(root, ".omo/evidence/task-2-local-qa/server-port.txt"));

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
]);

function resolveRequestPath(url) {
  const parsed = new URL(url, "http://127.0.0.1");
  const decoded = decodeURIComponent(parsed.pathname);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, "");
  const target = path.resolve(root, normalized || "index.html");
  if (!target.startsWith(root + path.sep) && target !== root) return null;
  return target;
}

const server = http.createServer((req, res) => {
  const target = resolveRequestPath(req.url || "/");
  if (!target) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(target, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const type = contentTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  const receipt = {
    pid: process.pid,
    root,
    port: address.port,
    url: `http://127.0.0.1:${address.port}/index.html`,
    startedAt: new Date().toISOString(),
    serverScript: fileURLToPath(import.meta.url),
  };
  fs.writeFileSync(portFile, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
