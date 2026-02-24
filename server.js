// server.js
import express from "express";
import cors from "cors";
import { extractRecipe, extractRecipeWithDiagnostics, RecipeExtractionError } from "./dist/index.js";
import { pathToFileURL } from "node:url";

const PORT = process.env.PORT || 3000;
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS || 1);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30);
const MAX_URL_LENGTH = 2048;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const requestBuckets = new Map();

function getClientKey(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const clientKey = getClientKey(req);
  const existing = requestBuckets.get(clientKey);

  if (!existing || now >= existing.resetAt) {
    const fresh = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    requestBuckets.set(clientKey, fresh);
    res.setHeader("RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
    res.setHeader("RateLimit-Remaining", String(RATE_LIMIT_MAX_REQUESTS - fresh.count));
    res.setHeader("RateLimit-Reset", String(Math.ceil(fresh.resetAt / 1000)));
    next();
    return;
  }

  existing.count += 1;
  res.setHeader("RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, RATE_LIMIT_MAX_REQUESTS - existing.count)));
  res.setHeader("RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));

  if (existing.count > RATE_LIMIT_MAX_REQUESTS) {
    // Early exit to keep extraction work from being queued under abuse traffic.
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestBuckets.entries()) {
    if (now >= value.resetAt) requestBuckets.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

function getValidatedUrl(req) {
  const candidate = req.method === "GET" ? req.query?.url : req.body?.url;
  if (typeof candidate !== "string") {
    throw new RecipeExtractionError(400, "Missing URL parameter");
  }
  const normalized = candidate.trim();
  if (!normalized) {
    throw new RecipeExtractionError(400, "Missing URL parameter");
  }
  if (normalized.length > MAX_URL_LENGTH) {
    throw new RecipeExtractionError(400, "URL is too long");
  }
  return normalized;
}

function isDebugRequested(req) {
  const candidate = req.method === "GET" ? req.query?.debug : req.body?.debug;
  if (typeof candidate === "string") {
    const lowered = candidate.toLowerCase();
    return lowered === "1" || lowered === "true";
  }
  return candidate === true || candidate === 1;
}

export function createApp(extractor = extractRecipe, extractorWithDiagnostics = extractRecipeWithDiagnostics) {
  const app = express();
  app.set("trust proxy", TRUST_PROXY_HOPS);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    // Basic hardening headers for a JSON-only API.
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    next();
  });

  const corsOptions = {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true); // curl/server-to-server clients
        return;
      }
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new RecipeExtractionError(403, "Origin is not allowed"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 600,
    credentials: false,
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "10kb", strict: true }));

  // Liveness/readiness endpoint for container orchestrators.
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(rateLimit);

  // GET version
  app.get("/extract", async (req, res, next) => {
    try {
      const url = getValidatedUrl(req);
      if (isDebugRequested(req)) {
        const result = await extractorWithDiagnostics(url);
        res.json({ ...result.recipe, _debug: result.diagnostics });
        return;
      }
      const recipe = await extractor(url);
      res.json(recipe);
    } catch (error) {
      next(error);
    }
  });

  // POST version
  app.post("/extract", async (req, res, next) => {
    try {
      if (!req.is("application/json")) {
        throw new RecipeExtractionError(415, "Content-Type must be application/json");
      }
      const url = getValidatedUrl(req);
      if (isDebugRequested(req)) {
        const result = await extractorWithDiagnostics(url);
        res.json({ ...result.recipe, _debug: result.diagnostics });
        return;
      }
      const recipe = await extractor(url);
      res.json(recipe);
    } catch (error) {
      next(error);
    }
  });

  app.use((err, req, res, _next) => {
    if (err instanceof RecipeExtractionError) {
      if (isDebugRequested(req) && err.debugDetails) {
        res.status(err.statusCode).json({ error: err.publicMessage, _debug: err.debugDetails });
        return;
      }
      res.status(err.statusCode).json({ error: err.publicMessage });
      return;
    }

    if (err && typeof err.status === "number" && err.status >= 400 && err.status < 600) {
      const message = err.status < 500 ? "Request failed" : "Internal server error";
      res.status(err.status).json({ error: message });
      return;
    }

    console.error("Unhandled server error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

export function startServer(port = PORT) {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const server = startServer();
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Draining HTTP connections...`);
    server.close(() => {
      console.log("HTTP server closed cleanly.");
      process.exit(0);
    });

    // Hard timeout so Fly machine stop is not blocked by stuck sockets.
    setTimeout(() => {
      console.error("Force exiting after shutdown timeout.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
