import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize modern Google Gen AI client with appropriate user agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Generative Content Proxy Route
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, model } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "prompt is required in the body" });
      }

      // Use the specified model if valid, otherwise fallback to recommended 'gemini-3.5-flash'
      const targetModel = model || "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API server-handling error:", error);
      return res.status(500).json({ 
        error: "Failed to query Gemini API on backend", 
        message: error.message 
      });
    }
  });

  // WebBlox Unblocked Portal Proxy
  app.get("/api/webblox-proxy", async (req, res) => {
    const file = req.query.file;
    if (!file || typeof file !== "string") {
      return res.status(400).send("File query parameter is required");
    }

    // Sanitize to avoid directory traversal or arbitrary proxying
    if (file.includes("..") || file.includes("/") || file.includes("\\")) {
      return res.status(400).send("Invalid file name");
    }

    const targetUrl = `https://coldbrewofficial.github.io/WebBloxDemo/${file}`;

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch from source: ${response.statusText}`);
      }

      // Content-type matching
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("content-type", contentType);
      }

      // Set CORS and Cross-Origin isolation headers so SharedArrayBuffers work correctly!
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Pipe the body buffer to Express response
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error("WebBlox Proxy Error:", error);
      res.status(500).send(`WebBlox Proxy Error: ${error.message}`);
    }
  });

  // Local Game Portals Routing (Ensures files inside src/games/ are always accessible)
  app.get("/src/games/webblox-demo.html", (req, res) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(path.join(process.cwd(), "src/games/webblox-demo.html"));
  });

  app.get("/src/games/:gameFile.html", (req, res) => {
    res.sendFile(path.join(process.cwd(), "src/games", `${req.params.gameFile}.html`));
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
