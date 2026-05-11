import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // RAG Logic: Simple TF-IDF like retrieval
  const knowledgeBasePath = path.join(process.cwd(), "src", "knowledge_base.txt");
  let chunks: string[] = [];

  if (fs.existsSync(knowledgeBasePath)) {
    const content = fs.readFileSync(knowledgeBasePath, "utf-8");
    // Simple chunking by paragraphs or sentences
    chunks = content.split("\n\n").filter(c => c.trim().length > 0);
  }

  function getSimilarity(q: string, chunk: string) {
    const qWords = new Set(q.toLowerCase().match(/\w+/g) || []);
    const cWords = chunk.toLowerCase().match(/\w+/g) || [];
    let score = 0;
    cWords.forEach(w => {
      if (qWords.has(w)) score++;
    });
    return score / (qWords.size || 1);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/retrieve", (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });

    const scored = chunks.map(chunk => ({
      chunk,
      score: getSimilarity(query, chunk)
    }));

    // Sort by score and take top 3
    const topChunks = scored
      .sort((a, b) => b.score - a.score)
      .filter(s => s.score > 0)
      .slice(0, 3)
      .map(s => s.chunk);

    res.json({ chunks: topChunks });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
