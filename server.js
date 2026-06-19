const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8766;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const ENDPOINT = "https://www.mibisivalencia.es/mapa/puntos.php";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function proxyStations(res) {
  https.get(ENDPOINT, (upstream) => {
    let body = "";
    upstream.setEncoding("utf8");
    upstream.on("data", (chunk) => {
      body += chunk;
    });
    upstream.on("end", () => {
      send(res, upstream.statusCode || 200, body, "application/json; charset=utf-8");
    });
  }).on("error", (error) => {
    send(res, 502, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
  });
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(ROOT, path.normalize(decodeURIComponent(requestedPath)));

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    send(res, 200, data, contentType);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (url.pathname === "/stations") {
    proxyStations(res);
    return;
  }

  serveFile(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`MIBISI map running on ${HOST}:${PORT}`);
});
