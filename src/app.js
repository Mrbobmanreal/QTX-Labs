// QTX Labs - Vanilla JS Implementation
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// This version runs directly in the browser without any build step.

let debugLogs = [];
let showDebugPanel = false;

// Intercept Console
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addDebugLog(type, args) {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  debugLogs.unshift({ type, msg, time: new Date().toLocaleTimeString() });
  if (debugLogs.length > 100) debugLogs.pop();
  if (showDebugPanel) render(); // Only re-render if visible for performance
}

console.log = (...args) => {
  originalLog(...args);
  addDebugLog('log', args);
};
console.error = (...args) => {
  originalError(...args);
  addDebugLog('error', args);
};
console.warn = (...args) => {
  originalWarn(...args);
  addDebugLog('warn', args);
};

let games = [];
let userGames = JSON.parse(localStorage.getItem('user_games')) || [];
let categories = ['All'];
let selectedCategory = 'All';
let recentlyPlayedIds = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
let favoriteGameIds = JSON.parse(localStorage.getItem('favoriteGames')) || [];
let filteredGames = [];
let searchQuery = '';
let isLoading = true;
let selectedGame = null;
let isFullScreen = false;
let currentTab = 'games'; // 'games', 'music', 'create', 'settings'
let importModalVisible = false;
let createMode = 'code'; // 'code' or '3d'
let studioTool = 'select'; // 'select', 'move', 'scale', 'rotate'
let activeRibbonTab = 'home'; // 'file', 'home', 'model', 'test', 'view'
let projects = JSON.parse(localStorage.getItem('studio_projects')) || [];
let currentProjectId = localStorage.getItem('currentProjectId') || null;
let autoSaveActive = localStorage.getItem('autoSaveEnabled') === 'true';
let labIdentity = JSON.parse(localStorage.getItem('lab_identity')) || { name: 'Operator', title: 'Lead Researcher', icon: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=100&h=100' };

// Playtime Tracking
let playTimes = JSON.parse(localStorage.getItem('studio_playtimes')) || {}; // gameId -> seconds
let sessionStartTime = null;
let currentSessionGameId = null;

// AI Agent State
let isGeneratingAI = false;

function createSkeletonCard(size = 'normal') {
  const isSmall = size === 'small';
  return `
    <div class="bg-[#0c0c0c] border border-[#1a1a1a] rounded-[2rem] overflow-hidden animate-shimmer shimmer">
      <div class="aspect-video bg-[#111]"></div>
      <div class="${isSmall ? 'p-4' : 'p-6'} space-y-3">
        <div class="h-4 bg-[#1a1a1a] rounded-sm w-3/4"></div>
        ${!isSmall ? `<div class="h-2 bg-[#141414] rounded-sm w-1/2"></div>` : ''}
      </div>
    </div>
  `;
}

function createGameCard(game, size = 'normal') {
  const isFavorite = favoriteGameIds.includes(game.id);
  const isSmall = size === 'small';
  
  return `
    <div
      data-game-id="${game.id}"
      class="game-card group relative bg-[#0c0c0c] border border-[#1a1a1a] rounded-[2rem] overflow-hidden hover:border-[#00ff00]/60 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-[0_0_30px_rgba(0,255,0,0.15),0_20px_40px_-15px_rgba(0,0,0,0.9)] cursor-pointer animate-in fade-in zoom-in-95 duration-500"
    >
      <div onclick="window.openGame('${game.id}')" class="aspect-video relative overflow-hidden bg-[#111]">
        <div class="absolute inset-0 bg-gradient-to-br from-[#00ff00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <img
          src="${game.thumbnail}"
          alt="${game.title}"
          referrerPolicy="no-referrer"
          loading="lazy"
          class="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700 ease-out filter brightness-[0.7] group-hover:brightness-100"
        />
        
        <!-- Tech Elements Overlay -->
        <div class="absolute top-4 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10">
           <div class="w-1 h-3 bg-[#00ff00] rounded-full shadow-[0_0_8px_#00ff00]"></div>
           <div class="w-1 h-1 bg-[#00ff00] rounded-full"></div>
        </div>

        <!-- Gradient Overlay -->
        <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
        
        ${!isSmall ? `
          <!-- Category Badge -->
          <div class="absolute bottom-4 left-4">
             <span class="px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-[#00ff00]">
               ${game.category || 'Construct'}
             </span>
          </div>
        ` : ''}

        <div class="absolute inset-0 bg-[#00ff00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center">
          <div class="bg-white text-black p-4 rounded-2xl scale-75 rotate-12 group-hover:scale-100 group-hover:rotate-0 transition-all duration-500 shadow-[0_0_30px_rgba(0,255,0,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6v12l10-6z"></path></svg>
          </div>
        </div>
      </div>
      
      <!-- Favorite Toggle -->
      <button 
        onclick="window.toggleFavorite('${game.id}'); event.stopPropagation();"
        class="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/5 hover:border-[#00ff00]/50 transition-all flex items-center justify-center ${isFavorite ? 'text-[#00ff00]' : 'text-white/20'}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
      </button>

      <div onclick="window.openGame('${game.id}')" class="${isSmall ? 'p-4' : 'p-6'} space-y-2">
        <h3 class="${isSmall ? 'text-xs' : 'text-lg'} font-black group-hover:text-white transition-colors duration-300 uppercase italic tracking-tighter truncate">
           ${game.title}
        </h3>
        ${!isSmall ? `
          <div class="flex items-center gap-2">
             <div class="w-1 h-1 bg-[#222] group-hover:bg-[#00ff00] rounded-full transition-colors"></div>
             <p class="text-[#555] text-[10px] font-bold uppercase tracking-widest truncate group-hover:text-[#888] transition-colors">${game.developer || 'Internal Labs'}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

let sceneObjects = [];
let selectedObjectId = null;

function initStudioState() {
  if (currentProjectId) {
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
      sceneObjects = project.objects;
    } else {
      currentProjectId = null;
    }
  }
  
  if (!currentProjectId && projects.length === 0) {
    // Create default project
    const defaultProject = {
      id: 'proj-' + Date.now(),
      name: 'New Place',
      objects: [{ id: 'cube-1', type: 'cube', name: 'BasePart', position: {x:0, y:-0.5, z:0}, rotation: {x:0, y:0, z:0}, scale: {x:50, y:1, z:50}, color: '#333333' }],
      lastModified: Date.now()
    };
    projects.push(defaultProject);
    currentProjectId = defaultProject.id;
    sceneObjects = defaultProject.objects;
    saveProjects();
  } else if (!currentProjectId && projects.length > 0) {
    currentProjectId = projects[0].id;
    sceneObjects = projects[0].objects;
  }
}

function saveProjects() {
  localStorage.setItem('studio_projects', JSON.stringify(projects));
  localStorage.setItem('currentProjectId', currentProjectId);
}

function createNewProject() {
  const newProj = {
    id: 'proj-' + Date.now(),
    name: 'Untitled Game',
    objects: [{ id: 'cube-1', type: 'cube', name: 'BasePart', position: {x:0, y:-0.5, z:0}, rotation: {x:0, y:0, z:0}, scale: {x:50, y:1, z:50}, color: '#333333' }],
    lastModified: Date.now()
  };
  projects.unshift(newProj);
  loadProject(newProj.id);
}

function loadProject(id) {
  const project = projects.find(p => p.id === id);
  if (project) {
    currentProjectId = id;
    sceneObjects = project.objects;
    selectedObjectId = null;
    saveProjects();
    render();
    if (createMode === '3d') initThreeJS();
  }
}

function saveCurrentProject() {
  const confirmed = confirm("Are you sure you want to save your progress?");
  if (confirmed) {
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
      project.objects = sceneObjects;
      project.lastModified = Date.now();
      saveProjects();
      showToast('Project Saved Successfully');
      
      const goHome = confirm("Save Successful! Would you like to return to the Projects Hub?");
      if (goHome) {
        setTab('projects_hub');
      }
    }
  }
}

function renameCurrentProject(newName) {
  const project = projects.find(p => p.id === currentProjectId);
  if (project) {
    project.name = newName;
    saveProjects();
    render();
  }
}

function deleteProject(id) {
  projects = projects.filter(p => p.id !== id);
  if (currentProjectId === id) {
    currentProjectId = projects.length > 0 ? projects[0].id : null;
    initStudioState();
  }
  saveProjects();
  render();
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest z-[100] animate-bounce';
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

let undoStack = [];
let redoStack = [];

function pushToHistory() {
  undoStack.push(JSON.stringify(sceneObjects));
  if (undoStack.length > 50) undoStack.shift(); // Limit history to 50 steps
  redoStack = [];
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(sceneObjects));
  sceneObjects = JSON.parse(undoStack.pop());
  saveScene();
  render();
  updateThreeScene();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(sceneObjects));
  sceneObjects = JSON.parse(redoStack.pop());
  saveScene();
  render();
  updateThreeScene();
}

let userCode = localStorage.getItem('userCode') || `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #000; color: #00ff00; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
    #player { width: 50px; height: 50px; background: #00ff00; position: absolute; border-radius: 4px; box-shadow: 0 0 20px #00ff00; }
    .coin { width: 20px; height: 20px; background: yellow; position: absolute; border-radius: 50%; box-shadow: 0 0 10px yellow; }
  </style>
</head>
<body>
  <div id="score">SCORE: 0</div>
  <div id="player"></div>
  <script>
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let score = 0;
    const player = document.getElementById('player');
    const scoreEl = document.getElementById('score');

    function spawnCoin() {
      const coin = document.createElement('div');
      coin.className = 'coin';
      coin.style.left = Math.random() * (window.innerWidth - 20) + 'px';
      coin.style.top = Math.random() * (window.innerHeight - 20) + 'px';
      document.body.appendChild(coin);
      return coin;
    }

    let coin = spawnCoin();

    window.addEventListener('keydown', (e) => {
      const step = 20;
      if (e.key === 'ArrowUp') y -= step;
      if (e.key === 'ArrowDown') y += step;
      if (e.key === 'ArrowLeft') x -= step;
      if (e.key === 'ArrowRight') x += step;
      
      player.style.left = x + 'px';
      player.style.top = y + 'px';

      const pr = player.getBoundingClientRect();
      const cr = coin.getBoundingClientRect();

      if (!(pr.right < cr.left || pr.left > cr.right || pr.bottom < cr.top || pr.top > cr.bottom)) {
        score++;
        scoreEl.innerText = 'SCORE: ' + score;
        coin.remove();
        coin = spawnCoin();
      }
    });
  </script>
</body>
</html>`;

let user3DCode = localStorage.getItem('user3DCode') || `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { width: 100%; height: 100%; display: block; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
<script>
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add Lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);

  // Create a Glowing Cube
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshPhongMaterial({ 
    color: 0x00ff00,
    shininess: 100,
    specular: 0x00ff00 
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Create a Starfield
  const starGeo = new THREE.SphereGeometry(100, 32, 32);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
  const stars = new THREE.Mesh(starGeo, starMat);
  scene.add(stars);

  camera.position.z = 5;

  function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
</script>
</body>
</html>`;
let isPlaying = false;
let currentTrackIndex = 0;
const audioPlayer = new Audio();
// Removed crossOrigin as it blocks many radio streams

let userSongs = [];
let audioStatus = 'idle'; // 'idle', 'connecting', 'playing', 'error'

// Music Persistence (IndexedDB)
const dbName = "ArcadeMusicDB";
const storeName = "songs";
let db;

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    request.onerror = (e) => reject(e);
  });
}

async function saveSong(name, file) {
  const transaction = db.transaction([storeName], "readwrite");
  const store = transaction.objectStore(storeName);
  await store.add({ name, file, sub: "My Library" });
}

async function loadSavedSongs() {
  const transaction = db.transaction([storeName], "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const songs = request.result.map(song => ({
        ...song,
        url: URL.createObjectURL(song.file),
        isLocal: true,
        desc: "Saved to your library."
      }));
      resolve(songs);
    };
  });
}

function toggleFavorite(gameId) {
  if (favoriteGameIds.includes(gameId)) {
    favoriteGameIds = favoriteGameIds.filter(id => id !== gameId);
  } else {
    favoriteGameIds.push(gameId);
  }
  localStorage.setItem('favoriteGames', JSON.stringify(favoriteGameIds));
  render();
}
const radioStations = [
  {
    name: "Code Radio",
    sub: "FreeCodeCamp",
    url: "https://coderadio-admin.freecodecamp.org/radio/8010/radio.mp3",
    desc: "24/7 lo-fi beats for coding. Highly reliable stream from freeCodeCamp."
  },
  {
    name: "Lofi Hip Hop",
    sub: "Focus Beats",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    desc: "Chill hip hop and lo-fi rhythms. Perfect for study and focus."
  },
  {
    name: "Nightride FM",
    sub: "Synthwave",
    url: "https://stream.nightride.fm/nightride.mp3",
    desc: "Retro-future rhythms for high-energy productivity and night drives."
  },
  {
    name: "Cyberpunk Tech",
    sub: "Data Transmit",
    url: "https://stream.zeno.fm/08mda3mzh8duv",
    desc: "Industrial techno and dark synth for high-intensity building."
  },
  {
    name: "Deep Space",
    sub: "Ambient",
    url: "https://ice6.somafm.com/deepspaceone-128-mp3",
    desc: "Deep ambient electronic space music. For the quiet moments."
  },
  {
    name: "Neurofunk",
    sub: "D&B",
    url: "https://stream.zeno.fm/3u0p79p7pwzuv",
    desc: "Fast-paced, intricate drum and bass for peak performance."
  },
  {
    name: "The Trip",
    sub: "Progressive",
    url: "https://ice6.somafm.com/thetrip-128-mp3",
    desc: "Progressive house and trance for a smooth cognitive flow."
  },
  {
    name: "Study Classical",
    sub: "Classical",
    url: "https://streaming.radio.co/s647d69744/listen",
    desc: "Traditional classical music for deep concentration."
  },
  {
    name: "MNM Lofi",
    sub: "Alternative",
    url: "https://icecast.vrtcdn.be/mnm_lofi.mp3",
    desc: "Smooth lofi selection from Belgium's MNM radio."
  },
  {
    name: "Chill Out",
    sub: "Downtempo",
    url: "https://ice6.somafm.com/chill-128-mp3",
    desc: "Ambient, downtempo, and chill-out grooves."
  },
  {
    name: "Haze FM",
    sub: "Liquid D&B",
    url: "http://hazefm.com:8000/live",
    desc: "Deep and soulful liquid drum and bass."
  },
  {
    name: "Eurobeat",
    sub: "Gaming Energy",
    url: "https://stream.eurobeat.moe/stream",
    desc: "High-octane rhythms for fast-paced gaming sessions."
  },
  {
    name: "Smooth Jazz",
    sub: "Deep Focus",
    url: "https://jazz.stream.publicradio.org/jazz.mp3",
    desc: "Sophisticated jazz for calm and quiet concentration."
  },
  {
    name: "Tokyo Chill",
    sub: "Lofi/City Pop",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    desc: "Anime-inspired beats and aesthetic city vibes."
  },
  {
    name: "Groove Salad",
    sub: "Ambient/Chill",
    url: "https://ice1.somafm.com/groovesalad-128-mp3",
    desc: "A nicely chilled plate of ambient electronic beats."
  },
  {
    name: "Drone Zone",
    sub: "Atmospheric",
    url: "https://ice1.somafm.com/dronezone-128-mp3",
    desc: "Atmospheric textures with minimal beats."
  },
  {
    name: "Lush",
    sub: "Downtempo",
    url: "https://ice1.somafm.com/lush-128-mp3",
    desc: "Sensuous and mellow vocals, downtempo and chill."
  },
  {
    name: "Defcon Radio",
    sub: "Electronic",
    url: "https://ice1.somafm.com/defcon-128-mp3",
    desc: "Music for Hacking. The official stream of DEF CON."
  },
  {
    name: "Secret Agent",
    sub: "Lounge",
    url: "https://ice1.somafm.com/secretagent-128-mp3",
    desc: "The soundtrack for your stylish, mysterious life."
  },
  {
    name: "Indie Pop",
    sub: "Alternative",
    url: "https://ice1.somafm.com/indiepop-128-mp3",
    desc: "New and classic indie pop sounds."
  },
  {
    name: "Suburbs of Goa",
    sub: "World/Fusion",
    url: "https://ice1.somafm.com/suburbsofgoa-128-mp3",
    desc: "Desi-influenced Asian world beats and ambient."
  },
  {
    name: "The Trip",
    sub: "Psychedelic",
    url: "https://ice1.somafm.com/thetrip-128-mp3",
    desc: "Progressive house / trance for the long haul."
  },
  {
    name: "Vocal Lofi",
    sub: "Soft Beats",
    url: "https://stream.zeno.fm/f9u7p1p66v8uv",
    desc: "Soft lo-fi beats accompanied by gentle vocals."
  }
];

function togglePlay() {
  if (isPlaying) {
    audioPlayer.pause();
    audioStatus = 'idle';
    isPlaying = false;
    render();
  } else {
    audioStatus = 'connecting';
    render();
    
    const currentUrl = window.currentTrackInfo ? audioPlayer.src : radioStations[currentTrackIndex].url;
    
    if (!audioPlayer.src || audioPlayer.src !== currentUrl) {
      audioPlayer.src = currentUrl;
      audioPlayer.load();
    }
    
    audioPlayer.play().then(() => {
      audioStatus = 'playing';
      isPlaying = true;
      render();
    }).catch(e => {
      console.error("Audio play blocked/failed:", e);
      audioStatus = 'error';
      isPlaying = false;
      render();
    });
  }
}

function nextTrack() {
  window.currentTrackInfo = null; // Clear local track info
  currentTrackIndex = (currentTrackIndex + 1) % radioStations.length;
  audioPlayer.src = radioStations[currentTrackIndex].url;
  if (isPlaying) audioPlayer.play();
  render();
}

function setTrack(index) {
  window.currentTrackInfo = null; // Clear local track info
  currentTrackIndex = index;
  audioPlayer.src = radioStations[currentTrackIndex].url;
  audioStatus = 'connecting';
  render();
  audioPlayer.play().then(() => {
    audioStatus = 'playing';
    isPlaying = true;
    render();
  }).catch(() => {
    audioStatus = 'error';
    render();
  });
}

audioPlayer.onplay = () => { isPlaying = true; render(); };
audioPlayer.onpause = () => { isPlaying = false; render(); };
audioPlayer.onerror = (e) => { 
  console.error("Audio Error:", e); 
  isPlaying = false; 
  render(); 
};

function setVolume(val) {
  audioPlayer.volume = val / 100;
  render();
}

function toggleAutoSave() {
  autoSaveActive = !autoSaveActive;
  localStorage.setItem('autoSaveEnabled', autoSaveActive);
  render();
  showToast(autoSaveActive ? 'Auto-Save Enabled' : 'Auto-Save Disabled');
}

// Auto-save interval (every 30 seconds)
setInterval(() => {
  if (autoSaveActive && currentTab === 'create' && currentProjectId) {
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
      project.objects = sceneObjects;
      project.lastModified = Date.now();
      saveProjects();
      
      const indicator = document.getElementById('save-indicator');
      if (indicator) {
        indicator.innerText = 'Sync: Saved';
        indicator.classList.remove('text-white/20');
        indicator.classList.add('text-emerald-400');
        setTimeout(() => {
          indicator.innerText = 'Sync: Ready';
          indicator.classList.remove('text-emerald-400');
          indicator.classList.add('text-white/20');
        }, 2000);
      }
      console.log('Project auto-saved');
    }
  }
}, 30000);

function addCustomGame(title, url, category, thumb) {
  const newGame = {
    id: 'user-' + Date.now(),
    title,
    iframeUrl: url,
    category: category || 'Uncategorized',
    thumbnail: thumb || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250',
    description: 'User-added custom game'
  };
  userGames.push(newGame);
  localStorage.setItem('user_games', JSON.stringify(userGames));
  init(); // Re-initialize to update categories and game list
  showToast('Game Added Successfully');
}

function removeCustomGame(id) {
  userGames = userGames.filter(g => g.id !== id);
  localStorage.setItem('user_games', JSON.stringify(userGames));
  init();
  showToast('Game Removed');
}

async function handleFileUpload(e) {
  const files = Array.from(e.target.files);
  for (const file of files) {
    if (file.type.startsWith('audio/')) {
      const name = file.name.replace(/\.[^/.]+$/, "");
      await saveSong(name, file);
    }
  }
  userSongs = await loadSavedSongs();
  render();
}

function playTrack(url, name, sub) {
  audioPlayer.src = url;
  audioStatus = 'connecting';
  render();
  
  audioPlayer.play().then(() => {
    audioStatus = 'playing';
    isPlaying = true;
    // We'll update the display info by finding matching track or just storing current info
    window.currentTrackInfo = { name, sub };
    render();
  }).catch(e => {
    console.error("Play failed:", e);
    audioStatus = 'error';
    render();
  });
}

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  // Debug Console Shortcut: Ctrl + Shift + L
  if (e.ctrlKey && e.shiftKey && e.key === 'L') {
    e.preventDefault();
    window.toggleDebugPanel();
  }

  // Focus Search Shortcut: Ctrl + F
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    if (currentTab === 'games') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    redo();
  }
});

async function init() {
  initStudioState();
  render();
  try {
    await initDB();
    userSongs = await loadSavedSongs();
    
    const response = await fetch('./src/games.json');
    const defaultGames = await response.json();
    games = [...defaultGames, ...userGames];
    
    // Extract unique categories
    const uniqueCategories = [...new Set(games.map(game => game.category).filter(Boolean))];
    categories = ['All', ...uniqueCategories.sort()];
    
    filteredGames = [...games];
    isLoading = false;
    render();
  } catch (error) {
    console.error('Failed to load games:', error);
    document.getElementById('app').innerHTML = `
      <div class="flex items-center justify-center h-screen">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-red-500 mb-2">Error Loading Games</h1>
          <p class="text-gray-400">Please check if src/games.json exists and is accessible.</p>
        </div>
      </div>
    `;
  }
}

function handleSearch(e) {
  searchQuery = e.target.value.toLowerCase();
  applyFilters();
}

function setCategory(category) {
  selectedCategory = category;
  applyFilters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyFilters() {
  filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery) || 
                          game.description.toLowerCase().includes(searchQuery);
    
    let matchesCategory = false;
    if (selectedCategory === 'All') {
      matchesCategory = true;
    } else if (selectedCategory === 'Favorites') {
      matchesCategory = favoriteGameIds.includes(game.id);
    } else if (selectedCategory === 'Newest') {
      // Define Newest as the last 10 games in the original list
      const newestIds = games.slice(-10).map(g => g.id);
      matchesCategory = newestIds.includes(game.id);
    } else {
      matchesCategory = game.category === selectedCategory;
    }
    
    return matchesSearch && matchesCategory;
  });
  renderGrid();
  renderCategoryBar();
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function recordPlaytime() {
  if (sessionStartTime && currentSessionGameId) {
    const elapsed = (Date.now() - sessionStartTime) / 1000;
    playTimes[currentSessionGameId] = (playTimes[currentSessionGameId] || 0) + elapsed;
    localStorage.setItem('studio_playtimes', JSON.stringify(playTimes));
    sessionStartTime = null;
    currentSessionGameId = null;
  }
}

function openGame(gameId) {
  recordPlaytime(); // Stop any existing session
  selectedGame = games.find(g => g.id === gameId);
  
  if (!selectedGame) {
    // Try to find in custom projects
    const proj = projects.find(p => p.id === gameId);
    if (proj) {
      selectedGame = {
        id: proj.id,
        title: proj.name,
        type: 'project',
        objects: proj.objects,
        isCustom: true
      };
    }
  }

  if (selectedGame) {
    sessionStartTime = Date.now();
    currentSessionGameId = gameId;
    // Update recently played
    recentlyPlayedIds = recentlyPlayedIds.filter(id => id !== gameId);
    recentlyPlayedIds.unshift(gameId);
    recentlyPlayedIds = recentlyPlayedIds.slice(0, 5);
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayedIds));
    window.recentlyPlayedIds = recentlyPlayedIds;
  }
  render(); // render calls renderModal internally now
}

function wipeData() {
  if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
    localStorage.clear();
    window.location.reload();
  }
}

function downloadData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qt-labs-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new window.FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm('Importing data will overwrite your current settings. Continue?')) {
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        window.location.reload();
      }
    } catch (err) {
      window.alert('Invalid data file format.');
      console.error('Import failed:', err);
    }
  };
  reader.readAsText(file);
}

function clearHistory() {
  recentlyPlayedIds = [];
  window.recentlyPlayedIds = [];
  localStorage.removeItem('recentlyPlayed');
  render();
}

function closeGame() {
  console.log('Closing game modal...');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.warn('Fullscreen exit failed:', err));
  }
  recordPlaytime();
  selectedGame = null;
  isFullScreen = false;
  render();
}

function toggleFullScreen() {
  const container = document.getElementById('modal-container');
  if (!container) return;
  
  const doc = document;
  const fsElement = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
  const requestFS = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen || container.msRequestFullscreen;
  const exitFS = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;

  if (!fsElement) {
    if (requestFS) {
      requestFS.call(container).catch(err => {
        console.warn('Fullscreen request failed:', err);
        isFullScreen = !isFullScreen;
        render();
      });
    } else {
      // Fallback for browsers that don't support native FS (like iOS Safari on iPhone)
      isFullScreen = !isFullScreen;
      render();
    }
  } else {
    if (exitFS) {
      exitFS.call(doc).catch(err => console.warn('Exit fullscreen failed:', err));
    } else {
      isFullScreen = false;
      render();
    }
  }
}

// Sync state with native fullscreen
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
  document.addEventListener(event, () => {
    isFullScreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    render();
  });
});

function setTab(tab) {
  if (currentTab === 'games' && selectedGame) {
    recordPlaytime();
    selectedGame = null;
  }
  currentTab = tab;
  render();
  if (tab === 'create' && createMode === '3d') {
    initThreeJS();
  }
}

function setCreateMode(mode) {
  createMode = mode;
  render();
  if (mode === '3d') {
    initThreeJS();
  }
}

function updateCode(val) {
  if (createMode === 'code') {
    userCode = val;
    localStorage.setItem('userCode', val);
  } else {
    user3DCode = val;
    localStorage.setItem('user3DCode', val);
  }
}

// 3D Studio Actions
function addObject(type, presetName = null) {
  pushToHistory();
  const id = `${type}-${Date.now()}`;
  const newObj = {
    id,
    type,
    name: presetName || (type.charAt(0).toUpperCase() + type.slice(1)),
    position: { x: (Math.random() - 0.5) * 5, y: 0.5, z: (Math.random() - 0.5) * 5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
  };

  if (presetName === 'SpawnLocation') {
    newObj.scale = { x: 4, y: 0.2, z: 4 };
    newObj.color = '#ffffff';
    newObj.position.y = 0.1;
  } else if (presetName === 'Building') {
    newObj.scale = { x: 4, y: 10, z: 4 };
    newObj.color = '#333333';
    newObj.position.y = 5;
  }
  
  sceneObjects.push(newObj);
  selectedObjectId = id;
  saveScene();
  render();
  updateThreeScene();
}

function deleteObject(id) {
  pushToHistory();
  sceneObjects = sceneObjects.filter(obj => obj.id !== id);
  if (selectedObjectId === id) selectedObjectId = null;
  saveScene();
  render();
  updateThreeScene();
}

function updateObjectProperty(id, prop, axis, value) {
  const obj = sceneObjects.find(o => o.id === id);
  if (!obj) return;
  if (axis) {
    obj[prop][axis] = parseFloat(value);
  } else {
    obj[prop] = value;
  }
  saveScene();
  updateThreeScene();
}

function saveScene() {
  localStorage.setItem('sceneObjects', JSON.stringify(sceneObjects));
}

function selectObject(id) {
  selectedObjectId = id;
  render();
}

function setStudioTool(tool) {
  studioTool = tool;
  render();
}

function setRibbonTab(tab) {
  activeRibbonTab = tab;
  render();
}

async function askAIToBuild() {
  const prompt = window.prompt("What should the AI build in the 3D scene?", "a simple house");
  if (!prompt) return;
  
  const currentSceneJSON = JSON.stringify(sceneObjects);
  const aiPrompt = `Current 3D Scene: ${currentSceneJSON}\nTask: ${prompt}\nYou are a 3D construction agent. Respond ONLY with a JSON array of commands to modify the scene. 
  Commands: [{"type": "add", "objectType": "cube", "name": "Wall", "pos": {"x":0,"y":0,"z":0}, "rot": {"x":0,"y":0,"z":0}, "scale": {"x":1,"y":1,"z":1}, "color": "#ffffff"}].
  Only add/modify objects. Be creative. Make sure positions are realistic. Respond ONLY with the JSON array.`;

  render();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: aiPrompt }] }]
    });
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const commands = JSON.parse(cleanJson);
    
    commands.forEach(cmd => {
      if (cmd.type === 'add') {
        const id = `${cmd.objectType}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        sceneObjects.push({
          id,
          type: cmd.objectType,
          name: cmd.name || cmd.objectType,
          position: cmd.pos || { x: 0, y: 0.5, z: 0 },
          rotation: cmd.rot || { x: 0, y: 0, z: 0 },
          scale: cmd.scale || { x: 1, y: 1, z: 1 },
          color: cmd.color || '#ffffff'
        });
      }
    });
    
    saveScene();
    render();
    updateThreeScene();
  } catch (e) {
    console.error("AI Build failed:", e);
  }
}

async function processAICommand(prompt) {
  // Keeping this for manual overrides/global commands if needed, but primarily using autonomous agents now.
  if (!prompt.trim() || isGeneratingAI) return;
  // ... rest of the existing processAICommand logic if you want to keep manual control
}

let threeScene, threeCamera, threeRenderer, threeControls, threeMeshes = {};
let isThreeLoading = false;

function initThreeJS() {
  const container = document.getElementById(selectedGame?.type === 'project' ? 'three-modal-viewport' : 'three-viewport');
  if (!container) return;
  
  if (currentTab === 'create' && createMode !== '3d' && !selectedGame) return;
  if (isThreeLoading) return;

  // Re-use existing renderer if available
  if (threeRenderer) {
    if (threeRenderer.domElement.parentElement !== container) {
      container.appendChild(threeRenderer.domElement);
    }
    
    // Update camera for current mode
    threeCamera.position.set(10, 10, 10);
    threeCamera.lookAt(0, 0, 0);
    if (threeControls) threeControls.enabled = true;

    // Force resize to container
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    threeCamera.aspect = w / h;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w, h);
    
    updateThreeScene();
    if (threeRenderer) threeRenderer.setAnimationLoop(animate);
    return;
  }

  const oldCanvas = container.querySelector('canvas');
  if (oldCanvas) {
    oldCanvas.remove();
  }

  if (typeof THREE === 'undefined') {
    isThreeLoading = true;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      const controlsScript = document.createElement('script');
      controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      controlsScript.onload = () => {
        isThreeLoading = false;
        initThreeJS();
      };
      controlsScript.onerror = () => { isThreeLoading = false; };
      document.head.appendChild(controlsScript);
    };
    script.onerror = () => { isThreeLoading = false; };
    document.head.appendChild(script);
    return;
  }

  // Ensure container has size
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0x0c0c0c);
  
  threeCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  threeCamera.position.set(10, 10, 10);
  threeCamera.lookAt(0, 0, 0);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  threeRenderer.setSize(width, height);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  threeRenderer.shadowMap.enabled = true;
  threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(threeRenderer.domElement);

  if (THREE.OrbitControls) {
    threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
    threeControls.enableDamping = true;
    threeControls.dampingFactor = 0.05;
    threeControls.screenSpacePanning = true;
  }

  // Use a ResizeObserver for more robust resizing
  const resizeObserver = new ResizeObserver(() => {
    if (container && threeRenderer && threeCamera) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      threeCamera.aspect = w / h;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(w, h);
    }
  });
  resizeObserver.observe(container);

  // Environment
  threeScene.background = new THREE.Color(0x1a1a1a);
  threeScene.fog = new THREE.Fog(0x1a1a1a, 20, 100);

  // Grid
  const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x2a2a2a);
  threeScene.add(gridHelper);

  // Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  threeScene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(10, 20, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  threeScene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-10, 5, -10);
  threeScene.add(fillLight);

  threeCamera.position.set(10, 10, 10);
  threeCamera.lookAt(0, 0, 0);
  if (threeControls) threeControls.enabled = true;

  updateThreeScene();

  threeRenderer.setAnimationLoop(animate);
}

function animate() {
  if (currentTab !== 'create') {
    if (threeRenderer) {
      threeRenderer.setAnimationLoop(null);
    }
    return;
  }
  
  if (createMode !== '3d') {
    return;
  }

  if (threeControls) threeControls.update();
  
  if (threeRenderer && threeScene && threeCamera) {
    threeRenderer.render(threeScene, threeCamera);
  }
}

function updateThreeScene() {
  if (!threeScene) return;

  // Clear existing meshes
  Object.values(threeMeshes).forEach(mesh => threeScene.remove(mesh));
  threeMeshes = {};

  const objectsToRender = (selectedGame && selectedGame.type === 'project') ? selectedGame.objects : sceneObjects;

  objectsToRender.forEach(obj => {
    let geometry;
    if (obj.type === 'cube') geometry = new THREE.BoxGeometry(1, 1, 1);
    else if (obj.type === 'sphere') geometry = new THREE.SphereGeometry(0.5, 32, 32);
    else if (obj.type === 'cylinder') geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);

    const material = new THREE.MeshPhongMaterial({ 
      color: obj.color,
      shininess: 30,
      specular: 0x111111,
      emissive: selectedObjectId === obj.id ? 0x222222 : 0x000000
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (selectedObjectId === obj.id) {
       // Add a wireframe helper for selection
       const wireframe = new THREE.WireframeGeometry(geometry);
       const line = new THREE.LineSegments(wireframe);
       line.material.color.set(0x00ff00);
       line.material.transparent = true;
       line.material.opacity = 0.5;
       mesh.add(line);
    }
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(obj.rotation.x),
      THREE.MathUtils.degToRad(obj.rotation.y),
      THREE.MathUtils.degToRad(obj.rotation.z)
    );
    mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
    
    threeScene.add(mesh);
    threeMeshes[obj.id] = mesh;
  });
}

function runCode() {
  const preview = document.getElementById('code-preview');
  if (preview) {
    preview.srcdoc = createMode === 'code' ? userCode : generateSceneCode();
  }
}

function generateSceneCode() {
  const objectsCode = sceneObjects.map(obj => {
    let geomCode = '';
    if (obj.type === 'cube') geomCode = 'new THREE.BoxGeometry(1, 1, 1)';
    else if (obj.type === 'sphere') geomCode = 'new THREE.SphereGeometry(0.5, 32, 32)';
    else if (obj.type === 'cylinder') geomCode = 'new THREE.CylinderGeometry(0.5, 0.5, 1, 32)';

    return `
      {
        const geometry = ${geomCode};
        const material = new THREE.MeshPhongMaterial({ color: '${obj.color}', shininess: 30 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(${obj.position.x}, ${obj.position.y}, ${obj.position.z});
        mesh.rotation.set(${obj.rotation.x * Math.PI / 180}, ${obj.rotation.y * Math.PI / 180}, ${obj.rotation.z * Math.PI / 180});
        mesh.scale.set(${obj.scale.x}, ${obj.scale.y}, ${obj.scale.z});
        scene.add(mesh);
      }
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #0c0c0c; overflow: hidden; font-family: monospace; }
    canvas { width: 100%; height: 100%; display: block; }
    #stats { position: absolute; top: 10px; left: 10px; color: #00ff00; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px; font-size: 10px; pointer-events: none; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
<div id="stats">PLAY MODE: SIMULATING...</div>
<script>
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0c);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // Scene Objects
  ${objectsCode}

  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
</script>
</body>
</html>`;
}

function downloadCode() {
  const code = createMode === 'code' ? userCode : user3DCode;
  const blob = new Blob([code], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = createMode === 'code' ? 'my-game.html' : 'my-scene.html';
  a.click();
  URL.revokeObjectURL(url);
}

function scaleObject(id, factor) {
  const obj = sceneObjects.find(o => o.id === id);
  if (obj) {
    obj.scale.x *= factor;
    obj.scale.y *= factor;
    obj.scale.z *= factor;
    saveScene();
    updateThreeScene();
  }
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-dvh bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-[#00ff00] selection:text-black">
      <!-- Header -->
      <header class="border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40 px-2 sm:px-0">
        <div class="max-w-7xl mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div class="flex items-center gap-1.5 sm:gap-2 cursor-pointer" onclick="window.location.reload()">
            <div class="w-7 h-7 sm:w-8 sm:h-8 bg-[#00ff00] rounded flex items-center justify-center text-black">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
            </div>
            <h1 class="text-lg sm:text-xl font-bold tracking-tighter uppercase italic">QTX</h1>
          </div>

          <!-- Nav Tabs -->
          <nav class="flex items-center">
             <button onclick="window.setTab('games')" class="px-2 sm:px-4 py-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-colors ${currentTab === 'games' ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-[#666] hover:text-white'}">Games</button>
             <button onclick="window.setTab('music')" class="px-2 sm:px-4 py-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-colors ${currentTab === 'music' ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-[#666] hover:text-white'}">Music</button>
             <button onclick="window.setTab('projects_hub')" class="px-2 sm:px-4 py-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-colors ${(currentTab === 'projects_hub' || currentTab === 'create') ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-[#666] hover:text-white'}">Build</button>
          </nav>

          <!-- Lab Identity Badge (Hidden on mobile) -->
          <div class="hidden xl:flex items-center gap-3 pl-4 border-l border-[#222] cursor-pointer hover:bg-white/5 p-1 rounded-xl transition-all" onclick="window.setTab('settings')">
             <div class="text-right">
                <div class="text-[10px] font-black uppercase text-white tracking-tight leading-none">${labIdentity.name}</div>
                <div class="text-[8px] font-mono uppercase text-[#444] tracking-widest">${labIdentity.title}</div>
             </div>
             <div class="w-8 h-8 rounded-lg overflow-hidden border border-[#333]">
                <img src="${labIdentity.icon}" class="w-full h-full object-cover">
             </div>
          </div>

          ${currentTab === 'music' ? `
            <label class="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#1a1a1a] border border-[#333] hover:border-[#00ff00]/50 rounded-full cursor-pointer transition-all text-[9px] sm:text-xs font-bold uppercase tracking-widest text-[#888] hover:text-[#00ff00]">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span class="hidden sm:inline">Add Song</span>
              <input type="file" multiple accept="audio/*" class="hidden" onchange="window.handleFileUpload(event)" />
            </label>
          ` : ''}

          <div class="flex-1 max-w-[120px] sm:max-w-md relative ${currentTab === 'games' ? '' : 'invisible pointer-events-none'}">
            <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <svg class="h-3 w-3 sm:h-4 sm:w-4 text-[#00ff00] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              id="search-input"
              type="text"
              placeholder="Search..."
              class="w-full bg-[#111] border border-[#222] focus:border-[#00ff00]/50 rounded-lg sm:rounded-xl py-1.5 sm:py-2.5 pl-8 sm:pl-10 pr-2 sm:pr-4 focus:outline-none transition-all text-[10px] sm:text-sm font-mono text-white placeholder-[#333]"
              value="${searchQuery}"
              oninput="window.handleSearch(event)"
            />
          </div>

          <div class="hidden sm:flex items-center gap-4 text-xs font-mono uppercase text-[#666]">
            <span id="game-count">${currentTab === 'games' ? (isLoading ? 'Analyzing Directory...' : filteredGames.length + ' Games') : ''}</span>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-8">
         ${currentTab === 'games' ? `
          <!-- Category Selection -->
          <div class="mb-10 sticky top-14 sm:top-16 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 bg-[#0a0a0a]/80 backdrop-blur-xl py-4 border-b border-white/5">
            <div id="category-bar" class="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              <!-- Categories will be rendered here -->
            </div>
          </div>

          <!-- Favorites Section -->
          ${favoriteGameIds.length > 0 && searchQuery === '' && selectedCategory === 'All' ? `
            <section id="favorites-section" class="mb-12">
              <div class="flex items-center gap-2 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#00ff00" stroke="#00ff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                <h2 class="text-xl font-black uppercase italic tracking-tight">Your Favorites</h2>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                ${favoriteGameIds.map(id => {
                  const game = games.find(g => g.id === id);
                  if (!game) return '';
                  return createGameCard(game, 'small');
                }).join('')}
              </div>
            </section>
          ` : ''}

          <!-- Recently Played -->
          ${recentlyPlayedIds.length > 0 && searchQuery === '' ? `
            <section id="recent-section" class="mb-12">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                  <span class="w-2 h-2 bg-[#00ff00] rounded-full animate-pulse"></span>
                  Recently Played
                </h2>
                <button 
                   onclick="window.clearHistory()"
                   class="text-xs font-mono uppercase text-[#444] hover:text-[#00ff00] transition-colors"
                >
                  Clear History
                </button>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                ${recentlyPlayedIds.map(id => {
                  const game = games.find(g => g.id === id);
                  if (!game) return '';
                  return createGameCard(game, 'small');
                }).join('')}
              </div>
            </section>
          ` : ''}

          <!-- Hero Section -->
          <section id="hero-section" class="mb-12">
            <div class="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#222] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
              <div class="relative z-10 max-w-2xl">
                <h2 class="text-4xl sm:text-6xl font-black uppercase italic leading-none mb-4">
                  Play Anywhere. <br />
                  <span class="text-[#00ff00]">No Limits.</span>
                </h2>
                <p class="text-[#888] text-lg mb-8">
                  The ultimate collection of unblocked web games by QTX Labs. Fast, free, and always accessible.
                </p>
                <div class="flex flex-wrap gap-4">
                  <button 
                    onclick="window.playRandom()"
                    class="bg-[#00ff00] text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(0,255,0,0.2)]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
                    Random Game
                  </button>
                  <button 
                    onclick="window.toggleImportModal(true)"
                    class="bg-white/5 border border-white/10 hover:border-[#00ff00]/50 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 hover:bg-[#00ff00]/5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Import Custom Game
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- Game Grid -->
          <div id="game-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <!-- Games will be rendered here -->
          </div>

          <div id="empty-state" class="hidden text-center py-20">
            <div class="text-[#333] mb-4 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">No games found</h3>
            <p class="text-[#666]">Try searching for something else.</p>
          </div>
        ` : currentTab === 'music' ? `
          <!-- Music Tab Content (Lab Audio System) -->
          <div id="music-container" class="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header class="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#0c0c0c] p-8 rounded-[2rem] border border-[#222]">
               <div class="space-y-1">
                 <h2 class="text-4xl font-black uppercase italic tracking-tighter leading-none">Audio <span class="text-[#00ff00] drop-shadow-[0_0_10px_rgba(0,255,0,0.3)]">Labs</span></h2>
                 <p class="text-[#555] font-mono text-[10px] uppercase tracking-[0.3em]">Neural Interface // Stream Hub v2.1</p>
               </div>
               <div class="flex items-center gap-4">
                  <div class="px-4 py-2 bg-black border border-[#222] rounded-xl flex items-center gap-3">
                     <div class="flex gap-1">
                        ${Array(12).fill(0).map((_, i) => `<div class="w-0.5 bg-[#00ff00] ${isPlaying ? 'animate-bounce' : 'h-1'}" style="height: ${isPlaying ? Math.random() * 12 + 4 : 4}px; animation-delay: ${i * 0.05}s"></div>`).join('')}
                     </div>
                     <span class="text-[9px] font-mono text-[#00ff00] uppercase tracking-widest">${audioStatus}</span>
                  </div>
               </div>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Player Console -->
              <div class="lg:col-span-2 space-y-8">
                <div class="bg-[#111] border border-[#222] rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
                  <!-- Animated Mesh Background -->
                  <div class="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                  <div class="absolute -top-24 -right-24 w-64 h-64 bg-[#00ff00]/5 rounded-full blur-[100px]"></div>

                  <div class="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <!-- Current Station Pulse -->
                    <div class="relative group">
                       <div class="absolute inset-0 bg-[#00ff00] rounded-3xl blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
                       <div class="w-56 h-56 bg-black rounded-[2rem] border-2 border-[#222] group-hover:border-[#00ff00]/30 transition-all duration-700 flex items-center justify-center relative overflow-hidden">
                          <svg class="w-24 h-24 text-[#222] group-hover:text-[#00ff00]/20 transition-all duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5"><path d="M12 2v20m0-20l-4 4m4-4l4 4M12 22l-4-4m4 4l4-4M2 12h20M2 12l4-4m-4 4l4 4m16-8l4 4m-4-4l-4 4"></path></svg>
                          <div class="absolute inset-0 flex flex-col items-center justify-center">
                             <div class="w-16 h-16 rounded-full border border-[#00ff00]/10 flex items-center justify-center">
                                <div class="w-10 h-10 bg-[#00ff00] rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(0,255,0,0.4)]">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div class="flex-1 text-center md:text-left space-y-6">
                      <div>
                        <div class="flex items-center justify-center md:justify-start gap-3 mb-3">
                           <span class="px-2 py-0.5 bg-[#00ff00]/10 text-[#00ff00] text-[9px] font-black uppercase tracking-widest rounded border border-[#00ff00]/20 italic">Active Stream</span>
                           <span class="text-[9px] font-mono text-[#444] uppercase tracking-widest">ID: ${radioStations[currentTrackIndex].url.slice(-8)}</span>
                        </div>
                        <h3 class="text-5xl font-black uppercase italic tracking-tighter leading-none mb-4 group-hover:text-white transition-colors">
                          ${window.currentTrackInfo ? window.currentTrackInfo.name : radioStations[currentTrackIndex].name}
                        </h3>
                        <p class="text-[#00ff00] font-mono text-sm uppercase tracking-[0.2em] mb-4 drop-shadow-[0_0_8px_rgba(0,255,0,0.2)]">
                           ${window.currentTrackInfo ? window.currentTrackInfo.sub : radioStations[currentTrackIndex].sub}
                        </p>
                        <p class="text-[#666] text-xs leading-relaxed max-w-sm uppercase font-bold italic tracking-wider">
                           ${window.currentTrackInfo ? 'Uploaded frequency construct detected.' : radioStations[currentTrackIndex].desc}
                        </p>
                      </div>

                      <div class="flex items-center justify-center md:justify-start gap-6 pt-4">
                        <button 
                          onclick="window.togglePlay()"
                          class="w-20 h-20 bg-white hover:bg-[#00ff00] text-black rounded-[1.5rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl"
                        >
                          ${isPlaying ? 
                            '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' : 
                            '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" class="ml-1"><path d="M8 5v14l11-7z"/></svg>'
                          }
                        </button>
                        <div class="space-y-4 flex-1 max-w-[140px]">
                           <div class="flex items-center justify-between text-[8px] font-mono text-[#444] uppercase tracking-widest">
                              <span>Output Gain</span>
                              <span>${Math.round(audioPlayer.volume * 100)}%</span>
                           </div>
                           <input 
                              type="range" 
                              min="0" max="100" 
                              value="${Math.round(audioPlayer.volume * 100)}" 
                              oninput="window.setVolume(this.value)"
                              class="w-full accent-[#00ff00] h-1 bg-[#222] rounded-full appearance-none cursor-pointer"
                           />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Local Registry -->
                ${userSongs.length > 0 ? `
                  <section class="space-y-6">
                    <div class="flex items-center justify-between px-2">
                       <h3 class="font-black uppercase tracking-tighter text-xl italic text-white/40">Local <span class="text-white">Registry</span></h3>
                       <span class="text-[9px] font-mono text-[#333] uppercase">${userSongs.length} OBJECTS</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      ${userSongs.map(song => `
                        <div class="bg-[#0c0c0c] border border-[#1a1a1a] p-5 rounded-2xl flex items-center justify-between group hover:border-[#00ff00]/20 transition-all">
                          <div class="flex items-center gap-4 overflow-hidden">
                            <div class="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-[#222] group-hover:text-[#00ff00] transition-all border border-[#1a1a1a]">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                            </div>
                            <div class="overflow-hidden space-y-1">
                              <h4 class="font-bold text-sm truncate group-hover:text-white transition-colors tracking-tight">${song.name}</h4>
                              <p class="text-[9px] text-[#444] font-mono uppercase tracking-widest">Construct_Local</p>
                            </div>
                          </div>
                          <button 
                            onclick="window.playTrack('${song.url}', '${song.name}', 'Local File')"
                            class="w-10 h-10 rounded-xl bg-[#111] flex items-center justify-center text-[#333] hover:text-[#00ff00] hover:bg-[#00ff00]/5 transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="ml-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </button>
                        </div>
                      `).join('')}
                    </div>
                  </section>
                ` : ''}
              </div>

              <!-- Station Index -->
              <div class="space-y-6">
                <div class="flex items-center justify-between px-2">
                   <h3 class="font-black uppercase tracking-tighter text-xl italic text-white/40">Global <span class="text-white">Frequencies</span></h3>
                   <div class="w-1.5 h-1.5 bg-[#00ff00] rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
                </div>
                
                <div class="space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
                  ${radioStations.map((station, i) => `
                    <button 
                      onclick="window.setTrack(${i})"
                      class="w-full p-5 bg-[#0c0c0c] border ${currentTrackIndex === i && !window.currentTrackInfo ? 'border-[#00ff00]/30 bg-[#00ff00]/5 shadow-[0_0_20px_rgba(0,255,0,0.05)]' : 'border-[#1a1a1a]'} rounded-2xl text-left hover:border-[#00ff00]/20 transition-all group relative overflow-hidden"
                    >
                      <div class="flex items-center gap-5 relative z-10">
                        <div class="w-8 h-8 rounded-lg bg-black/50 border border-[#222] flex items-center justify-center text-[10px] font-mono text-[#333] group-hover:text-[#00ff00] group-hover:border-[#00ff00]/20 transition-all">
                           ${String(i + 1).padStart(2, '0')}
                        </div>
                        <div class="flex-1 overflow-hidden">
                          <h4 class="font-black uppercase italic text-xs truncate ${currentTrackIndex === i && !window.currentTrackInfo ? 'text-[#00ff00]' : 'text-white/60'} group-hover:text-white transition-colors">${station.name}</h4>
                          <p class="text-[9px] text-[#444] font-mono uppercase tracking-widest mt-0.5 group-hover:text-[#666] transition-colors">${station.sub}</p>
                        </div>
                        ${currentTrackIndex === i && isPlaying && !window.currentTrackInfo ? `
                          <div class="flex gap-0.5">
                             <div class="w-0.5 h-3 bg-[#00ff00] animate-bounce-steady"></div>
                             <div class="w-0.5 h-2 bg-[#00ff00] animate-bounce-steady" style="animation-delay: 0.1s"></div>
                             <div class="w-0.5 h-4 bg-[#00ff00] animate-bounce-steady" style="animation-delay: 0.2s"></div>
                          </div>
                        ` : ''}
                      </div>
                    </button>
                  `).join('')}
                </div>

                <div class="p-6 bg-[#0c0c0c] border border-[#222] rounded-[1.5rem] mt-4">
                   <div class="flex items-center gap-2 mb-3">
                      <div class="w-1 h-1 bg-[#444] rounded-full"></div>
                      <h4 class="text-[9px] font-mono text-[#444] uppercase tracking-widest">Protocol Notice</h4>
                   </div>
                   <p class="text-[10px] text-[#333] leading-relaxed uppercase font-bold italic">
                      Experimental streams provided by third-party nodes. If signal degradation occurs, re-initialize or select alternate frequency.
                   </p>
                </div>
              </div>
            </div>
          </div>
        ` : currentTab === 'settings' ? `
          <div class="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header class="text-center">
              <h2 class="text-4xl font-black uppercase italic mb-4">Command <span class="text-[#00ff00]">Center</span></h2>
              <p class="text-[#888] text-lg font-mono tracking-widest uppercase text-xs">Manage your profile and track play sessions</p>
            </header>

            <!-- Lab Identity Section -->
            <section class="bg-[#111] border border-[#222] rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-2xl">
               <div class="absolute -top-24 -left-24 w-64 h-64 bg-[#00ff00]/5 rounded-full blur-[100px]"></div>
               
               <div class="relative z-10 flex flex-col md:flex-row items-center gap-10">
                  <div class="relative group">
                     <div class="absolute inset-0 bg-[#00ff00]/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                     <div class="w-40 h-40 rounded-[2rem] overflow-hidden border-2 border-[#222] group-hover:border-[#00ff00]/50 transition-all duration-700 shadow-2xl">
                        <img src="${labIdentity.icon}" class="w-full h-full object-cover">
                     </div>
                  </div>

                  <div class="flex-1 space-y-6 w-full">
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                           <label class="text-[9px] font-mono text-[#444] uppercase tracking-widest pl-1">Display Name</label>
                           <input id="id-name" type="text" value="${labIdentity.name}" class="w-full bg-black border border-[#222] rounded-xl p-3 text-xs font-bold focus:border-[#00ff00]/50 outline-none transition-all uppercase italic text-[#00ff00]">
                        </div>
                        <div class="space-y-1.5">
                           <label class="text-[9px] font-mono text-[#444] uppercase tracking-widest pl-1">Experimental Title</label>
                           <input id="id-title" type="text" value="${labIdentity.title}" class="w-full bg-black border border-[#222] rounded-xl p-3 text-xs font-bold focus:border-[#00ff00]/50 outline-none transition-all uppercase italic">
                        </div>
                     </div>
                     <div class="space-y-1.5">
                        <label class="text-[9px] font-mono text-[#444] uppercase tracking-widest pl-1">Avatar Signature (URL)</label>
                        <input id="id-icon" type="text" value="${labIdentity.icon}" class="w-full bg-black border border-[#222] rounded-xl p-3 text-xs font-bold focus:border-[#00ff00]/50 outline-none transition-all">
                     </div>
                     <button 
                       onclick="window.updateIdentity(document.getElementById('id-name').value, document.getElementById('id-title').value, document.getElementById('id-icon').value)"
                       class="w-full py-4 bg-white text-black font-black uppercase italic tracking-widest text-xs rounded-xl shadow-xl hover:bg-[#00ff00] transition-all flex items-center justify-center gap-2"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"></path><path d="m4.93 10.93 1.41-1.41"></path><path d="M2 18h2"></path><path d="M20 18h2"></path><path d="m19.07 10.93-1.41-1.41"></path><path d="M22 22H2"></path><path d="m8 22 4-10 4 10"></path></svg>
                       Re-Synchronize Identity
                     </button>
                  </div>
               </div>
            </section>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Profile Stats -->
              <section class="bg-[#111] border border-[#222] rounded-3xl p-8 shadow-xl">
                <h3 class="text-xl font-bold uppercase italic mb-6 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Gaming Insights
                </h3>
                
                <div class="space-y-6">
                  <div class="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#222] rounded-2xl">
                    <span class="text-[#666] uppercase text-xs font-bold tracking-widest">Total Playtime</span>
                    <span class="text-lg font-black text-[#00ff00] italic">
                      ${formatDuration(Object.values(playTimes).reduce((a, b) => a + b, 0))}
                    </span>
                  </div>
                  
                  <div class="space-y-4">
                    <h4 class="text-[10px] font-mono text-[#444] uppercase tracking-[0.3em] mb-2">Detailed Statistics</h4>
                    <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                      ${Object.entries(playTimes).length === 0 ? `
                        <p class="text-[#444] text-xs italic">No data recorded yet. Start playing!</p>
                      ` : Object.entries(playTimes)
                          .sort((a, b) => b[1] - a[1]) // Sort by playtime
                          .map(([id, time]) => {
                            const game = games.find(g => g.id === id);
                            if (!game) return '';
                            return `
                              <div class="flex items-center justify-between p-3 border-b border-[#222] hover:bg-white/5 transition-colors rounded-lg group/item">
                                <div class="flex items-center gap-3">
                                  <div class="w-10 h-10 rounded overflow-hidden border border-[#333]">
                                    <img src="${game.thumbnail}" class="w-full h-full object-cover" />
                                  </div>
                                  <span class="text-sm font-bold uppercase italic group-hover/item:text-[#00ff00] transition-colors">${game.title}</span>
                                </div>
                                <span class="text-xs font-mono text-[#666] italic">${formatDuration(time)}</span>
                              </div>
                            `;
                          }).join('')}
                    </div>
                  </div>
                </div>
              </section>

              <!-- Preferences & Maintenance -->
              <section class="space-y-8">
                <div class="bg-[#111] border border-[#222] rounded-3xl p-8 shadow-xl relative overflow-hidden">
                   <div class="absolute top-0 right-0 p-4 opacity-10">
                     <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                   </div>
                   <h3 class="text-xl font-bold uppercase italic mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    Preferences
                  </h3>
                  <div class="space-y-6">
                     <div class="flex items-center justify-between">
                        <div>
                          <h4 class="font-bold text-sm uppercase">Data Synchronization</h4>
                          <p class="text-[10px] text-[#555] uppercase font-mono">Local Storage Mode</p>
                        </div>
                        <div class="w-10 h-5 bg-[#00ff00] rounded-full relative cursor-not-allowed opacity-50">
                          <div class="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                        </div>
                     </div>
                     
                     <div class="flex items-center justify-between group/row p-4 bg-black/20 rounded-2xl border border-transparent hover:border-white/5 transition-all">
                        <div class="group cursor-help">
                          <h4 class="font-bold text-sm uppercase flex items-center gap-2">
                             Auto-Save Engine
                             <div class="w-2 h-2 rounded-full ${autoSaveActive ? 'bg-[#00ff00] animate-pulse shadow-[0_0_10px_#00ff00]' : 'bg-red-500/20'} transition-all duration-500"></div>
                          </h4>
                          <p class="text-[10px] text-[#555] uppercase font-mono tracking-widest">Continuous Construct Sync</p>
                        </div>
                        <button 
                          onclick="window.toggleAutoSave()"
                          class="w-14 h-7 ${autoSaveActive ? 'bg-[#00ff00]' : 'bg-[#222]'} rounded-full relative transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] group"
                        >
                          <div class="absolute top-1 ${autoSaveActive ? 'right-1' : 'left-1'} w-5 h-5 bg-white rounded-full shadow-xl transition-all duration-500 flex items-center justify-center">
                             <div class="w-1.5 h-1.5 rounded-full ${autoSaveActive ? 'bg-[#00ff00]' : 'bg-gray-300'} transition-colors"></div>
                          </div>
                        </button>
                     </div>
                     <div class="pt-8 border-t border-[#222]">
                        <p class="text-[#666] text-xs leading-relaxed">Your gaming data, favorites, and custom creations are stored securely within your browser's local sandbox. Clearing your history or site data will reset these values.</p>
                      </div>

                     <div class="pt-6 border-t border-[#222] flex items-center justify-between">
                        <div>
                          <h4 class="font-bold text-sm uppercase mb-1">Developer Tools</h4>
                          <p class="text-[10px] text-[#555] font-mono uppercase tracking-widest italic cursor-pointer hover:text-[#00ff00]" onclick="window.toggleDebugPanel()">Click version to debug</p>
                        </div>
                        <button 
                          onclick="window.toggleDebugPanel()"
                          class="px-4 py-2 bg-black/40 border border-white/10 hover:border-[#00ff00]/50 hover:text-[#00ff00] text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                        >
                          Open Console
                        </button>
                     </div>

                     <div class="pt-6 border-t border-[#222] flex items-center justify-between">
                        <div>
                          <h4 class="font-bold text-sm uppercase mb-1">Data Backup</h4>
                          <p class="text-[10px] text-[#555] font-mono uppercase tracking-widest">v2.4.0-experimental</p>
                        </div>
                        <div class="flex gap-2">
                          <input 
                            type="file" 
                            id="import-input" 
                            accept=".json" 
                            class="hidden" 
                            onchange="window.importData(event)"
                          />
                          <button 
                            onclick="document.getElementById('import-input').click()"
                            class="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#00ff00]/50 hover:text-[#00ff00] text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                          >
                            Import
                          </button>
                          <button 
                            onclick="window.downloadData()"
                            class="px-4 py-2 bg-[#00ff00]/10 border border-[#00ff00]/20 text-[#00ff00] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#00ff00] hover:text-black transition-all"
                          >
                            Export
                          </button>
                        </div>
                     </div>
                  </div>
                </div>

                <div class="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 shadow-xl">
                   <h3 class="text-xl font-bold uppercase italic mb-4 text-red-500">System Wipe</h3>
                   <p class="text-[#666] text-xs mb-6 font-medium leading-relaxed">This will permanently delete all session history, playground projects, favorites, and music library. This action cannot be reversed.</p>
                   <button 
                    onclick="window.wipeData()"
                    class="w-full py-4 border border-red-500/20 text-red-500 font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-xl hover:shadow-red-500/20"
                   >
                    Factory Reset QT Labs
                   </button>
                </div>
              </section>
            </div>
          </div>
        ` : currentTab === 'create' ? `
          <!-- Create Tab Content -->
          <div class="space-y-8">
            <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 class="text-4xl font-black uppercase italic tracking-tighter">Studio <span class="text-[#00ff00]">Labs</span></h2>
                <p class="text-[#666] text-lg font-mono uppercase tracking-widest text-xs mt-1">Experimental Creation Tools</p>
              </div>
              <div class="flex bg-[#111] p-1 rounded-xl border border-[#222]">
                <button 
                 onclick="window.setCreateMode('code')"
                 class="px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${createMode === 'code' ? 'bg-[#00ff00] text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]' : 'text-[#666] hover:text-white'}"
                >
                 Game Lab
                </button>
                <button 
                 onclick="window.setCreateMode('3d')"
                 class="px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${createMode === '3d' ? 'bg-[#00ff00] text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]' : 'text-[#666] hover:text-white'}"
                >
                 3D Studio
                </button>
              </div>
            </header>

            ${createMode === 'code' ? `
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
                <div class="flex flex-col bg-[#111] border border-[#222] rounded-2xl overflow-hidden relative group">
                  <div class="bg-[#1a1a1a] px-4 py-2 border-b border-[#222] flex items-center justify-between">
                    <span class="text-[10px] font-mono text-[#444] uppercase tracking-widest">game.html</span>
                    <div class="flex items-center gap-2">
                       <button 
                        onclick="window.runCode()"
                        class="px-4 py-1.5 bg-[#00ff00] text-black rounded-lg text-xs font-bold uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,255,0,0.3)]"
                       >
                        Run Code
                       </button>
                       <button 
                        onclick="window.downloadCode()"
                        class="px-4 py-1.5 bg-[#1a1a1a] border border-[#333] text-[#888] rounded-lg text-xs font-bold uppercase hover:text-white transition-all"
                       >
                        Download
                       </button>
                    </div>
                  </div>
                  <textarea 
                   oninput="window.updateCode(this.value)"
                   class="flex-1 bg-black p-6 font-mono text-sm text-[#00ff00] focus:outline-none resize-none opacity-80 focus:opacity-100 transition-opacity"
                   spellcheck="false"
                  >${userCode}</textarea>
                  <div class="absolute bottom-4 right-4 text-[10px] font-mono text-[#222] pointer-events-none group-hover:text-[#333] transition-colors">
                    AUTOSAVING...
                  </div>
                </div>
                <div class="bg-black border border-[#222] rounded-2xl overflow-hidden relative">
                  <iframe id="code-preview" class="w-full h-full border-none"></iframe>
                  <div class="absolute top-4 right-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded border border-white/5 text-[8px] font-mono uppercase text-[#444]">
                    Live Preview
                  </div>
                </div>
              </div>
            ` : `
              <!-- Roblox Studio Interface -->
              <div class="flex flex-col h-[85vh] bg-[#222] border border-[#111] rounded-lg overflow-hidden shadow-2xl">
                <!-- Ribbon Tabs -->
                <div class="bg-[#333] flex items-end px-2 border-b border-[#111]">
                  ${['file', 'home', 'model', 'test', 'view'].map(tab => `
                    <button 
                      onclick="window.setRibbonTab('${tab}')"
                      class="px-4 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all rounded-t ${activeRibbonTab === tab ? 'bg-[#3b3b3b] text-white border-x border-t border-[#111]' : 'text-[#888] hover:text-[#ccc]'}"
                    >
                      ${tab}
                    </button>
                  `).join('')}
                </div>

                <!-- Ribbon Contents -->
                <div class="bg-[#3b3b3b] p-2 border-b border-[#111] flex items-center gap-6 overflow-x-auto min-h-[85px]">
                  ${activeRibbonTab === 'home' || activeRibbonTab === 'model' ? `
                    <!-- Selection Group -->
                    <div class="flex items-center gap-1 pr-4 border-r border-[#444]">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-1">
                          <button onclick="window.setStudioTool('select')" class="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-[#555] transition-all ${studioTool === 'select' ? 'bg-blue-600/50 outline outline-1 outline-blue-400' : ''}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg>
                            <span class="text-[8px] font-bold uppercase text-[#aaa]">Select</span>
                          </button>
                          <button onclick="window.setStudioTool('move')" class="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-[#555] transition-all ${studioTool === 'move' ? 'bg-blue-600/50 outline outline-1 outline-blue-400' : ''}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
                            <span class="text-[8px] font-bold uppercase text-[#aaa]">Move</span>
                          </button>
                          <button onclick="window.setStudioTool('scale')" class="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-[#555] transition-all ${studioTool === 'scale' ? 'bg-blue-600/50 outline outline-1 outline-blue-400' : ''}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line><line x1="3" y1="12" x2="21" y2="12"></line></svg>
                            <span class="text-[8px] font-bold uppercase text-[#aaa]">Scale</span>
                          </button>
                          <button onclick="window.setStudioTool('rotate')" class="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-[#555] transition-all ${studioTool === 'rotate' ? 'bg-blue-600/50 outline outline-1 outline-blue-400' : ''}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline></svg>
                            <span class="text-[8px] font-bold uppercase text-[#aaa]">Rotate</span>
                          </button>
                        </div>
                        <span class="text-[7px] text-center text-[#666] font-bold uppercase">Tools</span>
                      </div>
                    </div>

                    <!-- Insert Group -->
                    <div class="flex items-center gap-2 pr-4 border-r border-[#444]">
                      <div class="flex flex-col gap-1 items-center">
                        <div class="flex gap-1">
                          <button onclick="window.addObject('cube')" class="p-2 hover:bg-[#444] rounded flex flex-col items-center gap-1 group">
                            <div class="w-8 h-8 bg-blue-500/10 flex items-center justify-center text-blue-400 rounded-md border border-blue-500/20 group-hover:bg-blue-500/20">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                            </div>
                            <span class="text-[7px] font-bold text-[#888] uppercase">Part</span>
                          </button>
                          <button onclick="window.addObject('sphere')" class="p-2 hover:bg-[#444] rounded flex flex-col items-center gap-1 group">
                             <div class="w-8 h-8 bg-purple-500/10 flex items-center justify-center text-purple-400 rounded-md border border-purple-500/20 group-hover:bg-purple-500/20">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                            </div>
                            <span class="text-[7px] font-bold text-[#888] uppercase">Sphere</span>
                          </button>
                        </div>
                        <span class="text-[7px] text-center text-[#666] font-bold uppercase">Insert</span>
                      </div>
                    </div>

                    <!-- Test Group -->
                    <div class="flex items-center gap-1 pr-4 border-r border-[#444]">
                        <button onclick="window.runCode()" class="flex flex-col items-center gap-1 p-2 hover:bg-[#555] rounded-md transition-all group">
                          <div class="w-10 h-10 bg-blue-600 flex items-center justify-center text-white rounded-md shadow-lg group-hover:scale-105 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                          </div>
                          <span class="text-[8px] font-black italic uppercase text-blue-400">Play</span>
                        </button>
                    </div>

                    <!-- AI Assistant -->
                     <div class="flex items-center gap-1">
                        <button onclick="window.askAIToBuild()" class="flex flex-col items-center gap-1 p-2 hover:bg-[#555] rounded-md transition-all group">
                          <div class="w-10 h-10 bg-[#00ff00]/10 flex items-center justify-center text-[#00ff00] rounded-md border border-[#00ff00]/30 shadow-[0_0_15px_rgba(0,255,0,0.1)] group-hover:bg-[#00ff00]/20">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path></svg>
                          </div>
                          <span class="text-[8px] font-bold uppercase text-[#00ff00]">AI Build</span>
                        </button>
                    </div>
                  ` : ''}

                  ${activeRibbonTab === 'file' ? `
                    <div class="flex items-center gap-4 px-4">
                       <button onclick="window.setTab('projects_hub')" class="flex flex-col items-center gap-1 p-2 hover:bg-[#555] rounded group">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[#888]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                          <span class="text-[8px] font-bold text-[#888] uppercase">Back to Hub</span>
                       </button>
                       <button onclick="window.saveCurrentProject()" class="flex flex-col items-center gap-1 p-2 hover:bg-[#555] rounded group">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[#888]"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                          <span class="text-[8px] font-bold text-[#888] uppercase">Save Progress</span>
                       </button>
                    </div>
                  ` : ''}

                  <div class="ml-auto pr-6 hidden md:flex flex-col items-end gap-1">
                     <div class="flex items-center gap-2">
                        <div class="w-1.5 h-1.5 rounded-full ${autoSaveActive ? 'bg-[#00ff00] animate-pulse shadow-[0_0_8px_rgba(0,255,0,0.5)]' : 'bg-[#444]'}"></div>
                        <h4 class="text-[9px] font-black uppercase italic tracking-tighter ${autoSaveActive ? 'text-[#00ff00]' : 'text-[#666]'}">
                           ${autoSaveActive ? 'Auto-Save Protocol' : 'Manual Save Mode'}
                        </h4>
                     </div>
                     <p class="text-[8px] font-mono text-[#444] uppercase tracking-[0.3em]">Neural_Sync_Active: ${autoSaveActive}</p>
                  </div>
                </div>

                <div class="flex flex-1 overflow-hidden">
                  <!-- Toolbox (Left Sidebar) -->
                  <div class="w-64 bg-[#333] border-r border-[#111] flex flex-col">
                    <div class="p-2 border-b border-[#111] flex items-center justify-between">
                       <span class="text-[10px] font-bold text-[#aaa] uppercase px-2">Toolbox</span>
                       <div class="flex gap-1">
                        <button class="p-1 hover:bg-[#444] rounded"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
                       </div>
                    </div>
                    
                    <div class="bg-[#2a2a2a] p-1 grid grid-cols-3 gap-1">
                      ${['Models', 'Images', 'Audio'].map(cat => `
                        <button class="py-1 text-[8px] font-bold uppercase ${cat === 'Models' ? 'bg-[#3b3b3b] text-white' : 'text-[#666]'} rounded">${cat}</button>
                      `).join('')}
                    </div>

                    <div class="flex-1 overflow-y-auto p-2 bg-[#2a2a2a]">
                      <div class="text-[9px] font-black text-[#555] uppercase mb-2">Essential Assets</div>
                      <div class="grid grid-cols-2 gap-2">
                        ${['SpawnLocation', 'Car', 'Building', 'Light', 'Tree', 'NPC'].map(item => `
                          <div onclick="window.addObject('cube', '${item}')" class="aspect-square bg-[#333] border border-[#444] hover:border-blue-500 rounded p-1 flex flex-col items-center justify-center cursor-pointer group transition-all">
                             <div class="flex-1 flex items-center justify-center opacity-20 group-hover:opacity-100 transition-opacity">
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                             </div>
                             <span class="text-[7px] font-bold text-[#666] group-hover:text-white uppercase truncate w-full text-center">${item}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>

                  <!-- Center: Viewport + Output -->
                  <div class="flex-1 flex flex-col relative">
                    <!-- Viewport -->
                    <div class="flex-1 relative">
                       <div id="three-viewport" class="w-full h-full"></div>
                       <div class="absolute top-4 right-4 z-10">
                          <div class="w-24 h-24 bg-white/5 border border-white/10 rounded flex items-center justify-center pointer-events-none hover:bg-white/10 transition-colors">
                             <span class="text-[10px] font-mono text-white/20">VIEW SELECTOR</span>
                          </div>
                       </div>
                       
                       <div class="absolute bottom-4 left-4 z-10 flex gap-2">
                          <span class="px-2 py-0.5 bg-black/60 rounded text-[8px] font-mono text-white/50 border border-white/5 uppercase">Grid: 1 Stud</span>
                          <span class="px-2 py-0.5 bg-black/60 rounded text-[8px] font-mono text-white/50 border border-white/5 uppercase">3D: 60FPS</span>
                       </div>
                    </div>

                    <!-- Output (Bottom) -->
                    <div class="h-40 bg-[#1a1a1a] border-t border-[#111] flex flex-col">
                       <div class="px-3 py-1 bg-[#2a2a2a] border-b border-[#111] flex items-center justify-between">
                          <span class="text-[9px] font-bold text-[#666] uppercase">Output</span>
                          <button class="text-[8px] text-[#444] uppercase hover:text-white">Clear</button>
                       </div>
                       <div class="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1">
                          <div class="text-blue-400 opacity-50"># Studio Engine Initialized Successfully</div>
                          <div class="text-emerald-400 opacity-50"># Project Loading: ${projects.find(p => p.id === currentProjectId)?.name || 'Untitled'}</div>
                       </div>
                    </div>
                  </div>

                  <!-- Sidebar Combo (Right) -->
                  <div class="w-72 bg-[#333] border-l border-[#111] flex flex-col">
                    <!-- Explorer -->
                    <div class="flex-1 flex flex-col">
                      <div class="p-2 border-b border-[#111] bg-[#3b3b3b] text-[10px] font-bold text-[#aaa] uppercase">Explorer</div>
                      <div class="flex-1 overflow-y-auto bg-[#2a2a2a] border-b border-[#111]">
                        <div class="p-1 space-y-0.5">
                           <div class="flex items-center gap-2 p-1 text-[11px] text-white/60">
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                             Workspace
                           </div>
                           <div class="pl-4">
                             ${sceneObjects.map(obj => `
                                <div 
                                  onclick="window.selectObject('${obj.id}')"
                                  class="flex items-center gap-2 p-1 text-[11px] cursor-pointer group ${selectedObjectId === obj.id ? 'bg-blue-600 text-white' : 'text-[#888] hover:bg-[#3b3b3b]'}"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                                  ${obj.name}
                                </div>
                             `).join('')}
                           </div>
                        </div>
                      </div>
                    </div>

                    <!-- Properties -->
                    <div class="flex-[1.5] flex flex-col">
                      <div class="p-2 border-b border-[#111] bg-[#3b3b3b] text-[10px] font-bold text-[#aaa] uppercase">Properties - ${selectedObjectId ? sceneObjects.find(o => o.id === selectedObjectId).name : 'No Selection'}</div>
                      <div class="flex-1 overflow-y-auto bg-[#2a2a2a]">
                        <div class="p-2 space-y-4">
                          ${selectedObjectId ? `
                             <!-- Section -->
                             <div>
                               <div class="text-[8px] font-black text-[#555] uppercase mb-1 flex items-center gap-2">
                                 <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"></path></svg>
                                 Appearance
                               </div>
                               <div class="border border-[#111]">
                                 <div class="flex border-b border-[#111]">
                                   <div class="w-24 p-1 text-[9px] text-[#666] bg-[#333] border-r border-[#111]">BrickColor</div>
                                   <div class="flex-1 p-1 bg-[#2a2a2a] flex items-center justify-between">
                                      <span class="text-[9px] text-[#888]">${sceneObjects.find(o => o.id === selectedObjectId).color}</span>
                                      <input type="color" value="${sceneObjects.find(o => o.id === selectedObjectId).color}" oninput="window.updateObjectProperty('${selectedObjectId}', 'color', null, this.value)" class="w-4 h-4 bg-transparent border-none">
                                   </div>
                                 </div>
                               </div>
                             </div>

                             <!-- Section -->
                             <div>
                               <div class="text-[8px] font-black text-[#555] uppercase mb-1 flex items-center gap-2">
                                 <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"></path></svg>
                                 Transform
                               </div>
                               <div class="border border-[#111]">
                                 ${['position', 'rotation', 'scale'].map(prop => `
                                    <div class="flex border-b border-[#111]">
                                      <div class="w-24 p-1 text-[9px] text-[#666] bg-[#333] border-r border-[#111] capitalize">${prop}</div>
                                      <div class="flex-1 bg-[#2a2a2a] flex text-[9px]">
                                        ${['x', 'y', 'z'].map(axis => `
                                           <div class="flex-1 flex items-center border-r border-[#111] last:border-0 p-1">
                                              <span class="text-[7px] text-[#444] mr-1 uppercase">${axis}</span>
                                              <input 
                                                type="number" 
                                                step="0.1" 
                                                value="${sceneObjects.find(o => o.id === selectedObjectId)[prop][axis]}" 
                                                oninput="window.updateObjectProperty('${selectedObjectId}', '${prop}', '${axis}', this.value)"
                                                class="w-full bg-transparent outline-none text-[#888]"
                                              >
                                           </div>
                                        `).join('')}
                                      </div>
                                    </div>
                                 `).join('')}
                               </div>
                             </div>
                          ` : `
                            <div class="h-full flex items-center justify-center p-8 text-center">
                              <p class="text-[9px] text-[#444] font-mono uppercase italic">Select an object to modify its attributes.</p>
                            </div>
                          `}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Status Bar -->
                <div class="bg-[#3b3b3b] px-3 py-1 border-t border-[#111] flex items-center justify-between text-[8px] font-mono text-[#666] uppercase">
                   <div class="flex items-center gap-4">
                      <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full ${autoSaveActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]' : 'bg-red-500/30'}"></div>
                        <span>Auto-Save: ${autoSaveActive ? 'Active' : 'Standby'}</span>
                      </div>
                      <span class="text-blue-500">Workspace.Grid_Active</span>
                   </div>
                   <div class="flex items-center gap-4">
                      <span id="save-indicator" class="text-white/20 transition-all duration-300">Sync: Ready</span>
                      <span>Object Count: ${sceneObjects.length}</span>
                      <span class="text-emerald-500">VRS: 0.12.8</span>
                   </div>
                </div>
              </div>
            `}
          </div>
        ` : currentTab === 'projects_hub' ? `
          <div class="flex h-screen bg-[#111] overflow-hidden">
            <!-- Studio Sidebar -->
            <aside class="w-64 bg-[#1a1a1a] border-r border-[#222] flex flex-col p-4 gap-2">
              <button onclick="window.createNewProject()" class="flex items-center gap-3 px-4 py-3 bg-[#2a2a2a] hover:bg-[#333] border border-[#333] rounded-md text-xs font-bold uppercase mb-4 transition-all">
                <div class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                New File
              </button>

              <nav class="space-y-1">
                <button class="w-full text-left px-4 py-2 bg-[#2a2a2a] rounded-md text-xs font-bold text-white flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                  Home
                </button>
                <button class="w-full text-left px-4 py-2 hover:bg-[#222] rounded-md text-xs font-bold text-[#888] flex items-center gap-3 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                  Experiences
                </button>
                <button class="w-full text-left px-4 py-2 hover:bg-[#222] rounded-md text-xs font-bold text-[#888] flex items-center gap-3 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  Templates
                </button>
              </nav>

              <div class="mt-auto px-4 py-4 text-[10px] font-mono text-[#444] uppercase tracking-widest">
                Studio Labs v2.4
              </div>
            </aside>

            <!-- Main Content Area -->
            <main class="flex-1 overflow-y-auto p-12 bg-[#121212]">
              <div class="max-w-6xl mx-auto space-y-12">
                
                <!-- Section: Recent Experiences -->
                <section>
                  <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-black uppercase italic tracking-tighter">My Recent Experiences</h2>
                    <button class="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-widest">See All</button>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${projects.map(p => `
                      <div class="bg-[#1a1a1a] border border-[#222] rounded-lg overflow-hidden group hover:border-blue-500/50 transition-all">
                        <div class="aspect-video bg-[#0c0c0c] flex items-center justify-center p-4 relative group-hover:bg-blue-900/10">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-[#333] group-hover:text-blue-500/30 transition-colors">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          </svg>
                          <div class="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/80 text-[8px] font-bold text-[#888] rounded uppercase">Private</div>
                        </div>
                        <div class="p-4">
                          <h3 class="text-xs font-bold uppercase truncate mb-1">${p.name}</h3>
                          <p class="text-[9px] font-mono text-[#555] uppercase mb-4">Modified ${new Date(p.lastModified).toLocaleDateString()}</p>
                          <div class="flex gap-2">
                             <button 
                                onclick="window.loadProject('${p.id}'); window.setTab('create')"
                                class="flex-1 py-1.5 bg-[#2a2a2a] hover:bg-blue-600 rounded text-[9px] font-bold uppercase transition-all"
                              >
                                Edit Experience
                              </button>
                              ${projects.length > 1 ? `
                                <button 
                                  onclick="window.deleteProject('${p.id}')"
                                  class="px-2 py-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              ` : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </section>

                <!-- Section: Templates -->
                <section>
                  <div class="flex items-center justify-between mb-6 border-t border-[#222] pt-12">
                    <h2 class="text-xl font-black uppercase italic tracking-tighter">Open a Template</h2>
                    <button class="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-widest">See All</button>
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div onclick="window.createNewProject()" class="bg-[#1a1a1a] border border-transparent hover:border-blue-500 rounded overflow-hidden p-2 cursor-pointer transition-all">
                      <div class="aspect-square bg-[#0c0c0c] rounded flex items-center justify-center mb-2">
                        <div class="w-8 h-1 bg-[#222]"></div>
                      </div>
                      <span class="text-[9px] font-bold uppercase block text-center">Baseplate</span>
                    </div>
                    <div onclick="window.createNewProject()" class="bg-[#1a1a1a] border border-transparent hover:border-blue-500 rounded overflow-hidden p-2 cursor-pointer transition-all">
                      <div class="aspect-square bg-[#0c0c0c] rounded flex items-center justify-center mb-2 font-mono text-[8px] text-[#222] border border-[#222]">GRID</div>
                      <span class="text-[9px] font-bold uppercase block text-center">Classic Baseplate</span>
                    </div>
                    <div class="bg-[#1a1a1a] opacity-40 rounded overflow-hidden p-2 cursor-not-allowed">
                      <div class="aspect-square bg-green-900/10 rounded flex items-center justify-center mb-2"></div>
                      <span class="text-[9px] font-bold uppercase block text-center">Flat Terrain</span>
                    </div>
                    <div class="bg-[#1a1a1a] opacity-40 rounded overflow-hidden p-2 cursor-not-allowed">
                      <div class="aspect-square bg-blue-900/10 rounded flex items-center justify-center mb-2"></div>
                      <span class="text-[9px] font-bold uppercase block text-center">Platformer</span>
                    </div>
                  </div>
                </section>

                <!-- Section: Discover Studio -->
                <section>
                  <div class="flex items-center justify-between mb-6 border-t border-[#222] pt-12">
                    <h2 class="text-xl font-black uppercase italic tracking-tighter">Discover Studio</h2>
                    <button class="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-widest">See All</button>
                  </div>
                  <p class="text-[#555] text-[10px] mb-6 uppercase tracking-wider">Level up fast with our tutorials and resources, and learn the skills to bring your ideas to life.</p>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div class="bg-[#1a1a1a] border border-[#222] rounded-lg overflow-hidden group hover:border-[#333] transition-all cursor-pointer">
                      <div class="aspect-video bg-gradient-to-br from-indigo-900/20 to-purple-900/20 flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-purple-500/40"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                      </div>
                      <div class="p-4">
                        <h4 class="text-[10px] font-bold uppercase mb-1">Sketch Series</h4>
                        <p class="text-[9px] text-[#444] uppercase leading-relaxed">Video tutorials that break down complex principles.</p>
                      </div>
                    </div>
                    <div class="bg-[#1a1a1a] border border-[#222] rounded-lg overflow-hidden group hover:border-[#333] transition-all cursor-pointer">
                      <div class="aspect-video bg-blue-900/20 flex items-center justify-center">
                         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-blue-500/40"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      </div>
                      <div class="p-4">
                        <h4 class="text-[10px] font-bold uppercase mb-1">Tutorials</h4>
                        <p class="text-[9px] text-[#444] uppercase leading-relaxed">Get to grips with the fundamentals of Studio.</p>
                      </div>
                    </div>
                    <div class="bg-[#1a1a1a] border border-[#222] rounded-lg overflow-hidden group hover:border-[#333] transition-all cursor-pointer">
                      <div class="aspect-video bg-green-900/20 flex items-center justify-center">
                         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-green-500/40"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                      </div>
                      <div class="p-4">
                        <h4 class="text-[10px] font-bold uppercase mb-1">Roblox Principles</h4>
                        <p class="text-[9px] text-[#444] uppercase leading-relaxed">Discover the structure of Roblox experiences.</p>
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            </main>
          </div>
        ` : ''}
      </main>

      <!-- Game Player Modal -->
      <div id="modal-container" class="hidden fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-sm">
        <!-- Modal content will be rendered here -->
      </div>

      <!-- Footer -->
      <footer class="border-t border-[#222] py-12 mt-20">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-8">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-[#00ff00] rounded flex items-center justify-center text-black">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
            </div>
            <span class="font-bold uppercase tracking-tighter italic">QTX Labs</span>
          </div>
          
          <div class="flex gap-8 text-sm font-mono uppercase text-[#666]">
            <a href="#" class="hover:text-[#00ff00] transition-colors">Privacy</a>
            <a href="#" class="hover:text-[#00ff00] transition-colors">Terms</a>
            <a href="#" class="hover:text-[#00ff00] transition-colors">Contact</a>
          </div>

          <p class="text-[#444] text-xs font-mono uppercase">
            &copy; 2026 QTX Labs. All rights reserved.
          </p>
        </div>
      </footer>
    ${renderDebugPanel()}
  </div>
  `;

  document.getElementById('search-input')?.addEventListener('input', handleSearch);
  
  // Backdrop click to close modals
  document.getElementById('modal-container').addEventListener('click', (e) => {
    if (e.target.id === 'modal-container' && !isFullScreen) {
      closeGame();
    }
  });

  if (currentTab === 'games') {
    renderGrid();
    renderCategoryBar();
  }
  renderModal();
  renderImportModal();
  
  if ((currentTab === 'create' && createMode === '3d') || selectedGame?.type === 'project') {
    setTimeout(initThreeJS, 150);
  }

  if (currentTab === 'create' && createMode === 'code') {
    const preview = document.getElementById('code-preview');
    if (preview) {
      preview.srcdoc = userCode;
    }
  }

  if (currentTab === 'ai_agent') {
    const chatHistory = document.getElementById('ai-chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }
}

function toggleDebugPanel() {
  showDebugPanel = !showDebugPanel;
  render();
}

function clearDebugLogs() {
  debugLogs = [];
  render();
}

function renderDebugPanel() {
  if (!showDebugPanel) return '';
  
  return `
    <div class="fixed inset-0 z-[200] flex justify-end pointer-events-none">
       <div class="pointer-events-auto w-full max-w-xl bg-[#050505] border-l border-[#222] shadow-[ -20px_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300">
          <header class="p-4 border-b border-[#222] flex items-center justify-between bg-[#0a0a0a]">
             <div class="flex items-center gap-3">
                <div class="w-2 h-2 bg-[#00ff00] rounded-full animate-pulse"></div>
                <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">System <span class="text-[#00ff00]">Diagnostics</span></h3>
             </div>
             <div class="flex items-center gap-2">
                <button onclick="window.clearDebugLogs()" class="p-2 hover:bg-[#111] rounded text-[10px] text-[#666] uppercase font-bold tracking-widest">Clear</button>
                <button onclick="window.toggleDebugPanel()" class="p-2 hover:bg-white/10 rounded transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
             </div>
          </header>
          
          <div class="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2 no-scrollbar">
             ${debugLogs.length === 0 ? `
               <div class="h-full flex items-center justify-center text-[#333] italic">No active logs detected in the stream</div>
             ` : debugLogs.map(log => `
               <div class="p-2 border-b border-[#111] hover:bg-white/5 transition-colors group">
                  <div class="flex items-start gap-3">
                     <span class="text-[#333] shrink-0">${log.time}</span>
                     <span class="${log.type === 'error' ? 'text-red-500' : log.type === 'warn' ? 'text-yellow-500' : 'text-[#888]'} shrink-0 uppercase font-black">[${log.type}]</span>
                     <span class="text-white/80 break-all leading-relaxed">${log.msg}</span>
                  </div>
               </div>
             `).join('')}
          </div>
          
          <footer class="p-4 border-t border-[#222] bg-[#0a0a0a]">
             <p class="text-[9px] text-[#444] uppercase font-bold tracking-[0.1em]">Keyboard Shortcut: <span class="text-[#00ff00]">CTRL + SHIFT + L</span></p>
          </footer>
       </div>
    </div>
  `;
}

function renderCategoryBar() {
  const bar = document.getElementById('category-bar');
  if (!bar) return;
  
  if (isLoading) {
    bar.innerHTML = Array(8).fill(0).map(() => `
      <div class="px-6 py-2.5 bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl animate-shimmer shimmer w-24 h-9"></div>
    `).join('');
    return;
  }
  
  const displayCategories = [...categories];
  
  // Add virtual categories
  if (favoriteGameIds.length > 0 && !displayCategories.includes('Favorites')) {
    displayCategories.splice(1, 0, 'Favorites');
  }
  
  if (!displayCategories.includes('Newest')) {
    displayCategories.splice(displayCategories.includes('Favorites') ? 2 : 1, 0, 'Newest');
  }

  const categoryIcons = {
    'All': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    'Favorites': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
    'Newest': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4 4 4-4 4z"></path><path d="M4 14v1"></path><path d="M8 14v1"></path><path d="M12 14V4"></path></svg>',
    'Horror': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2Z"></path><path d="M12 11v2"></path><path d="m16 9-2 2"></path><path d="m8 9 2 2"></path></svg>',
    'Platformer': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"></path><path d="M6 16h4"></path><path d="M14 12h4"></path><path d="M2 20v-4"></path><path d="M6 16v-4"></path><path d="M14 12V8"></path></svg>',
    'RPG': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 12.5-8 8.5L3 17.5l8.5-8.5v-3L15 2l7 7-4 3.5h-3.5Z"></path><path d="m15 2 7 7"></path><path d="M11.5 9 15 12.5"></path><path d="m3 17.5 3.5 3.5"></path></svg>',
    'Shooter': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M22 12h-4"></path><path d="M6 12H2"></path><path d="M12 6V2"></path><path d="M12 22v-4"></path></svg>',
    'Simulation': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l3 6v12H3V9l3-6z"></path><path d="M3 9h18"></path><path d="M9 21v-8l3-3 3 3v8"></path></svg>',
    'Puzzle': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m12 8 4 4-4 4-4-4 4-4z"></path></svg>',
    'Adventure': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    'Arcade': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8H4v4"></path><path d="M2 20h20"></path><path d="M7 20v-2"></path><path d="M17 20v-2"></path><rect x="6" y="12" width="12" height="4"></rect></svg>',
    'Idle': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    'IO': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="m17 5-10 14"></path><path d="m7 5 10 14"></path></svg>',
    'Sports': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m2 12 20 0"></path><path d="m12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    'Sandbox': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>',
    'Visual Novel': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
  };

  bar.innerHTML = displayCategories.map(cat => {
    const isActive = selectedCategory === cat;
    const icon = categoryIcons[cat] || '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>';
    
    // Calculate count
    let count = 0;
    if (cat === 'All') count = games.length;
    else if (cat === 'Favorites') count = favoriteGameIds.length;
    else if (cat === 'Newest') count = games.slice(-10).length;
    else count = games.filter(g => g.category === cat).length;

    return `
      <button 
        onclick="window.setCategory('${cat}')"
        class="group relative px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 flex-shrink-0 flex items-center gap-2.5 border italic
        ${isActive 
          ? 'bg-white text-black border-white shadow-[0_10px_20px_-5px_rgba(255,255,255,0.2)] scale-105 z-10' 
          : 'bg-[#111] text-[#777] border-[#222] hover:border-[#00ff00]/50 hover:text-white hover:bg-[#00ff00]/5 hover:scale-102'}"
      >
        <span class="${isActive ? 'text-black' : 'text-[#00ff00]'} transition-colors">${icon}</span>
        <span class="relative z-10">${cat}</span>
        <span class="ml-1 text-[8px] opacity-40 font-mono tracking-tighter">${count}</span>
        ${isActive ? `
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
        ` : ''}
      </button>
    `;
  }).join('');
}

function renderGrid() {
  const grid = document.getElementById('game-grid');
  const emptyState = document.getElementById('empty-state');
  const hero = document.getElementById('hero-section');
  const favorites = document.getElementById('favorites-section');
  const recent = document.getElementById('recent-section');
  const count = document.getElementById('game-count');

  if (!grid) return;

  if (count) count.innerText = `${filteredGames.length} Games`;

  if (searchQuery !== '' || selectedCategory !== 'All') {
    hero?.classList.add('hidden');
    favorites?.classList.add('hidden');
    recent?.classList.add('hidden');
  } else {
    hero?.classList.remove('hidden');
    favorites?.classList.remove('hidden');
    recent?.classList.remove('hidden');
  }

  if (filteredGames.length === 0 && !isLoading) {
    grid.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  
  // Clear grid
  grid.innerHTML = '';

  if (isLoading) {
    // Show total count of skeletons (e.g., 12)
    for (let i = 0; i < 12; i++) {
        grid.innerHTML += createSkeletonCard();
    }
    return;
  }
  
  // Create an intersection observer for lazy loading individual cards
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const gameId = entry.target.getAttribute('data-placeholder-id');
        const game = filteredGames.find(g => g.id === gameId);
        if (game) {
          // Replace placeholder with actual card
          const cardHtml = createGameCard(game);
          const temp = document.createElement('div');
          temp.innerHTML = cardHtml.trim();
          const cardElement = temp.firstChild;
          entry.target.replaceWith(cardElement);
        }
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '200px 0px', // Start loading before they enter the viewport
    threshold: 0.01
  });

  // Populate grid with placeholders
  filteredGames.forEach(game => {
    const placeholder = document.createElement('div');
    placeholder.setAttribute('data-placeholder-id', game.id);
    // Placeholder matches the card's relative size for layout stability
    placeholder.innerHTML = createSkeletonCard();
    placeholder.className = 'w-full';
    grid.appendChild(placeholder);
    observer.observe(placeholder);
  });
}

function renderImportModal() {
  const container = document.getElementById('modal-container');
  if (!importModalVisible) {
    if (!selectedGame) {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div class="bg-[#0c0c0c] border border-[#222] w-full max-w-lg rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="absolute -top-24 -left-24 w-64 h-64 bg-[#00ff00]/5 rounded-full blur-[100px]"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-3xl font-black uppercase italic tracking-tighter leading-none">Import <span class="text-[#00ff00]">Node</span></h3>
            <button onclick="window.toggleImportModal(false)" class="text-[#444] hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <p class="text-[10px] font-mono text-[#555] uppercase tracking-widest mb-8">Injecting custom frequency into local registry</p>

          <form onsubmit="event.preventDefault(); window.handleImportSubmit(this)" class="space-y-6">
            <div class="space-y-2">
              <label class="text-[9px] font-mono text-[#444] uppercase tracking-widest pl-1">Game Title</label>
              <input name="title" type="text" required placeholder="e.g. My Favorite Game" class="w-full bg-black border border-[#222] rounded-xl p-4 text-xs font-bold focus:border-[#00ff00]/50 outline-none transition-all uppercase italic text-white placeholder-[#222]">
            </div>
            
            <div class="space-y-2">
              <label class="text-[9px] font-mono text-[#444] uppercase tracking-widest pl-1">Interface URL (HTTPS Required)</label>
              <input name="url" type="url" required placeholder="https://example.com/game/index.html" class="w-full bg-black border border-[#222] rounded-xl p-4 text-xs font-bold focus:border-[#00ff00]/50 outline-none transition-all font-mono text-[#00ff00] placeholder-[#222]">
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-mono text-[#444] uppercase tracking-widest pl-1">Visual Signature (Thumbnail URL)</label>
              <input name="thumb" type="url" placeholder="https://images.unsplash.com/..." class="w-full bg-black border border-[#222] rounded-xl p-4 text-xs font-bold focus:border-[#00ff00]/50 outline-none transition-all text-white/60 placeholder-[#222]">
              <p class="text-[8px] text-[#333] uppercase italic">Leaving empty will apply standard lab placeholder.</p>
            </div>

            <button type="submit" class="w-full py-5 bg-white text-black font-black uppercase italic tracking-widest text-sm rounded-2xl shadow-xl hover:bg-[#00ff00] transition-all flex items-center justify-center gap-2 group">
              <svg class="group-hover:rotate-12 transition-transform" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Establish Uplink
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function toggleImportModal(visible) {
  importModalVisible = visible;
  render();
}

function handleImportSubmit(form) {
  const data = new window.FormData(form);
  const title = data.get('title');
  const url = data.get('url');
  const thumb = data.get('thumb');
  
  addCustomGame(title, url, 'Custom', thumb);
  toggleImportModal(false);
}

window.toggleImportModal = toggleImportModal;
window.handleImportSubmit = handleImportSubmit;

function renderModal() {
  const container = document.getElementById('modal-container');
  if (!selectedGame) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  // Remove padding entirely to allow modal to hit edges if needed
  container.classList.remove('p-4', 'sm:p-8', 'p-2', 'sm:p-4');

  container.classList.remove('hidden');
  container.innerHTML = `
    <div
      class="bg-[#111] border-[#333] overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${isFullScreen ? 'w-full h-full border-0 rounded-none' : 'w-[100vw] h-dvh border-0 rounded-none sm:w-[98vw] sm:h-[98dvh] sm:border sm:rounded-2xl lg:w-[95vw] lg:h-[95dvh]'}"
    >
      <!-- Toolbar -->
      <div class="p-3 border-b border-[#222] flex items-center justify-between bg-[#1a1a1a]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-[#00ff00] rounded flex items-center justify-center text-black">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
          </div>
          <div>
            <h2 class="font-bold leading-none">${selectedGame.title}</h2>
            <span class="text-[10px] uppercase tracking-widest text-[#666] font-mono">Playing Now</span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <div class="hidden md:flex items-center gap-2 text-[#444] text-[10px] font-mono uppercase mr-4">
            <span>Press ESC to close</span>
          </div>
          <button 
            onclick="window.toggleFullScreen()"
            class="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#333] hover:border-[#00ff00]/50 hover:bg-[#00ff00]/10 rounded-lg transition-all text-[#888] hover:text-[#00ff00] text-xs font-bold uppercase tracking-wider"
            title="Toggle Fullscreen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            <span>Fullscreen</span>
          </button>
          ${selectedGame.iframeUrl ? `
          <a 
            href="${selectedGame.iframeUrl}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="p-2 hover:bg-[#333] rounded-lg transition-colors text-[#888] hover:text-white"
            title="Open in New Tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
          ` : ''}
          <div class="w-px h-6 bg-[#333] mx-2" />
          <button 
            onclick="window.closeGame()"
            class="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all flex items-center gap-2 font-bold px-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            CLOSE
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 bg-black relative overflow-hidden flex flex-col">
        ${isFullScreen ? `
          <button 
            onclick="window.closeGame()"
            class="absolute top-4 right-4 z-50 bg-red-600/80 backdrop-blur-md text-white p-3 rounded-full shadow-2xl hover:bg-red-600 transition-all hover:scale-110 active:scale-95"
            title="Close Game"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        ` : ''}

        ${selectedGame.type === 'project' ? `
          <div id="three-modal-viewport" class="flex-1 w-full h-full bg-[#0a0a0a]"></div>
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
             <div class="px-4 py-2 bg-black/80 backdrop-blur-md border border-[#00ff00]/30 rounded-full flex items-center gap-3 shadow-2xl">
                <div class="w-1.5 h-1.5 bg-[#00ff00] rounded-full animate-pulse"></div>
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff00]">Project Loaded</span>
                <div class="w-px h-3 bg-white/10 mx-1"></div>
                <span class="text-[8px] font-mono text-white/40 italic uppercase tracking-widest">3D Runtime v0.4</span>
             </div>
          </div>
        ` : `
          <iframe
            src="${selectedGame.iframeUrl}"
            class="flex-1 w-full h-full border-none block"
            title="${selectedGame.title}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowfullscreen
          ></iframe>
        `}
      </div>
    </div>
  `;
}

// Global functions for onclick handlers
window.render = render;
window.recentlyPlayedIds = recentlyPlayedIds;
window.clearHistory = clearHistory;
window.toggleFavorite = toggleFavorite;
window.setCategory = setCategory;
window.handleFileUpload = handleFileUpload;
window.playTrack = playTrack;
window.setTrack = setTrack;
window.setTab = setTab;
window.setCreateMode = setCreateMode;
window.pushToHistory = pushToHistory;
window.addObject = addObject;
window.undo = undo;
window.redo = redo;
window.createNewProject = createNewProject;
window.loadProject = loadProject;
window.deleteProject = deleteProject;
window.saveCurrentProject = saveCurrentProject;
window.renameCurrentProject = renameCurrentProject;
window.deleteObject = deleteObject;
window.updateObjectProperty = updateObjectProperty;
window.selectObject = selectObject;
window.updateCode = updateCode;
window.runCode = runCode;
window.downloadCode = downloadCode;
window.scaleObject = scaleObject;
window.openGame = openGame;
window.closeGame = closeGame;
window.toggleFullScreen = toggleFullScreen;
window.togglePlay = togglePlay;
window.nextTrack = nextTrack;
window.setVolume = setVolume;
function updateIdentity(name, title, icon) {
  labIdentity = { name, title, icon };
  localStorage.setItem('lab_identity', JSON.stringify(labIdentity));
  render();
  showToast('Identity Synchronized');
}

window.updateIdentity = updateIdentity;
window.toggleAutoSave = toggleAutoSave;
window.importModalVisible = importModalVisible;
window.addCustomGame = addCustomGame;
window.removeCustomGame = removeCustomGame;
window.setTrack = (index) => {
  currentTrackIndex = index;
  audioStatus = 'connecting';
  render();
  
  audioPlayer.src = radioStations[currentTrackIndex].url;
  audioPlayer.load(); // Force reset state
  
  isPlaying = true; // Set to true as we intend to play
  audioPlayer.play().then(() => {
    audioStatus = 'playing';
    render();
  }).catch(e => {
    console.error("Audio play blocked/failed:", e);
    audioStatus = 'error';
    isPlaying = false;
    render();
  });
};
window.processAICommand = processAICommand;
window.handleSearch = handleSearch;
window.wipeData = wipeData;
window.downloadData = downloadData;
window.importData = importData;
window.toggleDebugPanel = toggleDebugPanel;
window.clearDebugLogs = clearDebugLogs;
window.formatDuration = formatDuration;
window.askAIToBuild = askAIToBuild;
window.setStudioTool = setStudioTool;
window.setRibbonTab = setRibbonTab;
window.playRandom = () => {
  const random = games[Math.floor(Math.random() * games.length)];
  openGame(random.id);
};

// Keyboard listener for Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selectedGame) {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      closeGame();
    }
  }
});

// Start the app
init();
