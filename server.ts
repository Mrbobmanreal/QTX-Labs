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

const __filename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? path.dirname(__filename) : "";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Nintendo DS Emulator Proxy Helper
  const proxyDSFile = async (reqPath: string, res: express.Response) => {
    const targetUrl = `https://ds.44670.org/${reqPath}`;
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).send(`Upstream error: ${response.statusText}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("content-type", contentType);
      } else {
        if (reqPath.endsWith(".js")) res.setHeader("content-type", "application/javascript");
        else if (reqPath.endsWith(".wasm")) res.setHeader("content-type", "application/wasm");
        else if (reqPath.endsWith(".css")) res.setHeader("content-type", "text/css");
        else if (reqPath.endsWith(".png")) res.setHeader("content-type", "image/png");
      }
      
      // Crucial: Cross-Origin Isolation headers for SharedArrayBuffer!
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error(`Error proxying DS file ${reqPath}:`, err);
      res.status(500).send(`Proxy error: ${err.message}`);
    }
  };

  // Specific DS player file routes
  app.get("/localforage.js", (req, res) => proxyDSFile("localforage.js", res));
  app.get("/pako.min.js", (req, res) => proxyDSFile("pako.min.js", res));
  app.get("/app.js", (req, res) => proxyDSFile("app.js", res));
  app.get("/dark.css", (req, res) => proxyDSFile("dark.css", res));
  app.get("/manifest.json", (req, res) => proxyDSFile("manifest.json", res));
  app.get("/icon.png", (req, res) => proxyDSFile("icon.png", res));
  app.get("/build/nds.js", (req, res) => proxyDSFile("build/nds.js", res));
  app.get("/build/nds.wasm", (req, res) => proxyDSFile("build/nds.wasm", res));
  app.get("/build-simd/nds.js", (req, res) => proxyDSFile("build-simd/nds.js", res));
  app.get("/build-simd/nds.wasm", (req, res) => proxyDSFile("build-simd/nds.wasm", res));

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

  // General Unblocked Game CDN Proxy
  const GAME_CDN_MAPS: Record<string, string> = {
    "miside": "https://cdn.jsdelivr.net/gh/web-ports/miside@main/",
    "fpn": "https://rawcdn.githack.com/bubbls/ports/main/fpn-FULLY_RECRAFTED-web/",
    "undertale-yellow": "https://cdn.jsdelivr.net/gh/genizy/web-port@main/undertale-yellow/",
    "crazy-chicken-3d": "https://rawcdn.githack.com/gn-math/assets/main/255/",
    "pizza-tower": "https://cdn.jsdelivr.net/gh/genizy/web-port@main/pizza-tower/",
    "crazy-cattle-3d": "https://rawcdn.githack.com/genizy/cc3d-mobile/main/",
    "doki-doki-literature-club": "https://cdn.jsdelivr.net/gh/genizy/google-class@d0cbe7c43047eb95d3c1455877387d540128e98e/dokidoki/",
    "super-mario-64": "https://rawcdn.githack.com/ArkShocer/sm64/main/",
    "fnaw": "https://rawcdn.githack.com/bubbls/UGS-Assets/main/FNAW-main/",
    "helltaker": "https://cdn.jsdelivr.net/gh/wasm-rip/HellTaker-Web@main/helltakerweb/",
    "sonic-mania": "https://rawcdn.githack.com/UGBONTOP/Sonic-Mania-InYourBrowser/main/",
    "frickbears-3": "https://cdn.jsdelivr.net/gh/reeyuki/frickbears3port@4e185a27651d1d331a2e37f40f3d4e7a431b5b03/",
    "bfdi-branches": "https://playgroundfree.github.io/bfdi-branches/",
    "bfdia-5b": "https://coppersalts.github.io/HTML5b/",
    "deltarune": "https://rawcdn.githack.com/genizy/web-port/1102f068fff0083d2a5ed979ebac6425540d78a5/deltarune/",
    "emulatorjs": "https://cdn.jsdelivr.net/gh/a456pur/seraph@81f551ca0aa8e3d6018d32d8ac5904ac9bc78f76/storage/emulatorjs/data/",
    "tetris-rom": "https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@c39521ba7e7523bc039606d7befe445d2929c916/",
    "cuphead": "https://cdn.jsdelivr.net/gh/web-ports/cuphead@c9ff1b6b16f9d402b78a42fc2200e1c076c0ab6e/",
    "caseoh-basics": "https://cdn.jsdelivr.net/gh/bubbls/ports@latest/baldi-caseoh/"
  };

  // Redirect /api/game-proxy/:gameId (no trailing slash) to /api/game-proxy/:gameId/ (with trailing slash)
  app.get("/api/game-proxy/:gameId", (req, res) => {
    const { gameId } = req.params;
    const qs = req.originalUrl.includes("?") ? req.originalUrl.substring(req.originalUrl.indexOf("?")) : "";
    res.redirect(302, `/api/game-proxy/${gameId}/${qs}`);
  });

  // Handle all requests with trailing slashes or subpaths under the game-proxy
  app.get("/api/game-proxy/:gameId/*", async (req, res) => {
    const { gameId } = req.params;
    const baseUrl = GAME_CDN_MAPS[gameId];
    if (!baseUrl) {
      return res.status(404).send(`Unknown game ID in proxy mapping: ${gameId}`);
    }

    // req.params[0] is the wildcard part after /api/game-proxy/:gameId/
    let relativePath = req.params[0] || "";

    // If sub-path is empty, default to index.html
    if (!relativePath || relativePath === "") {
      relativePath = "index.html";
    }

    const qs = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    const targetUrl = baseUrl + relativePath + qs;

    console.log(`[PROXY] gameId=${gameId}, relativePath=${relativePath} -> ${targetUrl}`);

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        console.warn(`[PROXY] Fetch failed for ${targetUrl} with status: ${response.status}`);
        return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        if (relativePath.endsWith(".js") || relativePath.endsWith("service-worker.js") || relativePath.endsWith("runner.js") || relativePath.endsWith("renpy.js") || relativePath.endsWith("renpy-pre.js")) {
          res.setHeader("content-type", "application/javascript");
        } else if (relativePath.endsWith(".wasm")) {
          res.setHeader("content-type", "application/wasm");
        } else {
          res.setHeader("content-type", contentType);
        }
      } else {
        if (relativePath.endsWith(".js") || relativePath.endsWith("service-worker.js") || relativePath.endsWith("runner.js") || relativePath.endsWith("renpy.js") || relativePath.endsWith("renpy-pre.js")) {
          res.setHeader("content-type", "application/javascript");
        } else if (relativePath.endsWith(".wasm")) {
          res.setHeader("content-type", "application/wasm");
        }
      }

      // Headers config for ServiceWorker, WASM, Web Workers (removed restrictive COOP/COEP that block nested iframes)
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Service-Worker-Allowed", `/api/game-proxy/${gameId}/`);

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error(`[PROXY ERROR] gameId=${gameId}:`, error);
      res.status(500).send(`Proxy Error: ${error.message}`);
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
  app.get("/src/games.json", (req, res) => {
    const filePath = path.join(process.cwd(), "src", "games.json");
    console.log("[SERVER] Accessing games.json at:", filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("[SERVER] Error sending games.json:", err);
        res.status(404).json({ error: "games.json not found" });
      }
    });
  });

  app.get("/src/games/webblox-demo.html", (req, res) => {
    const filePath = path.join(process.cwd(), "src/games", "webblox-demo.html");
    console.log("[SERVER] Accessing webblox-demo.html at:", filePath);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("[SERVER] Error sending webblox-demo.html:", err);
        res.status(404).send("WebBlox Demo template not found");
      }
    });
  });

  app.get("/src/games/:gameFile.html", (req, res) => {
    const filePath = path.join(process.cwd(), "src/games", `${req.params.gameFile}.html`);
    console.log("[SERVER] Accessing game file:", req.params.gameFile, "at path:", filePath);
    
    // Set headers to allow nested iframe loads inside external environments (removed restrictive COOP/COEP that block nested iframes)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Frame-Options", "ALLOWALL"); // Allow nested iframes
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[SERVER] Error sending game file ${req.params.gameFile}:`, err);
        res.status(404).send(`Game file ${req.params.gameFile}.html not found on this server`);
      }
    });
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
