# Recipe-Extractor-API

A REST API that extracts recipe details (title, ingredients, instructions, images, ... ) from any recipe webpage URL and returns the data in JSON format.

## Quick Start (Docker)

Build:
```
docker build -t recipe-extractor-api:prod .
```

Run:
```
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e CORS_ORIGINS=https://your-frontend.example \
  recipe-extractor-api:prod
```

Smoke test:
```
curl http://localhost:3000/health
curl "http://localhost:3000/extract?url=https://www.bbcgoodfood.com/recipes/chicken-tikka-masala"
```


## Features 💥

- Supports JSON-LD and Microdata (schema.org)
- Fallback parsing for varied website structures
- GET and POST Support
- Easy integration into other projects


## Problems solved 🎯

Recipe sites make it hard to save and re-find recipes. This API helps extract and centralize recipes for easier indexing — the backbone for the upcoming Recipe Index App. Coming soon!


## Technology ✨ 

**Backend** - TypeScript, Node.JS, Express, Axios, Cheerio

**Ops** - Fly.io, Docker


## Usage 💫

Extract recipe data from a URL using the following endpoints:

GET /extract 

```
curl "https://recipe-extractor-api.fly.dev/extract?url=https://www.example.com/recipe"
```

POST /extract

```
curl -X POST https://recipe-extractor-api.fly.dev/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com/recipe"}'
```

GET /extract/social

```
curl "http://localhost:3000/extract/social?url=https://www.tiktok.com/@recipes/video/7473162105810701586&debug=1"
curl "http://localhost:3000/extract/social?url=https://www.instagram.com/p/DV17Q6Fk6xS/&debug=1"
curl "http://localhost:3000/extract/social?url=https://www.youtube.com/watch?v=VEm6JvwXhbY&debug=1"

curl -H "x-app-key: YOUR_APP_API_KEY" \
  "https://recipe-extractor-api.fly.dev/extract/social?url=https://www.youtube.com/watch?v=VEm6JvwXhbY"

```

POST /extract/social

```
curl -X POST http://localhost:3000/extract/social \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.tiktok.com/@recipes/video/7473162105810701586","debug":true}'
```

Social extraction is caption-first and currently supports direct TikTok video URLs, direct Instagram post/reel URLs, and direct YouTube video/Shorts URLs:

```
curl -X POST http://localhost:3000/extract/social \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/reel/abc123/","debug":true}'
```

Social extraction uses local `yt-dlp` and currently only reads caption/basic metadata from direct TikTok and Instagram post URLs. The production Docker image installs `yt-dlp`, so `YT_DLP_PATH` is only needed when you want to override the binary location.

Debug mode (adds `_debug` diagnostics to success/error responses):

GET:
```
curl "http://localhost:3000/extract?url=https://www.kitchensanctuary.com/peppercorn-sauce/&debug=1"
```

POST:
```
curl -X POST http://localhost:3000/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.kitchensanctuary.com/peppercorn-sauce/","debug":true}'
```

Note: `debug` must be its own query parameter (`&debug=1`), not part of the `url` value.

Request Body:
```
{
  "url": "https://www.example.com/recipe"
}

```

Front end example:
```
async function getRecipe() {
  const response = await fetch('https://recipe-extractor-api.fly.dev/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://www.bbcgoodfood.com/recipes/chicken-tikka-masala'
    }),
  });

  const data = await response.json();
  console.log(data);
}

getRecipe();
```

Sample Response:
```
{
  "title": "Chicken Tikka Masala",
  "ingredients": ["1 tbsp oil", "500g chicken", "..."],
  "instructions": ["Heat oil in a pan", "Add chicken", "..."],
  "image": "https://www.example.com/image.jpg"
  "source":	"bbcgoodfood.com"
  "category":	"Dinner, Main course"
  "notes":	[]
  "difficulty":	""
  "cookTime":	"50"
  "prepTime":	"15"
  "servingSize":	"10"
  "favourite":	false
}
```

## Error messages

- **403 Forbidden:** The server understood the request but is refusing to authorize it.
- **404 Not Found:** The requested resource could not be found.
- **400 Bad Request:** The request is missing the required url field.
- **422 Unprocessable Entity:** – No recipe data found in JSON-LD or Microdata

## Local development 🧑‍🏭

Create a local env file first:
```
cp .env.example .env
```

Then fill in the values you need. `server.js` loads `.env` automatically at startup.

```
npm run build       # Convert TS to JS 
npm start           # Start local server
npm run deploy      # Deploy build to fly.io
fly logs            # View logs (past 24 hours only)
```

Health check endpoint:
```
curl http://localhost:3000/health
```

## Environment Variables

Local `.env` support:

- Copy `.env.example` to `.env`
- `.env` is ignored by git
- Values from `.env` are loaded automatically when `server.js` starts

Runtime variables:

- `PORT` (default: `3000`)
- `APP_API_KEY` optional shared key for protecting `/extract` and `/extract/social` via the `x-app-key` header
- `APP_API_KEY_MODE` controls rollout for `APP_API_KEY`:
  - `off`: key is optional, no auth warning logs
  - `warn`: key is optional, but requests without a valid key are logged
  - `on`: key is required and invalid or missing keys return `401`
  - default behavior: `on` when `APP_API_KEY` is set, otherwise `off`
- `CORS_ORIGINS` comma-separated allowlist (example: `https://app.example.com,https://admin.example.com`)
- `TRUST_PROXY_HOPS` (default: `1`)
- `RATE_LIMIT_WINDOW_MS` (default: `60000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `30`)
- `EXTRACTION_CACHE_TTL_MS` (default: `60000`)
- `EXTRACTION_CACHE_MAX_ENTRIES` (default: `500`)
- `YT_DLP_PATH` optional path override for the local `yt-dlp` binary
- `OPENAI_API_KEY` required for `/extract/social`
- `OPENAI_MODEL` (default: `gpt-5-mini`)

## Docker (Production)

Build image:
```
docker build -t recipe-extractor-api:prod .
```

Run container:
```
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e CORS_ORIGINS=https://your-frontend.example \
  recipe-extractor-api:prod
```

Smoke checks:
```
curl http://localhost:3000/health
curl -H "x-app-key: your-app-key" "http://localhost:3000/extract?url=https://www.bbcgoodfood.com/recipes/chicken-tikka-masala"
```

When `APP_API_KEY_MODE=on` and `APP_API_KEY` is set, clients must send:
```
x-app-key: <your key>
```

When `APP_API_KEY_MODE=warn`, requests still succeed without the header, but the server logs a warning with request metadata so you can measure legacy traffic before enforcing the key.

Fly secrets example:
```
fly secrets set APP_API_KEY=your-long-random-key
```

Container hardening currently in place:

- Multi-stage Docker build
- Minimal Alpine runtime stage
- Non-root container user (`node`)
- Build cache optimization (`npm ci` layers and npm cache mount)
- Reduced build context via `.dockerignore`

## Fly.io Deployment Checklist

1. Set required secrets and env values (`fly secrets set ...` as needed).
2. Confirm health endpoint responds: `/health`.
3. Deploy: `fly deploy`.
4. Verify status and logs:
   - `fly status`
   - `fly logs`

Fly tuning guide:
- `docs/fly_optimizations.md`

## Testing ⭐

This project uses Jest with feature-organized suites:

- Unit tests: URL validation, normalizers, retry/failure handling
- Integration tests: end-to-end extraction flow with simulated upstream responses
- Security tests: SSRF and input safety guards
- Live web smoke tests: kept but skipped by default to avoid flaky external dependency

Run tests:
```
npm test -- --watchman=false
```

Coverage target: global 80%+ (statements, branches, functions, lines).

## Improvments 🤔 
- Handle bot blocking websites more gracfully (resolve 403 error)
- Normalise inconsistent data formats. (difficulty, notes, prep time, cook time, category)
- Add OpenAPI docs
- Add rate limiting / API key
