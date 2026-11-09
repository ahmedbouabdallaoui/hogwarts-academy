import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import { getElixirs, getHouses, getSpells, WizardWorldError } from "./api";

const PORT = Number(process.env.PORT ?? 4000);
const PUBLIC_DIR = join(__dirname, "..", "public");
const CACHE_TTL_MS = 5 * 60 * 1000;

type Cached = { storedAt: number; payload: unknown };

const cache = new Map<string, Cached>();

/**
 * The upstream dataset changes rarely, so cache each response briefly. This
 * keeps the page snappy and is kind to a free Heroku dyno.
 */
async function cached(key: string, load: () => Promise<unknown>): Promise<unknown> {
  const hit = cache.get(key);

  if (hit && Date.now() - hit.storedAt < CACHE_TTL_MS) {
    return hit.payload;
  }

  const payload = await load();
  cache.set(key, { storedAt: Date.now(), payload });
  return payload;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const body_ = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body_),
    "cache-control": "no-store",
  });
  response.end(body_);
}

async function serveStatic(response: ServerResponse, pathname: string): Promise<void> {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  // normalize prevents ../ traversal escaping the public directory.
  const filePath = join(PUBLIC_DIR, normalize(relative));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-cache",
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

async function handleApi(url: URL, response: ServerResponse): Promise<boolean> {
  const params = (name: string): string | undefined => url.searchParams.get(name) ?? undefined;

  switch (url.pathname) {
    case "/api/houses":
      sendJson(response, 200, await cached("houses", () => getHouses()));
      return true;

    case "/api/spells": {
      const name = params("name");
      const type = params("type");
      const key = `spells:${name ?? ""}:${type ?? ""}`;
      sendJson(response, 200, await cached(key, () => getSpells({ name, type })));
      return true;
    }

    case "/api/elixirs": {
      const name = params("name");
      const difficulty = params("difficulty");
      const key = `elixirs:${name ?? ""}:${difficulty ?? ""}`;
      sendJson(response, 200, await cached(key, () => getElixirs({ name, difficulty })));
      return true;
    }

    default:
      return false;
  }
}

const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  const startedAt = Date.now();
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(url, response);

      if (!handled) {
        sendJson(response, 404, { error: `Unknown endpoint ${url.pathname}` });
      }
    } else {
      await serveStatic(response, url.pathname);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof WizardWorldError ? 502 : 500;

    console.error(`[academy] ${request.method} ${url.pathname} failed:`, message);
    sendJson(response, status, { error: message });
  } finally {
    console.log(
      `[academy] ${request.method} ${url.pathname} ${response.statusCode} ${Date.now() - startedAt}ms`
    );
  }
});

server.listen(PORT, () => {
  console.log(`\n  Hogwarts Academy running at http://localhost:${PORT}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
