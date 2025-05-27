import { extractRecipe } from "./src";

const url = process.argv[2];

if (!url) {
  console.error("❌ Please provide a recipe URL.\nUsage: node cli.js <url>");
  process.exit(1);
}

extractRecipe(url)
  .then((recipe) => {
    console.log("✅ Extracted Recipe:\n", JSON.stringify(recipe, null, 2));
  })
  .catch((err) => {
    console.error("❌ Error extracting recipe:", err.message || err);
  });
