# Recipe-Extractor-API

A REST API that extracts recipe details (title, ingredients, instructions, images) from any recipe webpage URL and returns the data in JSON format.


## Features 💥

- Supports JSON-LD and Microdata schema.org formats

- Robust fallback parsing for varied website structures

- Easy to integrate into other projects or use as a standalone tool

- Supported for both GET and POST methods


## Technology ✨ 

**Backend** - TypeScript, Node.JS, Express, Axios, Cheerio

**Ops** - Fly.io, Docker


## Usage 💫

Extract recipe data from a URL using the following endpoints:

### GET /extract

Example:
```
curl "https://recipe-extractor-api.fly.dev/extract?url=https://www.bbcgoodfood.com/recipes/chicken-tikka-masala"
```

Response:
```
{
  "title": "Chicken Tikka Masala",
  "ingredients": [...],
  "instructions": [...],
  "image": "https://..."
}
```

### POST /extract

Example:
```
curl -X POST https://recipe-extractor-api.fly.dev/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.bbcgoodfood.com/recipes/chicken-tikka-masala"}'
```

Request Body:
```
{
  "url": "https://www.bbcgoodfood.com/recipes/chicken-tikka-masala"
}
```

Response:
```
{
  "title": "Chicken Tikka Masala",
  "ingredients": [...],
  "instructions": [...],
  "image": "https://..."
}
```

Example usage in front end application:
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


## Error messages

**403 Forbidden**. 
The server understood the request but is refusing to authorize it.  
_This may occur if the target website blocks the API request, often interpreting it as a bot._  

**404 Not Found**  
The requested resource could not be found.  
_This usually happens if the recipe URL points to a non-existent page or the content has been removed._  

**400 Bad Request – "Missing URL parameter"**  
The request is missing the required url field.  
_Ensure that the url is provided either as a query parameter (GET) or in the JSON body (POST)._  

**422 Unprocessable Entity – "No recipe data found in JSON-LD or Microdata"**  
The page was successfully fetched, but no structured recipe data was found in supported formats.  
_This may occur if the recipe is embedded in an unsupported structure or obfuscated format._  


## Local development 🧑‍🏭

```
npm run build       # Convert TS to JS 
npm start           # Start local server
npm run deploy      # Deploy build to fly.io
fly logs            # View logs (past 24 hours only)
```


## Testing ⭐

 This project uses Jest for testing the recipe extraction functionality across a variety of real-world recipe websites.

- ✅ 18 passed — Recipes successfully extracted with title, ingredients, instructions, and image
- ⚠️ 1 failed due to a server-side block (403 error) — Some websites may block automated access
- ⚠️ 1 failed due to partial data — Recipe had no detectable instructions in the structured data

Running tests:
```
npm test
```

Tests are located in tests/extractor.test.ts. The suite checks that each recipe has:

- A non-empty title (string)
- A non-empty list of ingredients (string[])
- A non-empty set of instructions (string or string[])
- An image URL (string)
 

## Improvments 🤔 
- Some websites block bots, which may cause tests to fail with 403 errors.
- Recipe data formats can vary; normalizing these across sites is ongoing work.
- OpenAPI docs for better collaboration
- Consider adding rate limiting / API key
- check jsDOM dependencie
  

## Problems solved 🎯

I often find myself browsing recipe websites to cook something new, but struggle to ever find those recipes again later. This API extracts structured recipe data from any recipe webpage, enabling the creation of a recipe index app that saves essential recipe information in one centralized place for easy access and organization.

APP: 'Recipe Index' - Coming soon!

