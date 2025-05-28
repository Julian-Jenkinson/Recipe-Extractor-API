// server.js
import express from "express";
import cors from "cors";
import { extractRecipe } from "./dist/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GET version
app.get("/extract", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Missing URL parameter" });

    try {
        const data = await extractRecipe(url);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST version
app.post("/extract", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL parameter" });

    try {
        const data = await extractRecipe(url);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
