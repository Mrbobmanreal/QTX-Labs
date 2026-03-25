// Unblocked Games Hub - Vanilla JS Implementation
// This version runs directly in the browser without any build step.

let games = [];
let filteredGames = [];
let searchQuery = '';
let selectedGame = null;
let isFullScreen = false;

async function init() {
  try {
    const response = await fetch('./src/games.json');
    games = await response.json();
    filteredGames = [...games];
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
  filteredGames = games.filter(game => 
    game.title.toLowerCase().includes(searchQuery) ||
    game.description.toLowerCase().includes(searchQuery)
  );
  renderGrid();
}

function openGame(gameId) {
  selectedGame = games.find(g => g.id === gameId);
  renderModal();
}

function closeGame() {
  selectedGame = null;
  isFullScreen = false;
  renderModal();
}

function toggleFullScreen() {
  isFullScreen = !isFullScreen;
  renderModal();
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-[#00ff00] selection:text-black">
      <!-- Header -->
      <header class="border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 cursor-pointer" onclick="window.location.reload()">
            <div class="w-8 h-8 bg-[#00ff00] rounded flex items-center justify-center text-black">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
            </div>
            <h1 class="text-xl font-bold tracking-tighter uppercase italic">Unblocked Hub</h1>
          </div>

          <div class="flex-1 max-w-md relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              id="search-input"
              type="text"
              placeholder="Search games..."
              class="w-full bg-[#1a1a1a] border border-[#333] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-[#00ff00] transition-colors text-sm"
            />
          </div>

          <div class="hidden sm:flex items-center gap-4 text-xs font-mono uppercase text-[#666]">
            <span id="game-count">${filteredGames.length} Games</span>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- Hero Section -->
        <section id="hero-section" class="mb-12">
          <div class="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#222] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
            <div class="relative z-10 max-w-2xl">
              <h2 class="text-4xl sm:text-6xl font-black uppercase italic leading-none mb-4">
                Play Anywhere. <br />
                <span class="text-[#00ff00]">No Limits.</span>
              </h2>
              <p class="text-[#888] text-lg mb-8">
                The ultimate collection of unblocked web games. Fast, free, and always accessible.
              </p>
              <button 
                onclick="window.playRandom()"
                class="bg-[#00ff00] text-black px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:scale-105 transition-transform flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
                Random Game
              </button>
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
      </main>

      <!-- Game Player Modal -->
      <div id="modal-container" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-sm">
        <!-- Modal content will be rendered here -->
      </div>

      <!-- Footer -->
      <footer class="border-t border-[#222] py-12 mt-20">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-8">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-[#00ff00] rounded flex items-center justify-center text-black">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
            </div>
            <span class="font-bold uppercase tracking-tighter italic">Unblocked Hub</span>
          </div>
          
          <div class="flex gap-8 text-sm font-mono uppercase text-[#666]">
            <a href="#" class="hover:text-[#00ff00] transition-colors">Privacy</a>
            <a href="#" class="hover:text-[#00ff00] transition-colors">Terms</a>
            <a href="#" class="hover:text-[#00ff00] transition-colors">Contact</a>
          </div>

          <p class="text-[#444] text-xs font-mono uppercase">
            &copy; 2026 Unblocked Games Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  `;

  document.getElementById('search-input').addEventListener('input', handleSearch);
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('game-grid');
  const emptyState = document.getElementById('empty-state');
  const hero = document.getElementById('hero-section');
  const count = document.getElementById('game-count');

  count.innerText = `${filteredGames.length} Games`;

  if (searchQuery !== '') {
    hero.classList.add('hidden');
  } else {
    hero.classList.remove('hidden');
  }

  if (filteredGames.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    grid.innerHTML = filteredGames.map(game => `
      <div
        onclick="window.openGame('${game.id}')"
        class="group cursor-pointer bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#00ff00]/50 transition-all shadow-lg hover:shadow-[#00ff00]/10"
      >
        <div class="aspect-video relative overflow-hidden">
          <img
            src="${game.thumbnail}"
            alt="${game.title}"
            referrerPolicy="no-referrer"
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div class="bg-[#00ff00] text-black p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
            </div>
          </div>
        </div>
        <div class="p-4">
          <h3 class="font-bold text-lg mb-1 group-hover:text-[#00ff00] transition-colors">${game.title}</h3>
          <p class="text-[#666] text-sm line-clamp-2">${game.description}</p>
        </div>
      </div>
    `).join('');
  }
}

function renderModal() {
  const container = document.getElementById('modal-container');
  if (!selectedGame) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = `
    <div
      class="bg-[#111] border border-[#333] rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${isFullScreen ? 'w-full h-full' : 'w-full max-w-5xl aspect-video'}"
    >
      <!-- Toolbar -->
      <div class="p-4 border-b border-[#222] flex items-center justify-between bg-[#1a1a1a]">
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
          <button 
            onclick="window.toggleFullScreen()"
            class="p-2 hover:bg-[#333] rounded-lg transition-colors text-[#888] hover:text-white"
            title="Toggle Fullscreen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
          </button>
          <a 
            href="${selectedGame.iframeUrl}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="p-2 hover:bg-[#333] rounded-lg transition-colors text-[#888] hover:text-white"
            title="Open in New Tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
          <div class="w-px h-6 bg-[#333] mx-2" />
          <button 
            onclick="window.closeGame()"
            class="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors text-[#888]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <!-- Iframe Container -->
      <div class="flex-1 bg-black relative">
        <iframe
          src="${selectedGame.iframeUrl}"
          class="w-full h-full border-none"
          title="${selectedGame.title}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  `;
}

// Global functions for onclick handlers
window.openGame = openGame;
window.closeGame = closeGame;
window.toggleFullScreen = toggleFullScreen;
window.playRandom = () => {
  const random = games[Math.floor(Math.random() * games.length)];
  openGame(random.id);
};

// Start the app
init();
