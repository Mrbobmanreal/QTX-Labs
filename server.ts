import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Readable } from "stream";

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

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

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

  // Favicon handler
  app.get("/favicon.ico", (req, res) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎮</text></svg>`);
  });

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
    "undertale-yellow": "https://raw.githubusercontent.com/genizy/web-port/main/undertale-yellow/",
    "crazy-chicken-3d": "https://rawcdn.githack.com/gn-math/assets/main/255/",
    "pizza-tower": "https://raw.githubusercontent.com/genizy/web-port/main/pizza-tower/",
    "crazy-cattle-3d": "https://raw.githubusercontent.com/genizy/cc3d-mobile/main/",
    "doki-doki-literature-club": "https://raw.githubusercontent.com/genizy/google-class/d0cbe7c43047eb95d3c1455877387d540128e98e/dokidoki/",
    "super-mario-64": "https://rawcdn.githack.com/ArkShocer/sm64/main/",
    "fnaw": "https://rawcdn.githack.com/bubbls/UGS-Assets/main/FNAW-main/",
    "helltaker": "https://cdn.jsdelivr.net/gh/wasm-rip/HellTaker-Web@main/helltakerweb/",
    "sonic-mania": "https://rawcdn.githack.com/UGBONTOP/Sonic-Mania-InYourBrowser/main/",
    "frickbears-3": "https://cdn.jsdelivr.net/gh/reeyuki/frickbears3port@4e185a27651d1d331a2e37f40f3d4e7a431b5b03/",
    "bfdi-branches": "https://playgroundfree.github.io/bfdi-branches/",
    "bfdia-5b": "https://coppersalts.github.io/HTML5b/",
    "deltarune": "https://raw.githubusercontent.com/genizy/web-port/main/deltarune/",
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
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });
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

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
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

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
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

  // Generic secure proxy for JSDelivr and raw CDN HTML files
  app.get("/api/raw-proxy", async (req, res) => {
    let targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("url query parameter is required");
    }

    // Convert github.com/.../blob/... to raw.githubusercontent.com/.../...
    if (targetUrl.includes("github.com/") && targetUrl.includes("/blob/")) {
      targetUrl = targetUrl
        .replace("github.com/", "raw.githubusercontent.com/")
        .replace("/blob/", "/");
    }

    // Security check: Only allow safe domains
    const allowedDomains = ["jsdelivr.net", "githubusercontent.com", "githack.com", "github.io", "github.com"];
    const isAllowed = allowedDomains.some(domain => targetUrl.includes(domain));
    if (!isAllowed) {
      return res.status(403).send("Forbidden proxy target");
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch upstream: ${response.statusText}`);
      }

      let content = await response.text();

      // Only inject base tag if one is not already present in the HTML
      const hasBaseTag = /<base\s+/i.test(content);
      let baseTag = "";
      if (!hasBaseTag) {
        const baseHref = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
        baseTag = `<base href="${baseHref}">`;
      }
      
      // Inject our standard ad-blocker CSS and Google Analytics hider directly
      const adHiderStyle = `
<style>
  #sidebarad1, #sidebarad2, [id*="sidebarad"], [class*="sidebarad"], 
  .adsbygoogle, iframe[src*="googleads"], div[class*="ad-"], div[id*="ad-"], 
  [id*="banner-ad"], [class*="banner-ad"], #anchor-ad, .ad-slot, .ad-container, 
  .ads-wrapper, #ad-slot, .adbanner, #adbanner, .google-ads, #sidebar-ad, .sidebar-ad {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0px !important;
    height: 0px !important;
    max-width: 0px !important;
    max-height: 0px !important;
  }
</style>
`;

      // Clean Google Tag Manager and other ads/trackers
      content = content.replace(/<script[^>]*src="[^"]*googletagmanager[^"]*"[^>]*><\/script>/gi, '');
      content = content.replace(/<script[^>]*src="[^"]*googlesyndication[^"]*"[^>]*><\/script>/gi, '');
      content = content.replace(/<script[^>]*src="[^"]*googleadservices[^"]*"[^>]*><\/script>/gi, '');
      content = content.replace(/<script[^>]*src="[^"]*pagead[^"]*"[^>]*><\/script>/gi, '');
      content = content.replace(/<script[^>]*src="[^"]*adsserving[^"]*"[^>]*><\/script>/gi, '');

      // Inject base tag and styles into the <head>
      if (content.toLowerCase().includes('<head>')) {
        content = content.replace(/<head>/i, '<head>' + baseTag + adHiderStyle);
      } else {
        content = baseTag + adHiderStyle + content;
      }

      // Also set correct headers to allow standard execution
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(content);
    } catch (err: any) {
      console.error(`Error in /api/raw-proxy for ${targetUrl}:`, err);
      res.status(500).send(`Proxy error: ${err.message}`);
    }
  });

  // --- REAL-TIME ANONYMOUS CHAT SYSTEM ---
  const MESSAGES_FILE = path.join(process.cwd(), "chat_messages.json");
  const NAMES_FILE = path.join(process.cwd(), "taken_names.json");
  const ROOM_PASSWORDS_FILE = path.join(process.cwd(), "room_passwords.json");
  const ROOM_EXPIRATIONS_FILE = path.join(process.cwd(), "room_expirations.json");

  let messagesStore: any[] = [];
  let takenNamesStore: Record<string, string> = {}; // username (lowercase) -> pin/key
  let roomPasswordsStore: Record<string, string> = {}; // roomName (lowercase) -> passphrase
  let roomExpirationsStore: Record<string, { createdAt: number; expiresAt: number | null; expiresInHours: number }> = {}; // roomName (lowercase) -> expiration info

  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const fileContent = fs.readFileSync(MESSAGES_FILE, "utf8");
      messagesStore = JSON.parse(fileContent);
    } else {
      // Welcome message in global room
      messagesStore = [
        {
          id: "msg-welcome-1",
          room: "global",
          username: "System",
          text: "Welcome to the unblocked QTX anonymous board! Share your thoughts, strategies, and games here. You don't need to register or log in, just like 4chan.",
          timestamp: Date.now() - 60000,
          color: "#00ff00"
        }
      ];
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messagesStore, null, 2), "utf8");
    }
  } catch (err) {
    console.error("Error loading chat messages file, using empty in-memory store:", err);
    messagesStore = [];
  }

  try {
    if (fs.existsSync(NAMES_FILE)) {
      takenNamesStore = JSON.parse(fs.readFileSync(NAMES_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error loading taken names store:", err);
    takenNamesStore = {};
  }

  try {
    if (fs.existsSync(ROOM_PASSWORDS_FILE)) {
      roomPasswordsStore = JSON.parse(fs.readFileSync(ROOM_PASSWORDS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error loading room passwords store:", err);
    roomPasswordsStore = {};
  }

  try {
    if (fs.existsSync(ROOM_EXPIRATIONS_FILE)) {
      roomExpirationsStore = JSON.parse(fs.readFileSync(ROOM_EXPIRATIONS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error loading room expirations store:", err);
    roomExpirationsStore = {};
  }

  // Function to save messages to file safely
  const saveMessagesToFile = () => {
    try {
      fs.writeFile(MESSAGES_FILE, JSON.stringify(messagesStore, null, 2), "utf8", (err) => {
        if (err) console.error("Error writing messages file:", err);
      });
    } catch (err) {
      console.error("Error in saveMessagesToFile:", err);
    }
  };

  const saveNamesToFile = () => {
    try {
      fs.writeFileSync(NAMES_FILE, JSON.stringify(takenNamesStore, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing names file:", err);
    }
  };

  const saveRoomPasswordsToFile = () => {
    try {
      fs.writeFileSync(ROOM_PASSWORDS_FILE, JSON.stringify(roomPasswordsStore, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing room passwords file:", err);
    }
  };

  const saveRoomExpirationsToFile = () => {
    try {
      fs.writeFileSync(ROOM_EXPIRATIONS_FILE, JSON.stringify(roomExpirationsStore, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing room expirations file:", err);
    }
  };

  // Check and purge expired rooms & their chat messages
  const checkAndCleanExpiredRooms = () => {
    const now = Date.now();
    let changed = false;
    Object.keys(roomExpirationsStore).forEach(room => {
      const expInfo = roomExpirationsStore[room];
      if (expInfo && expInfo.expiresAt && now >= expInfo.expiresAt) {
        messagesStore = messagesStore.filter(m => m.room !== room);
        delete roomPasswordsStore[room];
        delete roomExpirationsStore[room];
        changed = true;
        console.log(`[ROOM EXPIRATION] Auto-deleted expired room #${room}`);
      }
    });
    if (changed) {
      saveMessagesToFile();
      saveRoomPasswordsToFile();
      saveRoomExpirationsToFile();
    }
  };

  // Run periodic room expiration cleaner every 30 seconds
  setInterval(checkAndCleanExpiredRooms, 30000);

  // Helper to post an automated system notification
  const postSystemNotification = (room: string, text: string) => {
    const sysMsg = {
      id: "msg-system-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      room: room.toLowerCase(),
      username: "System Alert",
      text: text,
      avatar: "🚨",
      image: null,
      timestamp: Date.now(),
      color: "#ff3333"
    };
    messagesStore.push(sysMsg);
    saveMessagesToFile();
  };

  // Helper to fetch remote image and convert to Base64
  const fetchImageBase64 = async (url: string): Promise<{ mimeType: string; data: string } | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const mimeType = res.headers.get("content-type") || "image/png";
      const data = Buffer.from(buf).toString("base64");
      return { mimeType, data };
    } catch (e) {
      console.error("Error fetching image URL for moderation:", e);
      return null;
    }
  };

  // AI content moderation using Gemini 3.5 Flash
  const checkNSFWImage = async (imageInput: string): Promise<{ nsfw: boolean; reason?: string }> => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        console.warn("No GEMINI_API_KEY set. Skipping safety content moderation.");
        return { nsfw: false };
      }

      let mimeType = "image/png";
      let data = "";

      if (imageInput.startsWith("data:image/")) {
        const match = imageInput.match(/^data:([^;]+);base64,(.*)$/);
        if (!match) return { nsfw: false };
        mimeType = match[1];
        data = match[2];
      } else if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
        const fetched = await fetchImageBase64(imageInput);
        if (!fetched) return { nsfw: false };
        mimeType = fetched.mimeType;
        data = fetched.data;
      } else {
        return { nsfw: false };
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data
        }
      };

      const textPart = {
        text: "Analyze this image. You are a content moderation assistant. Check if the image contains explicit pornography, adult content, nudity, or sexually explicit content (NSFW/porn). Answer strictly in JSON format: {\"nsfw\": true, \"reason\": \"explanation of nsfw content\"} or {\"nsfw\": false}."
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text.trim());
      return {
        nsfw: !!result.nsfw,
        reason: result.reason || "Prohibited explicit content"
      };
    } catch (error) {
      console.error("Safety scan failed, skipping to prevent blocking false positives:", error);
      return { nsfw: false };
    }
  };

  // Get messages for a specific room
  app.get("/api/chat/messages", (req, res) => {
    const room = (req.query.room as string) || "global";
    const password = (req.query.password as string) || "";
    const normalizedRoom = room.toLowerCase();

    // Check if room is password protected
    const storedPass = roomPasswordsStore[normalizedRoom];
    if (storedPass) {
      if (!password || password.trim() !== storedPass) {
        return res.status(401).json({
          isLocked: true,
          room: normalizedRoom,
          messages: [],
          pinned: [],
          error: "Passphrase required to view this room."
        });
      }
    }

    const roomMsgs = messagesStore.filter(m => m.room === normalizedRoom);
    
    const pinnedMsgs = roomMsgs.filter(m => m.pinned === true);
    const recentMsgs = roomMsgs.slice(-150);

    res.json({
      messages: recentMsgs,
      pinned: pinnedMsgs,
      isLocked: false
    });
  });

  // Protect / take a name
  app.post("/api/chat/register-name", (req, res) => {
    const { username, key } = req.body;
    if (!username || typeof username !== "string" || username.trim() === "") {
      return res.status(400).json({ error: "Username is required." });
    }
    if (!key || typeof key !== "string" || key.trim() === "") {
      return res.status(400).json({ error: "PIN/Key is required." });
    }

    const lowerName = username.trim().toLowerCase();
    
    // Check if name is reserved
    if (lowerName === "system" || lowerName === "moderator" || lowerName === "admin" || lowerName === "board moderator" || lowerName === "system alert") {
      return res.status(400).json({ error: "This name is reserved by the system." });
    }

    if (takenNamesStore[lowerName]) {
      return res.status(409).json({ error: "This name is already claimed by another user." });
    }

    takenNamesStore[lowerName] = key.trim();
    saveNamesToFile();
    res.json({ success: true, message: `Name '${username.trim()}' successfully protected!` });
  });

  // Admin delete message endpoint
  app.post("/api/chat/delete-message", (req, res) => {
    const { id, isSelfDelete } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Message ID is required." });
    }

    const index = messagesStore.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Message not found." });
    }

    const msg = messagesStore[index];

    messagesStore.splice(index, 1);
    saveMessagesToFile();

    // Post system alert that message was removed
    const deletedBy = isSelfDelete ? "the author" : "a Board Moderator";
    postSystemNotification(msg.room || "global", `Post No. ${msg.timestamp % 100000000} was deleted by ${deletedBy}.`);

    res.json({ success: true });
  });

  // Admin pin/unpin message endpoint
  app.post("/api/chat/pin-message", (req, res) => {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Message ID is required." });
    }

    const msg = messagesStore.find(m => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message not found." });
    }

    msg.pinned = !msg.pinned;
    saveMessagesToFile();

    // Post system alert that message was pinned/unpinned
    const status = msg.pinned ? "pinned" : "unpinned";
    postSystemNotification(msg.room || "global", `Post No. ${msg.timestamp % 100000000} was ${status} by a Board Moderator.`);

    res.json({ success: true, pinned: msg.pinned });
  });

  // Create custom room endpoint
  app.post("/api/chat/create-room", (req, res) => {
    const { roomName, username, password, expiresInHours } = req.body;
    if (!roomName || typeof roomName !== "string" || roomName.trim() === "") {
      return res.status(400).json({ error: "Room name is required." });
    }

    const normalizedRoom = roomName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    if (!normalizedRoom) {
      return res.status(400).json({ error: "Invalid room name. Letters, numbers, hyphens, and underscores only." });
    }

    if (normalizedRoom === "global") {
      return res.status(400).json({ error: "Room 'global' already exists and cannot be password protected." });
    }

    // Process expiration setting (0 = never, 1, 4, 24, 168)
    const hoursNum = parseInt(expiresInHours, 10);
    const validHours = isNaN(hoursNum) ? 24 : hoursNum;
    const expiresAt = validHours > 0 ? Date.now() + (validHours * 3600 * 1000) : null;

    const existingPass = roomPasswordsStore[normalizedRoom];
    if (existingPass) {
      // Room is password protected. Check if provided passphrase matches
      if (!password || password.trim() !== existingPass) {
        return res.status(401).json({
          error: "Incorrect passphrase for this protected room.",
          isLocked: true
        });
      }
      return res.json({
        success: true,
        room: normalizedRoom,
        isLocked: true,
        message: `Joined protected room #${normalizedRoom}!`,
        expiresAt: roomExpirationsStore[normalizedRoom]?.expiresAt || null
      });
    }

    // New or unlocked room: set passphrase if provided
    const cleanPassword = (password && typeof password === "string") ? password.trim() : "";
    if (cleanPassword) {
      roomPasswordsStore[normalizedRoom] = cleanPassword;
      saveRoomPasswordsToFile();
    }

    // Save expiration configuration
    roomExpirationsStore[normalizedRoom] = {
      createdAt: Date.now(),
      expiresAt,
      expiresInHours: validHours
    };
    saveRoomExpirationsToFile();

    // Check if room already has messages
    const roomExists = messagesStore.some(m => m.room === normalizedRoom);
    if (!roomExists) {
      const creator = username ? username.trim() : "Gamer";
      const lockText = cleanPassword ? " 🔒 (Password Protected)" : "";
      const expText = expiresAt 
        ? ` ⏳ Auto-deletes in ${validHours} hour${validHours > 1 ? 's' : ''}.`
        : ` ♾️ Permanent room (no expiration).`;
      postSystemNotification(normalizedRoom, `Welcome to custom channel #${normalizedRoom}! Created by @${creator}.${lockText}${expText}`);
    }

    res.json({
      success: true,
      room: normalizedRoom,
      isLocked: !!cleanPassword,
      expiresAt,
      expiresInHours: validHours,
      message: cleanPassword ? `Room #${normalizedRoom} created & locked with passphrase!` : `Room #${normalizedRoom} created!`
    });
  });

  // Post a new message
  app.post("/api/chat/messages", async (req, res) => {
    const { room, username, password, text, avatar, banner, image, video, key, displayName, bio, fileData, fileName, fileSize, fileType } = req.body;
    if (!text && !image && !video && !fileData) {
      return res.status(400).json({ error: "Message text, image, video, or file is required" });
    }

    const cleanedRoom = (room && typeof room === "string" && room.trim() !== "") ? room.trim().toLowerCase() : "global";
    const cleanedUsername = (username && typeof username === "string" && username.trim() !== "") ? username.trim() : "Anonymous";

    // 0. Password check for protected room
    const requiredRoomPass = roomPasswordsStore[cleanedRoom];
    if (requiredRoomPass) {
      const userPass = (password && typeof password === "string") ? password.trim() : "";
      if (userPass !== requiredRoomPass) {
        return res.status(401).json({
          error: "Incorrect passphrase for this protected room.",
          isLocked: true
        });
      }
    }

    const trimmedUsername = cleanedUsername.substring(0, 30);
    const trimmedText = text ? text.substring(0, 2000) : "";

    const lowerName = trimmedUsername.trim().toLowerCase();

    // 1. Name taking protection check
    if (takenNamesStore[lowerName]) {
      if (!key || key.trim() !== takenNamesStore[lowerName]) {
        return res.status(403).json({ 
          error: "Name protection active", 
          message: `The name '${trimmedUsername}' is protected. Please enter the correct PIN in your profile card to use it.` 
        });
      }
    }

    // 2. NSFW AI Content Moderation Check
    if (image) {
      const isUrl = image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:image/");
      if (isUrl) {
        const safetyResult = await checkNSFWImage(image);
        if (safetyResult.nsfw) {
          // Log automated system warnings in channel so everyone knows safety policies are active!
          postSystemNotification(cleanedRoom, `Blocked explicit image content from user '${trimmedUsername}'. This user has been warned.`);
          
          return res.status(400).json({
            error: "NSFW content detected",
            warning: "WARNING: Your post was blocked because explicit pornography or adult content (NSFW) was detected. Please keep the board clean to avoid being banned.",
            reason: safetyResult.reason
          });
        }
      }
    }

    // Color list for nice design accents
    const colors = ["#00ff00", "#ff007f", "#33ccff", "#ffcc00", "#ff33ff", "#00ffff", "#ff6600", "#b366ff", "#00ffcc"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      room: cleanedRoom,
      username: trimmedUsername,
      displayName: (displayName && typeof displayName === "string") ? displayName.substring(0, 50) : trimmedUsername,
      bio: (bio && typeof bio === "string") ? bio.substring(0, 160) : "No bio written yet. 🎮",
      text: trimmedText,
      avatar: avatar || "👾",
      banner: (banner && typeof banner === "string") ? banner : null,
      image: image || null,
      video: video || null,
      fileData: fileData || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      fileType: fileType || null,
      timestamp: Date.now(),
      color
    };

    messagesStore.push(newMessage);
    
    // Safety limit: only keep last 5000 messages globally across the entire board to manage memory/disk space
    if (messagesStore.length > 5000) {
      messagesStore = messagesStore.slice(-4000);
    }

    saveMessagesToFile();
    res.status(201).json(newMessage);
  });

  // Get active rooms and their counts
  app.get("/api/chat/rooms", (req, res) => {
    checkAndCleanExpiredRooms();

    const counts: Record<string, number> = { global: 0 };
    messagesStore.forEach(m => {
      const r = m.room || "global";
      counts[r] = (counts[r] || 0) + 1;
    });
    // Ensure all password protected or expiration rooms exist in counts
    Object.keys(roomPasswordsStore).forEach(r => {
      if (counts[r] === undefined) counts[r] = 0;
    });
    Object.keys(roomExpirationsStore).forEach(r => {
      if (counts[r] === undefined) counts[r] = 0;
    });

    res.json({
      counts,
      lockedRooms: Object.keys(roomPasswordsStore),
      expirations: roomExpirationsStore
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
