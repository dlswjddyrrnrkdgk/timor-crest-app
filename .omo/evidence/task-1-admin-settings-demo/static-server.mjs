import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [, , rootArg, portArg] = process.argv;
if (!rootArg || !portArg) {
  console.error("usage: node static-server.mjs <root> <port>");
  process.exit(2);
}

const root = path.resolve(rootArg);
const port = Number(portArg);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
]);

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  const requested = path.normalize(decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
  const filePath = path.join(root, requested);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": types.get(path.extname(filePath)) || "application/octet-stream" });
    res.end(buffer);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ ok: true, port, root, pid: process.pid }));
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
