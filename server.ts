import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple Local Storage for Users
  const usersPath = path.join(process.cwd(), "users.json");
  let users: any[] = [];
  if (fs.existsSync(usersPath)) {
    try {
      users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
    } catch (e) {
      users = [];
    }
  }

  const saveUsers = () => {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  };

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }
    const newUser = { id: Date.now().toString(), email, password, name };
    users.push(newUser);
    saveUsers();
    res.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name } });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

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
