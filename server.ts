import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory cache for audio streams (limits network latency and avoids redundant TTS requests)
  const audioCache = new Map<string, Buffer>();

  // High-fidelity Vietnamese Text-To-Speech endpoint
  app.get("/api/tts", async (req, res) => {
    try {
      const text = ((req.query.text as string) || "").trim();
      if (!text) {
        res.status(400).send("Text parameter is required");
        return;
      }

      // Check cache first
      if (audioCache.has(text)) {
        const cached = audioCache.get(text)!;
        res.set({
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "Content-Length": cached.length.toString(),
        });
        res.send(cached);
        return;
      }

      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(text)}`;
      const response = await fetch(googleTtsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": "https://translate.google.com/",
        },
      });

      if (!response.ok) {
        res.status(response.status).send("Failed to fetch audio stream");
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Store in LRU-like cache
      if (audioCache.size > 800) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
      audioCache.set(text, buffer);

      res.set({
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": buffer.length.toString(),
      });
      res.send(buffer);
    } catch (err: any) {
      console.error("TTS Server Error:", err);
      res.status(500).send("TTS Error: " + (err?.message || "Unknown error"));
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ma Sói Server running on port ${PORT}`);
  });
}

startServer();
