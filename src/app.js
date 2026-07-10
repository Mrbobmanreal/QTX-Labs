/* eslint-disable */
let gamesData = [];
let currentCategory = 'All';

function $id(id) {
    return document.getElementById(id);
}

window.showMsg = function (text) {
    const layer = $id('msg-layer');
    const txt = $id('msg-text');
    if (layer && txt) {
        txt.innerText = text;
        layer.hidden = false;
        setTimeout(() => {
            layer.hidden = true;
        }, 2500);
    }
};

window.launchGame = function (iframeUrl, title) {
    window.playWebGame(iframeUrl, title);
};

async function loadGamesPortal() {
    const grid = $id('games-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500 font-mono">
            <span class="inline-block animate-spin mr-2 border-2 border-[#00ff00] border-t-transparent w-4 h-4 rounded-full align-middle"></span>
            Acquiring premium games inventory...
        </div>
    `;

    try {
        const response = await fetch('/src/games.json');
        if (!response.ok) throw new Error("HTTP Status " + response.status);
        const data = await response.json();
        
        // Filter out Nintendo DS emulator / ROM files
        gamesData = data.filter(game => 
            game.category !== 'Nintendo DS' && 
            game.iframeUrl !== 'EMULATOR_CONSOLE' && 
            !game.iframeUrl.endsWith('.nds')
        );
        
        renderGames();
    } catch (err) {
        console.error("Failed to load games list:", err);
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500 font-mono">
                Failed to load unblocked games: ${err.message}
            </div>
        `;
    }
}

function renderGames() {
    const grid = $id('games-grid');
    const searchVal = ($id('game-search')?.value || '').toLowerCase();

    if (!grid) return;
    grid.innerHTML = '';

    const filtered = gamesData.filter(game => {
        const matchesCategory = currentCategory === 'All' || game.category === currentCategory;
        const matchesSearch = game.title.toLowerCase().includes(searchVal) || 
                              game.description.toLowerCase().includes(searchVal) ||
                              game.category.toLowerCase().includes(searchVal);
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500 font-mono">
                No games found matching the current criteria.
            </div>
        `;
        return;
    }

    filtered.forEach(game => {
        const card = document.createElement('div');
        card.className = "group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f15]/80 flex flex-col justify-between transition-all duration-300 hover:border-[#00ff00]/40 hover:bg-[#14141c] hover:shadow-[0_0_25px_rgba(0,255,0,0.06)]";
        
        const thumbnail = game.thumbnail || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250";
        const escapedTitle = game.title.replace(/'/g, "\\'");
        const escapedIframeUrl = game.iframeUrl.replace(/'/g, "\\'");

        card.innerHTML = `
            <div>
                <!-- Image container -->
                <div class="relative w-full aspect-video overflow-hidden border-b border-white/5 bg-black">
                    <img src="${thumbnail}" alt="${game.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer">
                    <span class="absolute top-3 left-3 text-[9px] font-mono font-bold text-white bg-black/80 border border-white/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        ${game.category}
                    </span>
                </div>
                <!-- Content -->
                <div class="p-5">
                    <h3 class="text-base font-bold text-white tracking-tight transition-colors group-hover:text-[#00ff00] font-mono">
                        ${game.title}
                    </h3>
                    <p class="text-xs text-gray-400 mt-2 font-sans line-clamp-3 leading-relaxed">
                        ${game.description}
                    </p>
                </div>
            </div>
            <!-- Action Footer -->
            <div class="p-5 pt-0 mt-auto border-t border-white/[0.02] flex items-center justify-between">
                <span class="text-[10px] font-mono text-gray-500">Unblocked Portal</span>
                <button onclick="window.launchGame('${escapedIframeUrl}', '${escapedTitle}')" class="bg-[#00ff00]/10 border border-[#00ff00]/20 hover:bg-[#00ff00] hover:text-black hover:border-transparent text-[#00ff00] text-xs font-bold font-mono px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5">
                    PLAY NOW &rarr;
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.selectCategory = function (category) {
    currentCategory = category;
    
    // Update pills styling
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
        const text = pill.innerText.trim();
        const isMatch = text.toLowerCase() === category.toLowerCase();
        if (isMatch) {
            pill.className = "category-pill active bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all";
        } else {
            pill.className = "category-pill bg-white/5 border border-white/5 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all hover:text-white hover:bg-white/10";
        }
    });

    renderGames();
};

window.filterGames = function () {
    renderGames();
};

window.playWebGame = function (iframeUrl, title) {
    const container = $id('game-player-container');
    const iframe = $id('game-iframe');
    const titleEl = $id('game-player-title');
    const loader = $id('game-iframe-loader');
    const externalLink = $id('game-external-link');
    const connectionHint = $id('iframe-connection-hint');

    if (!container || !iframe) return;

    titleEl.innerText = title;
    container.hidden = false;
    if (loader) loader.style.display = 'flex';

    // Update external open-in-new-tab link href
    if (externalLink) {
        externalLink.href = iframeUrl;
    }

    // Toggle connection hint visibility for external web URLs (like gloomy.site)
    if (connectionHint) {
        const isExternal = iframeUrl.startsWith('http://') || iframeUrl.startsWith('https://');
        if (isExternal) {
            connectionHint.classList.remove('hidden');
        } else {
            connectionHint.classList.add('hidden');
        }
    }

    // Show loading spinner while loading
    iframe.src = iframeUrl;
    iframe.onload = function() {
        if (loader) loader.style.display = 'none';
    };
};

window.closeWebGame = function () {
    const container = $id('game-player-container');
    const iframe = $id('game-iframe');

    if (!container || !iframe) return;

    container.hidden = true;
    iframe.src = 'about:blank'; // Stop audio/video playing in background
};

window.reloadWebGame = function () {
    const iframe = $id('game-iframe');
    const loader = $id('game-iframe-loader');
    if (iframe && iframe.src && iframe.src !== 'about:blank') {
        if (loader) loader.style.display = 'flex';
        iframe.contentWindow.location.reload();
    }
};

window.toggleWebGameFullscreen = function () {
    const iframe = $id('game-iframe');
    if (!iframe) return;
    if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
    } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
    } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
    }
};

// Start load
loadGamesPortal();
