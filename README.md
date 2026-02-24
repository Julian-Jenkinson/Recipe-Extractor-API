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

Runtime variables:

- `PORT` (default: `3000`)
- `CORS_ORIGINS` comma-separated allowlist (example: `https://app.example.com,https://admin.example.com`)
- `TRUST_PROXY_HOPS` (default: `1`)
- `RATE_LIMIT_WINDOW_MS` (default: `60000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `30`)
- `EXTRACTION_CACHE_TTL_MS` (default: `60000`)
- `EXTRACTION_CACHE_MAX_ENTRIES` (default: `500`)

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
curl "http://localhost:3000/extract?url=https://www.bbcgoodfood.com/recipes/chicken-tikka-masala"
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
