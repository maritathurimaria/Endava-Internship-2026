#!/usr/bin/env node
/**
 * TAP26-Junior Swagger UI server (zero dependencies, cross-platform).
 *
 * Serves Swagger UI for the RWA API contract plus a same-origin reverse proxy, so
 * "Try it out" works with the real session cookie (the API's CORS only allows :3000).
 *
 * Usage:
 *   node tap26/scripts/swagger-server.mjs [--port 3100] [--api http://localhost:3001]
 *   env: SWAGGER_PORT, API_URL
 *
 * Routes:
 *   GET /                  Swagger UI (tap26/swagger/index.html, assets from a pinned CDN)
 *   GET /openapi.json      tap26/openapi/openapi.json, read fresh on every request
 *   GET /openapi.yaml      tap26/openapi/openapi.yaml, read fresh on every request
 *   GET /health            { ok: true, api: <API reachable?>, target }
 *   ANY /api/*             reverse proxy to the API with the /api prefix stripped:
 *                          - streams request/response bodies, forwards method + headers
 *                          - drops the browser Origin (same-origin for the browser, no CORS needed)
 *                          - rewrites Set-Cookie (no Domain, Path=/) so connect.sid lands on this origin
 *                          - rewrites redirect Location headers back under /api
 *                          - upstream failure → 502 JSON
 *
 * Flow in the browser: 1) POST /login (Auth tag) with a seeded user + s3cret,
 * 2) call any other endpoint — the cookie is sent automatically.
 */
import { createServer, request as httpRequest, STATUS_CODES } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC_DIR = join(ROOT, "tap26", "openapi");
const UI_FILE = join(ROOT, "tap26", "swagger", "index.html");

/** Parse `--flag value` / `--flag=value` pairs. */
const parseFlags = (argv) =>
  argv.reduce((flags, token, i, all) => {
    if (!token.startsWith("--")) return flags;
    const [key, inline] = token.slice(2).split("=", 2);
    const next = all[i + 1];
    return { ...flags, [key]: inline ?? (next && !next.startsWith("--") ? next : "true") };
  }, {});

const flags = parseFlags(process.argv.slice(2));
if (flags.help) {
  console.log((await readFile(fileURLToPath(import.meta.url), "utf8")).split("*/")[0]);
  process.exit(0);
}

const config = Object.freeze({
  port: Number(flags.port ?? process.env.SWAGGER_PORT ?? 3100),
  api: new URL(flags.api ?? process.env.API_URL ?? "http://localhost:3001"),
});

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// ---- helpers -----------------------------------------------------------------------

const sendJson = (res, status, body) => {
  if (res.headersSent) return res.end();
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body, null, 2));
};

const sendFile = async (res, file, contentType, extraHeaders = {}) => {
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": contentType, "cache-control": "no-store", ...extraHeaders });
    res.end(body);
  } catch (error) {
    sendJson(res, 500, { error: `Cannot read ${file}`, detail: error.message });
  }
};

/** Drop `Domain=…`, force `Path=/` so the API cookie is stored for this origin and sent to /api/*. */
const rewriteSetCookie = (cookie) => {
  const parts = cookie
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p && !/^domain=/i.test(p) && !/^path=/i.test(p));
  return [...parts, "Path=/"].join("; ");
};

/** Map an upstream redirect back under the /api prefix (absolute API URLs and root-relative paths). */
const rewriteLocation = (location, api = config.api) => {
  if (!location) return location;
  if (location.startsWith(api.origin)) return `/api${location.slice(api.origin.length) || "/"}`;
  if (location.startsWith("/") && !location.startsWith("//")) return `/api${location}`;
  return location;
};

const forwardHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !HOP_BY_HOP.has(name) && name !== "host" && name !== "origin" && name !== "referer",
    ),
  );

const responseHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers)
      .filter(([name]) => !HOP_BY_HOP.has(name) && !name.startsWith("access-control-"))
      .map(([name, value]) => {
        if (name === "set-cookie") return [name, [].concat(value).map(rewriteSetCookie)];
        if (name === "location") return [name, rewriteLocation(value)];
        return [name, value];
      }),
  );

// ---- proxy -------------------------------------------------------------------------

const proxy = (req, res) => {
  const upstreamPath = req.url.replace(/^\/api(?=\/|\?|$)/, "") || "/";
  const target = new URL(upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`, config.api);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;

  const upstream = send(
    target,
    {
      method: req.method,
      headers: {
        ...forwardHeaders(req.headers),
        host: config.api.host,
        "x-forwarded-host": req.headers.host ?? "",
        "x-forwarded-proto": "http",
        "x-forwarded-prefix": "/api",
      },
      timeout: 30_000,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, responseHeaders(upstreamRes.headers));
      upstreamRes.pipe(res);
      log(req.method, req.url, `→ ${upstreamRes.statusCode}`);
    },
  );

  upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout (30s)")));
  upstream.on("error", (error) => {
    log(req.method, req.url, `→ 502 (${error.code ?? error.message})`);
    sendJson(res, 502, {
      error: "Bad Gateway",
      detail: `The API at ${config.api.origin} did not answer: ${error.code ?? error.message}`,
      hint: "Start the app with `yarn dev` (API on :3001) or pass --api <url>.",
    });
  });
  req.on("aborted", () => upstream.destroy());
  req.pipe(upstream);
};

/** True when anything answers on the API origin within 2 s. */
const apiReachable = () =>
  new Promise((done) => {
    const send = config.api.protocol === "https:" ? httpsRequest : httpRequest;
    const probe = send(new URL("/", config.api), { method: "GET", timeout: 2_000 }, (r) => {
      r.resume();
      done(true);
    });
    probe.on("timeout", () => probe.destroy(new Error("timeout")));
    probe.on("error", () => done(false));
    probe.end();
  });

const log = (method, url, outcome) => console.log(`${new Date().toISOString().slice(11, 19)} ${method} ${url} ${outcome}`);

// ---- server ------------------------------------------------------------------------

const handler = async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/api" || pathname.startsWith("/api/")) return proxy(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: STATUS_CODES[405] });

  switch (pathname) {
    case "/":
    case "/index.html":
      return sendFile(res, UI_FILE, "text/html; charset=utf-8");
    case "/openapi.json":
      return sendFile(res, join(SPEC_DIR, "openapi.json"), "application/json; charset=utf-8");
    case "/openapi.yaml":
      return sendFile(res, join(SPEC_DIR, "openapi.yaml"), "application/yaml; charset=utf-8", {
        "content-disposition": 'inline; filename="openapi.yaml"',
      });
    case "/health":
      return sendJson(res, 200, { ok: true, api: await apiReachable(), target: config.api.origin });
    case "/favicon.ico":
      res.writeHead(204);
      return res.end();
    default:
      return sendJson(res, 404, { error: "Not found", routes: ["/", "/openapi.json", "/openapi.yaml", "/health", "/api/*"] });
  }
};

const server = createServer((req, res) =>
  handler(req, res).catch((error) => sendJson(res, 500, { error: "Swagger server error", detail: error.message })),
);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `swagger-server: port ${config.port} is already in use — is the Swagger server already running?\n` +
        `  Open http://localhost:${config.port} or start on another port: node tap26/scripts/swagger-server.mjs --port ${config.port + 10}`,
    );
  } else {
    console.error(`swagger-server: ${error.message}`);
  }
  process.exit(1);
});

server.listen(config.port, async () => {
  const base = `http://localhost:${config.port}`;
  const reachable = await apiReachable();
  console.log(
    [
      `TAP26 Swagger UI      ${base}`,
      `OpenAPI spec          ${base}/openapi.json · ${base}/openapi.yaml`,
      `API proxy             ${base}/api/* → ${config.api.origin}  (${reachable ? "reachable" : "NOT reachable — run `yarn dev`"})`,
      `Health                ${base}/health`,
      `Try it: POST /login (Auth) with a seeded user + s3cret, then any endpoint. Ctrl+C to stop.`,
    ].join("\n"),
  );
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
