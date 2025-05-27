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


## Error Messages
TBU


## Local development

```
npm run build       # convert to js
npm start           # start local server
npm run deploy      # deploy build to fly
fly logs            # view logs (past 24 hours only)
```


## Testing

 - TBU
 - 

## To be completed ⭐

- provide api endpoint
- provide demo site - link demo repo in this readme
- prepare testing process - best practice
- update usage docs
- add some better error messages
- add openAPI docs
- Add rate limiting / API key if it goes public
- Return structured error codes/messages
  

## Problems solved

I often find myself browsing recipe websites to cook something new, but struggle to ever find those recipes again later. This API extracts structured recipe data from any recipe webpage, enabling the creation of a recipe index app that saves essential recipe information in one centralized place for easy access and organization.

APP: 'Recipe Index' - Coming soon!

