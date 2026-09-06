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

  // Global Cross-Origin Isolation headers for SharedArrayBuffer & WebWorker Pthreads
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  });

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
    "caseoh-basics": "https://cdn.jsdelivr.net/gh/bubbls/ports@latest/baldi-caseoh/",
    "yikes-portal": "https://yikes.pw/portal/"
  };

  // Handle all game-proxy requests (root and subpaths)
  app.get(["/api/game-proxy/:gameId", "/api/game-proxy/:gameId/*"], async (req, res) => {
    const { gameId } = req.params;
    const baseUrl = GAME_CDN_MAPS[gameId];
    if (!baseUrl) {
      return res.status(404).send(`Unknown game ID in proxy mapping: ${gameId}`);
    }

    // Ensure trailing slash for root game url so relative paths work in browser
    const pathWithoutQs = req.originalUrl.split("?")[0];
    if (pathWithoutQs === `/api/game-proxy/${gameId}`) {
      const qs = req.originalUrl.includes("?") ? req.originalUrl.substring(req.originalUrl.indexOf("?")) : "";
      return res.redirect(302, `/api/game-proxy/${gameId}/${qs}`);
    }

    let relativePath = req.params[0] || "";
    const qs = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    let targetUrl = baseUrl + relativePath + qs;

    console.log(`[PROXY] gameId=${gameId}, relativePath=${relativePath} -> ${targetUrl}`);

    try {
      let response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });

      // If root path fetch failed, try index.html as fallback
      if (!response.ok && (!relativePath || relativePath === "")) {
        const fallbackUrl = baseUrl + "index.html" + qs;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          }
        });
        if (fallbackRes.ok) {
          response = fallbackRes;
        }
      }

      if (!response.ok) {
        console.warn(`[PROXY] Fetch failed for ${targetUrl} with status: ${response.status}`);
        return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (relativePath.endsWith(".js") || relativePath.endsWith("service-worker.js") || relativePath.endsWith("runner.js") || relativePath.endsWith("renpy.js") || relativePath.endsWith("renpy-pre.js")) {
        res.setHeader("content-type", "application/javascript");
      } else if (relativePath.endsWith(".wasm")) {
        res.setHeader("content-type", "application/wasm");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (relativePath.endsWith(".data") || relativePath.endsWith(".pck") || relativePath.endsWith(".bin")) {
        res.setHeader("content-type", "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (relativePath.endsWith(".svg")) {
        res.setHeader("content-type", "image/svg+xml");
      } else if (contentType) {
        res.setHeader("content-type", contentType);
      }

      // Headers config for ServiceWorker, WASM, Web Workers, and SharedArrayBuffer cross-origin isolation
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("content-length", contentLength);
      }
      const acceptRanges = response.headers.get("accept-ranges");
      if (acceptRanges) {
        res.setHeader("accept-ranges", acceptRanges);
      }

      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Service-Worker-Allowed", `/api/game-proxy/${gameId}/`);

      // Patch hl2_launcher.js for Portal to guarantee thread worker loading, chunk loader resilience, and Atomics unlock
      if (gameId === "yikes-portal" && relativePath.includes("hl2_launcher.js")) {
        let jsText = await response.text();

        // 1. Patch loadWasmModuleToAllWorkers to ensure worker pool loading timeouts/errors never block Emscripten dependencies
        const idxWorker = jsText.indexOf('loadWasmModuleToAllWorkers(onMaybeReady) {');
        if (idxWorker !== -1) {
          const idxWorkerEnd = jsText.indexOf('allocateUnusedWorker() {', idxWorker);
          if (idxWorkerEnd !== -1) {
            const origWorkerBlock = jsText.slice(idxWorker, idxWorkerEnd);
            const newWorkerBlock = `loadWasmModuleToAllWorkers(onMaybeReady) {
        if (ENVIRONMENT_IS_PTHREAD) {
          return onMaybeReady();
        }
        let done = false;
        const safeOnReady = () => {
          if (!done) {
            done = true;
            try { onMaybeReady(); } catch(e) { console.warn('onMaybeReady error:', e); }
          }
        };
        try {
          let pthreadPoolReady = Promise.all(PThread.unusedWorkers.map(PThread.loadWasmModuleToWorker));
          pthreadPoolReady.then(safeOnReady).catch(err => {
            console.warn('[Portal Proxy] Worker pool error:', err);
            safeOnReady();
          });
        } catch(e) {
          console.warn('[Portal Proxy] Worker pool exception:', e);
          safeOnReady();
        }
        setTimeout(() => {
          if (!done) {
            console.warn('[Portal Proxy] Worker pool timeout reached, proceeding to launch engine...');
            safeOnReady();
          }
        }, 3000);
      },
  `;
            jsText = jsText.replace(origWorkerBlock, newWorkerBlock);
          }
        }

        // 2. Patch setProgress & loadMap for IndexedDB persistent chunk caching and MB download tracking
        const idxSetProgress = jsText.indexOf('async setProgress(mapName, progress) {');
        const idxDataLoader = jsText.indexOf('const dataLoader = new DataLoader()', idxSetProgress !== -1 ? idxSetProgress : 0);
        if (idxSetProgress !== -1 && idxDataLoader !== -1) {
          const origSetProgressBlock = jsText.slice(idxSetProgress, idxDataLoader);
          const newSetProgressBlock = `async setProgress(mapName, progress, loadedBytes, totalBytes) {
		if (progress < 1) {
			if (typeof spinnerElement !== 'undefined' && spinnerElement) spinnerElement.style.display = '';
			if (typeof progressElement !== 'undefined' && progressElement) {
				progressElement.hidden = false;
				progressElement.value = Math.round(progress * 100);
				progressElement.max = 100;
			}
			if (typeof statusElement !== 'undefined' && statusElement) {
				if (loadedBytes && totalBytes) {
					const lMb = (loadedBytes / (1024 * 1024)).toFixed(1);
					const tMb = (totalBytes / (1024 * 1024)).toFixed(1);
					const pct = Math.round(progress * 100);
					statusElement.innerText = 'Downloading ' + mapName + ': ' + lMb + ' MB / ' + tMb + ' MB (' + pct + '%)';
				} else {
					const pct = Math.round(progress * 100);
					statusElement.innerText = 'Downloading map ' + mapName + ' (' + pct + '%)';
				}
			}
		} else {
			if (typeof spinnerElement !== 'undefined' && spinnerElement) spinnerElement.style.display = 'none';
			if (typeof statusElement !== 'undefined' && statusElement) statusElement.innerText = '';
			if (typeof progressElement !== 'undefined' && progressElement) progressElement.hidden = true;
		}
	}
	async loadMap(mapName) {
		this.setProgress(mapName, 0);
		let resolve;
		const promise = new Promise((res) => { resolve = res; });

		const unpackBuffer = (arrayBuf) => {
			try {
				const dv = new DataView(arrayBuf);
				let offset = 0;
				while(offset < dv.byteLength) {
					const pathLen = dv.getInt32(offset, true);
					const dataLen = dv.getInt32(offset + 4, true);
					const path = new TextDecoder().decode(new DataView(
						dv.buffer,
						offset + 8,
						pathLen
					));
					const blob = new Uint8Array(
						dv.buffer,
						offset + 8 + pathLen,
						dataLen
					);
					offset += 8 + pathLen + dataLen;
					const dir = path.replace(/\\/[^\\/]+$/, '');
					if (typeof FS !== 'undefined' && FS.mkdirTree) {
						FS.mkdirTree(dir);
						FS.writeFile(path, blob);
					}
				}
			} catch(err) {
				console.warn('Error unpacking map chunk:', mapName, err);
			}
		};

		const getCached = () => new Promise((res) => {
			try {
				const req = indexedDB.open('portal_chunks_v1', 1);
				req.onupgradeneeded = () => req.result.createObjectStore('chunks');
				req.onsuccess = () => {
					const tx = req.result.transaction('chunks', 'readonly');
					const getReq = tx.objectStore('chunks').get(mapName);
					getReq.onsuccess = () => res(getReq.result || null);
					getReq.onerror = () => res(null);
				};
				req.onerror = () => res(null);
			} catch(e) { res(null); }
		});

		const setCached = (buf) => new Promise((res) => {
			try {
				const req = indexedDB.open('portal_chunks_v1', 1);
				req.onupgradeneeded = () => req.result.createObjectStore('chunks');
				req.onsuccess = () => {
					const tx = req.result.transaction('chunks', 'readwrite');
					tx.objectStore('chunks').put(buf, mapName);
					tx.oncomplete = () => res();
					tx.onerror = () => res();
				};
				req.onerror = () => res();
			} catch(e) { res(); }
		});

		getCached().then(cachedBuf => {
			if (cachedBuf && cachedBuf.byteLength > 0) {
				console.log('[Portal Proxy] Loaded cached chunk from IndexedDB:', mapName);
				if (typeof statusElement !== 'undefined' && statusElement) statusElement.innerText = 'Loaded ' + mapName + ' from fast cache!';
				this.setProgress(mapName, 1);
				unpackBuffer(cachedBuf);
				return resolve();
			}

			const xhr = new XMLHttpRequest();
			xhr.responseType = 'arraybuffer';
			xhr.onprogress = e => {
				if (e.lengthComputable && e.total > 0) {
					this.setProgress(mapName, e.loaded / e.total, e.loaded, e.total);
				}
			};
			xhr.onerror = () => {
				console.warn('Cannot load map chunk:', mapName);
				this.setProgress(mapName, 1);
				resolve();
			};
			xhr.onload = async () => {
				this.setProgress(mapName, 1);
				if (xhr.status !== 200 && xhr.status !== 0) {
					console.warn('Map chunk status non-200:', xhr.status);
					return resolve();
				}
				if (xhr.response && xhr.response.byteLength > 0) {
					unpackBuffer(xhr.response);
					await setCached(xhr.response);
				}
				resolve();
			};
			xhr.open('GET', 'chunks/' + mapName + '.data', true);
			xhr.send();
		});

		return promise;
	}
}
`;
          jsText = jsText.replace(origSetProgressBlock, newSetProgressBlock);
        }

        // 3. Patch Module.downloadMap to guarantee Atomics / HEAP32 lock unlock under any circumstances
        const idxDl = jsText.indexOf('Module.downloadMap =');
        if (idxDl !== -1) {
          const idxDlEnd = jsText.indexOf('// end include:', idxDl);
          if (idxDlEnd !== -1) {
            const origDlBlock = jsText.slice(idxDl, idxDlEnd);
            const newDlBlock = `Module.downloadMap = (lock, mapName) => {
	console.log('[Portal Proxy] Requesting map load:', mapName);
	const unlock = () => {
		try {
			if (typeof Atomics !== 'undefined' && Atomics.notify) {
				Atomics.store(HEAP32, lock >> 2, 0);
				Atomics.store(HEAP32, lock, 0);
				Atomics.notify(HEAP32, lock >> 2);
				Atomics.notify(HEAP32, lock);
			}
		} catch(e) {}
		if (typeof HEAP32 !== 'undefined' && HEAP32) {
			HEAP32[lock >> 2] = 0;
			HEAP32[lock] = 0;
		}
	};
	dataLoader.loadMapWithDeps(mapName).then(() => {
		console.log('[Portal Proxy] Map loaded successfully:', mapName);
		unlock();
	}).catch(err => {
		console.error('[Portal Proxy] Error loading map:', mapName, err);
		unlock();
	});
}
`;
            jsText = jsText.replace(origDlBlock, newDlBlock);
          }
        }

        // 4. Patch addRunDependency('load_game_data') to prevent uncaught promise rejection sticking runDependencies at 50%
        const idxLoadGameData = jsText.indexOf("addRunDependency('load_game_data')");
        if (idxLoadGameData !== -1) {
          const idxPostJsEnd = jsText.indexOf("// end include: emscripten/post.js", idxLoadGameData);
          if (idxPostJsEnd !== -1) {
            const origGameDataBlock = jsText.slice(idxLoadGameData, idxPostJsEnd);
            const newGameDataBlock = `let gameDataDone = false;
const safeRemoveGameData = () => {
  if (!gameDataDone) {
    gameDataDone = true;
    try { removeRunDependency('load_game_data'); } catch(e) {}
  }
};
addRunDependency('load_game_data');
dataLoader.loadMapWithDeps('background1').then(x => {
    console.log('[Portal Proxy] Background map loaded!');
    safeRemoveGameData();
}).catch(err => {
    console.warn('[Portal Proxy] Background map load error:', err);
    safeRemoveGameData();
});
setTimeout(() => {
    if (!gameDataDone) {
        console.warn('[Portal Proxy] Background map timeout, unblocking boot...');
        safeRemoveGameData();
    }
}, 10000);
})();
`;
            jsText = jsText.replace(origGameDataBlock, newGameDataBlock);
          }
        }

        // 5. Suppress non-fatal C++ exception assertions in hl2_launcher.js so ___cxa_throw never aborts or triggers window.onerror
        const exceptionRegex = /assert\(false,\s*'Exception thrown, but exception catching is not enabled[^']*'\);/g;
        jsText = jsText.replace(exceptionRegex, "console.warn('[Portal Proxy] Suppressed non-fatal C++ exception');");

        // 6. Guarantee _scriptName is never undefined when document.currentScript is null in async execution
        jsText = jsText.replace(
          "var _scriptName = typeof document != 'undefined' ? document.currentScript?.src : undefined;",
          "var _scriptName = (typeof document != 'undefined' && document.currentScript && document.currentScript.src) ? document.currentScript.src : (typeof window !== 'undefined' ? (window.location.href.split('?')[0].split('#')[0].endsWith('/') ? window.location.href.split('?')[0].split('#')[0] + 'hl2_launcher.js' : window.location.href.split('?')[0].split('#')[0].replace(/\\/[^\\/]*$/, '/hl2_launcher.js')) : undefined);"
        );

        // 7. Patch updateCanvasDimensions to prevent 0-sized WebGL buffer
        jsText = jsText.replace(
          "updateCanvasDimensions(canvas, wNative, hNative) {",
          "updateCanvasDimensions(canvas, wNative, hNative) { if (!wNative) wNative = canvas.widthNative || window.innerWidth || 1280; if (!hNative) hNative = canvas.heightNative || window.innerHeight || 720; canvas.widthNative = wNative; canvas.heightNative = hNative;"
        );

        // 8. Guarantee SDL2 AudioContext auto-resumes and unlocks on user interaction
        jsText = jsText.replace(
          "if ((typeof navigator.userActivation) === 'undefined') { autoResumeAudioContext(SDL2.audioContext); }",
          "if (SDL2.audioContext) { autoResumeAudioContext(SDL2.audioContext); }"
        );
        jsText = jsText.replace(
          "if ((typeof navigator.userActivation) !== 'undefined') { if (navigator.userActivation.hasBeenActive) { SDL2.audioContext.resume(); } }",
          "if (SDL2.audioContext && SDL2.audioContext.state === 'suspended') { try { SDL2.audioContext.resume(); } catch(e){} }"
        );

        res.setHeader("content-type", "application/javascript");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(jsText);
      }

      // If HTML page, inject fullscreen CSS and HUD loader for canvas so games like Portal fill the viewport completely and show clear download status
      const isHtml = (contentType && contentType.includes("text/html")) || relativePath === "" || relativePath.endsWith(".html");
      if (isHtml) {
        res.setHeader("content-type", "text/html; charset=utf-8");
        let htmlText = await response.text();
        const customCss = `
    <style id="game-fullscreen-override">
      html, body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #000 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
      }
      div.emscripten_border, .emscripten_border {
        border: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 10 !important;
      }
      canvas, canvas.emscripten, #canvas {
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        object-fit: cover !important;
        display: block !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        border: 0 !important;
        z-index: 10 !important;
        outline: none !important;
        background-color: #000 !important;
      }
      
      /* Download Status Ring & Banner (Matching Source Engine HUD) */
      #portal-hud-banner {
        position: fixed !important;
        top: 24px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 999999 !important;
        background: rgba(18, 20, 26, 0.95) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(189, 215, 46, 0.2) !important;
        border-radius: 40px !important;
        padding: 10px 24px 10px 16px !important;
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
        color: #e2e8f0 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease, transform 0.3s ease !important;
      }

      .portal-hud-ring {
        width: 36px !important;
        height: 36px !important;
        border-radius: 50% !important;
        background: conic-gradient(#bdd72e 0%, #3a3f4d 0%) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        position: relative !important;
        box-shadow: 0 0 10px rgba(189, 215, 46, 0.4) !important;
      }

      .portal-hud-ring-inner {
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        background: #12141a !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        color: #bdd72e !important;
      }

      .portal-hud-text-container {
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
      }

      .portal-hud-title {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: #f1f5f9 !important;
        letter-spacing: 0.2px !important;
        white-space: nowrap !important;
      }

      .portal-hud-sub {
        font-size: 11px !important;
        color: #94a3b8 !important;
        margin-top: 1px !important;
      }

      /* Interactive Click-To-Play Overlay */
      #portal-play-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 999998 !important;
        background: rgba(10, 12, 18, 0.85) !important;
        backdrop-filter: blur(8px) !important;
        display: none;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        color: #ffffff !important;
        cursor: pointer !important;
        text-align: center !important;
        user-select: none !important;
      }

      #portal-play-btn {
        background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%) !important;
        color: #ffffff !important;
        padding: 16px 36px !important;
        border-radius: 40px !important;
        font-size: 18px !important;
        font-weight: 800 !important;
        letter-spacing: 0.5px !important;
        border: none !important;
        cursor: pointer !important;
        box-shadow: 0 10px 30px rgba(0, 210, 255, 0.4) !important;
        transition: all 0.2s ease !important;
        margin-top: 20px !important;
      }

      #portal-play-btn:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 12px 35px rgba(0, 210, 255, 0.6) !important;
      }

      #output, textarea#output, #emscripten_logo, a[href*="emscripten"], #status, #spinner, progress, #progress {
        display: none !important;
      }
      #controls {
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        z-index: 99999 !important;
      }
    </style>
  `;

        const customScript = `
    <script id="portal-hud-script">
      (function() {
        // Cross-Origin Isolation Polyfill for SharedArrayBuffer
        if (!window.crossOriginIsolated && typeof SharedArrayBuffer === 'undefined') {
          console.log('[Portal Proxy] Attempting SharedArrayBuffer polyfill...');
        }

        function setupPortalHud() {
          var status = document.getElementById('status');
          var progress = document.getElementById('progress');
          var canvas = document.getElementById('canvas');

          if (!status) return setTimeout(setupPortalHud, 100);

          var banner = document.getElementById('portal-hud-banner');
          if (!banner) {
            banner = document.createElement('div');
            banner.id = 'portal-hud-banner';
            banner.innerHTML = \`
              <div class="portal-hud-ring" id="portal-hud-ring-bg">
                <div class="portal-hud-ring-inner" id="portal-hud-ring-percent">0%</div>
              </div>
              <div class="portal-hud-text-container">
                <div class="portal-hud-title" id="portal-hud-text">Downloading map background1</div>
                <div class="portal-hud-sub" id="portal-hud-sub">Source WebGL Engine — Please wait...</div>
              </div>
            \`;
            document.body.appendChild(banner);
          }

          var overlay = document.getElementById('portal-play-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'portal-play-overlay';
            overlay.innerHTML = \`
              <div style="font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #ffffff;">PORTAL ENGINE READY</div>
              <div style="font-size: 14px; color: #94a3b8; margin-top: 8px;">Click anywhere to start playing with full audio</div>
              <button id="portal-play-btn">▶ START PLAYING</button>
            \`;
            document.body.appendChild(overlay);
          }

          var ringBg = document.getElementById('portal-hud-ring-bg');
          var ringPercent = document.getElementById('portal-hud-ring-percent');
          var hudText = document.getElementById('portal-hud-text');
          var hudSub = document.getElementById('portal-hud-sub');
          var hasFinished = false;

          function startGame() {
            if (overlay) overlay.style.display = 'none';
            if (banner) {
              banner.style.opacity = '0';
              setTimeout(function() { banner.style.display = 'none'; }, 400);
            }
            if (typeof SDL2 !== 'undefined' && SDL2.audioContext) {
              SDL2.audioContext.resume().catch(function(){});
            }
            if (typeof AL !== 'undefined' && AL.sharedCaptureAudioCtx) {
              AL.sharedCaptureAudioCtx.resume().catch(function(){});
            }
            if (canvas) {
              canvas.widthNative = window.innerWidth || 1280;
              canvas.heightNative = window.innerHeight || 720;
              if (typeof canvas.focus === 'function') {
                try { canvas.focus(); } catch(e){}
              }
            }
            window.dispatchEvent(new Event('resize'));
          }

          if (overlay) {
            overlay.addEventListener('click', startGame);
          }

          function checkStatus() {
            var text = (status.innerText || status.textContent || '').trim();
            var val = progress && progress.value !== null ? parseFloat(progress.value) : null;
            var max = progress && progress.max !== null ? parseFloat(progress.max) : null;

            var percent = 0;
            if (val !== null && !isNaN(val) && val >= 0) {
              if (max !== null && !isNaN(max) && max > 0) {
                percent = Math.min(100, Math.max(0, Math.round((val / max) * 100)));
              } else if (val <= 1) {
                percent = Math.min(100, Math.max(0, Math.round(val * 100)));
              } else if (val <= 100) {
                percent = Math.min(100, Math.max(0, Math.round(val)));
              }
            }

            if (ringBg) {
              ringBg.style.background = 'conic-gradient(#bdd72e 0% ' + percent + '%, #3a3f4d ' + percent + '% 100%)';
            }
            if (ringPercent) {
              ringPercent.textContent = percent > 0 ? percent + '%' : '✓';
            }

            if (text && (text.indexOf('Downloading') !== -1 || text.indexOf('Preparing') !== -1)) {
              window._portalHasStartedDownloading = true;
            }

            if (text === 'Running...' || text === 'All downloads complete.' || (percent === 100 && (!text || text.indexOf('Downloading') === -1))) {
              hasFinished = true;
            }

            if (!text && (hasFinished || window._portalHasStartedDownloading)) {
              hasFinished = true;
            }

            if (hasFinished) {
              if (banner) banner.style.display = 'none';
              if (overlay && overlay.style.display !== 'none') {
                overlay.style.display = 'flex';
              }
              return;
            }

            if (hudText) {
              if (text) {
                if (text.indexOf('(') !== -1 || text.indexOf('%') !== -1 || text.indexOf('MB') !== -1) {
                  hudText.textContent = text;
                } else if (percent > 0 && percent < 100) {
                  hudText.textContent = text + ' (' + percent + '%)';
                } else {
                  hudText.textContent = text;
                }
              } else if (percent > 0 && percent < 100) {
                hudText.textContent = 'Downloading map... (' + percent + '%)';
              } else {
                hudText.textContent = 'Initializing Portal Engine...';
              }
            }

            banner.style.display = 'flex';
            banner.style.opacity = '1';
          }

          var observer = new MutationObserver(checkStatus);
          observer.observe(status, { childList: true, characterData: true, subtree: true });
          setInterval(checkStatus, 250);
          checkStatus();

          function unlockAudioAndFocus() {
            if (typeof SDL2 !== 'undefined' && SDL2.audioContext && SDL2.audioContext.state === 'suspended') {
              SDL2.audioContext.resume().catch(function(){});
            }
            if (typeof AL !== 'undefined' && AL.sharedCaptureAudioCtx && AL.sharedCaptureAudioCtx.state === 'suspended') {
              AL.sharedCaptureAudioCtx.resume().catch(function(){});
            }
            if (canvas && typeof canvas.focus === 'function') {
              try { canvas.focus(); } catch(e){}
            }
          }
          ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart'].forEach(function(evt) {
            window.addEventListener(evt, unlockAudioAndFocus, { passive: true, capture: true });
          });
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', setupPortalHud);
        } else {
          setupPortalHud();
        }
      })();
    </script>
  `;

        const origErrMarker = "window.onerror = (event) => {";
        if (htmlText.includes(origErrMarker)) {
          const idxErr = htmlText.indexOf(origErrMarker);
          const firstClose = htmlText.indexOf("};", idxErr);
          const secondClose = htmlText.indexOf("};", firstClose + 2);
          if (idxErr !== -1 && secondClose !== -1) {
            const origErrBlock = htmlText.slice(idxErr, secondClose + 2);
            const safeErrBlock = `window.onerror = (event) => {
        console.warn('[Portal Proxy] Intercepted non-fatal window.onerror:', event);
        return true;
      };
      window.onunhandledrejection = (event) => {
        console.warn('[Portal Proxy] Intercepted unhandledrejection:', event ? event.reason : '');
        if (event && event.preventDefault) event.preventDefault();
      };`;
            htmlText = htmlText.replace(origErrBlock, safeErrBlock);
          }
        }

        if (htmlText.includes("</head>")) {
          htmlText = htmlText.replace("</head>", `${customCss}</head>`);
        } else {
          htmlText = customCss + htmlText;
        }

        if (htmlText.includes("</body>")) {
          htmlText = htmlText.replace("</body>", `${customScript}</body>`);
        } else {
          htmlText = htmlText + customScript;
        }

        return res.send(htmlText);
      }

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
      return res.setHeader("content-type", "text/html; charset=utf-8").send(`
        <body style="background:#000;color:#fff;font-family:monospace;display:flex;align-items:center;justify-center;height:100vh;margin:0">
          <div style="text-align:center">ERROR 403: URL query parameter is required</div>
        </body>
      `);
    }

    // Convert github.com/.../blob/... to raw.githubusercontent.com/.../...
    if (targetUrl.includes("github.com/") && targetUrl.includes("/blob/")) {
      targetUrl = targetUrl
        .replace("github.com/", "raw.githubusercontent.com/")
        .replace("/blob/", "/");
    }

    // Security check: Only allow safe HTTP/HTTPS domains
    const isAllowed = targetUrl.startsWith("http://") || targetUrl.startsWith("https://");
    if (!isAllowed) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(`
        <body style="background:#000;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <div style="text-align:center;padding:20px;border:1px solid rgba(255,255,255,0.1);border-radius:12px">
            <h2 style="margin:0 0 8px 0;font-size:20px">ERROR 403</h2>
            <p style="margin:0;font-size:12px;color:#888">Forbidden proxy target URL</p>
          </div>
        </body>
      `);
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        res.setHeader("content-type", "text/html; charset=utf-8");
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>ERROR ${response.status}</title>
            <style>
              body { background: #000; color: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; text-align: center; }
              .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px 20px; max-width: 380px; width: 100%; }
              .title { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin-bottom: 8px; color: #fff; text-transform: uppercase; }
              .desc { font-size: 11px; color: #a1a1aa; margin-bottom: 18px; line-height: 1.5; }
              .btn { display: inline-block; padding: 10px 18px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #00f0ff; text-decoration: none; font-size: 11px; font-weight: bold; border-radius: 8px; transition: all 0.2s; }
              .btn:hover { background: #00f0ff; color: #000; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">⚠️ ERROR 403</div>
              <div class="desc">If this game remains a black screen or cannot be embedded, launch it directly in a new tab!</div>
              <a class="btn" href="${targetUrl}" target="_blank" rel="noopener noreferrer">🚀 OPEN IN NEW TAB</a>
            </div>
          </body>
          </html>
        `);
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
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ERROR 403</title>
          <style>
            body { background: #000; color: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; text-align: center; }
            .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px 20px; max-width: 380px; width: 100%; }
            .title { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin-bottom: 8px; color: #fff; text-transform: uppercase; }
            .desc { font-size: 11px; color: #a1a1aa; margin-bottom: 18px; line-height: 1.5; }
            .btn { display: inline-block; padding: 10px 18px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #00f0ff; text-decoration: none; font-size: 11px; font-weight: bold; border-radius: 8px; transition: all 0.2s; }
            .btn:hover { background: #00f0ff; color: #000; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">⚠️ ERROR 403</div>
            <div class="desc">Network connection failed or host refused connection.</div>
            <a class="btn" href="${targetUrl}" target="_blank" rel="noopener noreferrer">🚀 OPEN IN NEW TAB</a>
          </div>
        </body>
        </html>
      `);
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
