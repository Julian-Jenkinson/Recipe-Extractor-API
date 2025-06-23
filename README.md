# Recipe-Extractor-API

A REST API that extracts recipe details (title, ingredients, instructions, images) from any recipe webpage URL and returns the data in JSON format.


## Features 💥

- Supports JSON-LD and Microdata (schema.org)
- Fallback parsing for varied website structures
- GET and POST Support
- Easy integration into other projects

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


## Testing ⭐

 This project uses Jest for testing the recipe extraction functionality across a variety of real-world recipe websites.

- ✅ **17 passed** — Full data extracted
- ⚠️ **2 failed due** Server blocked request (403)
- ⚠️ **1 failed due** Partial data (missing instructions)

Run tests:
```
npm test
```

Tests checks:

- A non-empty title
- Ingredient array with content
- Instructions (string or array)
- Image URL
 

## Improvments 🤔 
- Handle bot blocking websites more gracfully (resolve 403 error)
- Normalise inconsistent data formats.
- Add OpenAPI docs
- Add rate limiting / API key
   

## Problems solved 🎯

Recipe sites make it hard to save and re-find recipes. This API helps extract and centralize recipes for easier indexing — the backbone for the upcoming Recipe Index App. Coming soon!

