/* eslint-disable */
let gamesData = [];
let currentCategory = 'All';
let currentPage = 1;
const GAMES_PER_PAGE = 24;

let favoritesList = [];
try {
    favoritesList = JSON.parse(localStorage.getItem('qtx-favorites') || '[]');
} catch (e) {
    console.error("Failed to load favorites list:", e);
}

function isFavorited(id) {
    return favoritesList.includes(String(id));
}

window.toggleFavorite = function (id, event) {
    if (event) {
        event.stopPropagation();
    }
    id = String(id);
    const index = favoritesList.indexOf(id);
    if (index === -1) {
        favoritesList.push(id);
        window.showMsg("Added to Favorites!");
    } else {
        favoritesList.splice(index, 1);
        window.showMsg("Removed from Favorites!");
    }
    localStorage.setItem('qtx-favorites', JSON.stringify(favoritesList));
    renderGames();
};

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

function renderCategories() {
    const filters = $id('category-filters');
    if (!filters) return;

    // Get unique categories from gamesData
    const categories = new Set();
    gamesData.forEach(game => {
        if (game.category) {
            categories.add(game.category);
        }
    });

    const sortedCategories = Array.from(categories).sort((a, b) => a.localeCompare(b));

    let html = `<button onclick="window.selectCategory('All')" class="category-pill active bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all">ALL</button>`;
    
    // Add dedicated Favorites category
    html += `<button onclick="window.selectCategory('Favorites')" class="category-pill bg-white/5 border border-white/5 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all hover:text-white hover:bg-white/10">❤️ FAVORITES</button>`;
    
    sortedCategories.forEach(cat => {
        html += `<button onclick="window.selectCategory('${cat.replace(/'/g, "\\'")}')" class="category-pill bg-white/5 border border-white/5 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all hover:text-white hover:bg-white/10">${cat.toUpperCase()}</button>`;
    });

    filters.innerHTML = html;
}

function updateRosterStats() {
    const statsTotal = $id('stats-total-games');
    const statsCategories = $id('stats-total-categories');
    
    if (!statsTotal) return;
    
    const uniqueCats = new Set();
    gamesData.forEach(g => {
        if (g.category) uniqueCats.add(g.category);
    });
    
    statsTotal.innerText = gamesData.length;
    statsCategories.innerText = uniqueCats.size || 1;
}

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
        const response = await fetch('./src/games.json');
        if (!response.ok) throw new Error("HTTP Status " + response.status);
        const data = await response.json();
        
        // Filter out Nintendo DS emulator / ROM files
        const baseGames = data.filter(game => 
            game.category !== 'Nintendo DS' && 
            game.iframeUrl !== 'EMULATOR_CONSOLE' && 
            !game.iframeUrl.endsWith('.nds')
        );

        // Load custom imported games from localStorage
        let customGames = [];
        try {
            customGames = JSON.parse(localStorage.getItem('qtx-custom-games') || '[]');
        } catch (e) {
            console.error("Failed to load local custom games:", e);
        }

        // Merge standard + custom games
        gamesData = [...customGames, ...baseGames];
        
        // Update live inventory count
        const countEl = $id('inventory-count');
        if (countEl) {
            countEl.innerText = `${gamesData.length} Premium High-Performance Unblocked Games`;
        }
        
        renderCategories();
        renderGames();
        updateRosterStats();
    } catch (err) {
        console.error("Failed to load games list:", err);
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500 font-mono">
                Failed to load unblocked games: ${err.message}
            </div>
        `;
    }
}

function renderPaginationControls(totalResults, totalPages) {
    const startSpan = $id('pagination-start');
    const endSpan = $id('pagination-end');
    const totalSpan = $id('pagination-total');
    const buttonsContainer = $id('pagination-buttons');
    const controlsContainer = $id('pagination-controls');

    if (!startSpan || !endSpan || !totalSpan || !buttonsContainer || !controlsContainer) return;

    if (totalResults === 0) {
        controlsContainer.classList.add('hidden');
        return;
    } else {
        controlsContainer.classList.remove('hidden');
    }

    const startIndex = (currentPage - 1) * GAMES_PER_PAGE + 1;
    const endIndex = Math.min(currentPage * GAMES_PER_PAGE, totalResults);

    startSpan.innerText = startIndex;
    endSpan.innerText = endIndex;
    totalSpan.innerText = totalResults;

    let html = '';

    // Prev Button
    if (currentPage > 1) {
        html += `<button onclick="window.changePage(${currentPage - 1})" class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-lg transition-all cursor-pointer font-bold select-none">&larr; PREV</button>`;
    } else {
        html += `<button disabled class="px-2.5 py-1.5 bg-white/[0.02] text-gray-600 border border-white/5 rounded-lg font-bold opacity-50 cursor-not-allowed select-none">&larr; PREV</button>`;
    }

    // Page Buttons (Limit shown pages to max 5 around current)
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="window.changePage(1)" class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-lg transition-all cursor-pointer font-bold select-none">1</button>`;
        if (startPage > 2) {
            html += `<span class="text-gray-600 px-1 font-bold select-none">...</span>`;
        }
    }

    for (let p = startPage; p <= endPage; p++) {
        if (p === currentPage) {
            html += `<button class="px-3 py-1.5 bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] rounded-lg font-bold transition-all select-none">${p}</button>`;
        } else {
            html += `<button onclick="window.changePage(${p})" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-lg transition-all cursor-pointer font-bold select-none">${p}</button>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="text-gray-600 px-1 font-bold select-none">...</span>`;
        }
        html += `<button onclick="window.changePage(${totalPages})" class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-lg transition-all cursor-pointer font-bold select-none">${totalPages}</button>`;
    }

    // Next Button
    if (currentPage < totalPages) {
        html += `<button onclick="window.changePage(${currentPage + 1})" class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-lg transition-all cursor-pointer font-bold select-none">NEXT &rarr;</button>`;
    } else {
        html += `<button disabled class="px-2.5 py-1.5 bg-white/[0.02] text-gray-600 border border-white/5 rounded-lg font-bold opacity-50 cursor-not-allowed select-none">NEXT &rarr;</button>`;
    }

    buttonsContainer.innerHTML = html;
}

window.changePage = function (page) {
    currentPage = page;
    renderGames();
    $id('category-filters')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

function renderGames() {
    const grid = $id('games-grid');
    const searchVal = ($id('game-search')?.value || '').toLowerCase();

    if (!grid) return;
    grid.innerHTML = '';

    const filtered = gamesData.filter(game => {
        const matchesCategory = currentCategory === 'All' || 
                                (currentCategory === 'Favorites' ? isFavorited(game.id) : game.category === currentCategory);
        const matchesSearch = game.title.toLowerCase().includes(searchVal) || 
                              (game.description || '').toLowerCase().includes(searchVal) ||
                              (game.category || '').toLowerCase().includes(searchVal);
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500 font-mono">
                No games found matching the current criteria.
            </div>
        `;
        renderPaginationControls(0, 1);
        return;
    }

    const totalPages = Math.ceil(filtered.length / GAMES_PER_PAGE) || 1;
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    const paginatedGames = filtered.slice((currentPage - 1) * GAMES_PER_PAGE, currentPage * GAMES_PER_PAGE);

    paginatedGames.forEach(game => {
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
                    <button onclick="window.toggleFavorite('${game.id}', event)" class="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 text-gray-400 hover:text-red-500 transition-all cursor-pointer z-10" title="Toggle Favorite">
                        ${isFavorited(game.id) 
                            ? `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`
                            : `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white hover:text-red-500 fill-none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`
                        }
                    </button>
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

    renderPaginationControls(filtered.length, totalPages);
}

window.selectCategory = function (category) {
    currentCategory = category;
    currentPage = 1;
    
    // Update pills styling
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
        const text = pill.innerText.trim();
        const isMatch = text.toLowerCase() === category.toLowerCase() || 
                        (category === 'Favorites' && text.includes('FAVORITES')) ||
                        (category === 'All' && text.toLowerCase() === 'all');
        if (isMatch) {
            pill.className = "category-pill active bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all";
        } else {
            pill.className = "category-pill bg-white/5 border border-white/5 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all hover:text-white hover:bg-white/10";
        }
    });

    renderGames();
};

window.filterGames = function () {
    currentPage = 1;
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

    // Check if URL is a CDN raw HTML file (like GN-Math games from JSDelivr)
    const isCdnHtml = (iframeUrl.startsWith('http://') || iframeUrl.startsWith('https://')) && 
                      (iframeUrl.includes('jsdelivr.net') || 
                       iframeUrl.includes('raw.githubusercontent.com') || 
                       iframeUrl.includes('rawcdn.githack.com')) &&
                      (iframeUrl.includes('.html') || iframeUrl.includes('.htm'));

    if (isCdnHtml) {
        iframe._lastFetchedUrl = iframeUrl;
        iframe.src = `/api/raw-proxy?url=${encodeURIComponent(iframeUrl)}`;
        iframe.onload = function() {
            if (loader) loader.style.display = 'none';
        };
    } else {
        iframe._lastFetchedUrl = null;
        iframe.src = iframeUrl;
        iframe.onload = function() {
            if (loader) loader.style.display = 'none';
        };
    }
};

window.closeWebGame = function () {
    const container = $id('game-player-container');
    const iframe = $id('game-iframe');

    if (!container || !iframe) return;

    container.hidden = true;
    iframe._lastFetchedUrl = null;
    iframe.src = 'about:blank'; // Stop audio/video playing in background
};

window.reloadWebGame = function () {
    const iframe = $id('game-iframe');
    const loader = $id('game-iframe-loader');
    if (iframe) {
        if (iframe._lastFetchedUrl) {
            window.playWebGame(iframe._lastFetchedUrl, $id('game-player-title').innerText);
        } else if (iframe.src && iframe.src !== 'about:blank') {
            if (loader) loader.style.display = 'flex';
            iframe.contentWindow.location.reload();
        }
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

// --- NAVIGATION TAB SWITCHER LOGIC ---
window.switchTab = function (tabName) {
    // Hide all tab views
    const tabViews = document.querySelectorAll('.tab-view');
    tabViews.forEach(view => {
        view.classList.add('hidden');
    });

    // Show selected view
    const selectedView = document.getElementById(`view-${tabName}`);
    if (selectedView) {
        selectedView.classList.remove('hidden');
    }

    // Update navigation buttons active states
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        const isSelected = btn.id === `tab-${tabName}`;
        if (isSelected) {
            btn.classList.add('active');
            if (document.body.classList.contains('light-theme')) {
                btn.className = "tab-btn active px-4 py-2 rounded-lg font-bold transition-all text-[#047857] bg-white cursor-pointer";
            } else {
                btn.className = "tab-btn active px-4 py-2 rounded-lg font-bold transition-all text-[#00ff00] bg-white/10 cursor-pointer";
            }
        } else {
            btn.classList.remove('active');
            btn.className = "tab-btn px-4 py-2 rounded-lg font-bold transition-all text-gray-400 hover:text-white cursor-pointer";
        }
    });

    window.showMsg(`Switched to ${tabName.toUpperCase()} view`);
};

// --- LIGHT/DARK THEME SELECTOR LOGIC ---
window.setTheme = function (themeName) {
    const body = document.body;
    const btnDark = document.getElementById('theme-btn-dark');
    const btnLight = document.getElementById('theme-btn-light');

    if (themeName === 'light') {
        body.classList.add('light-theme');
        localStorage.setItem('qtx-theme', 'light');

        // Style the buttons
        if (btnDark && btnLight) {
            btnDark.className = "px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all text-gray-400 hover:text-white cursor-pointer";
            btnLight.className = "px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all text-[#047857] bg-white shadow-md cursor-pointer";
        }
    } else {
        body.classList.remove('light-theme');
        localStorage.setItem('qtx-theme', 'dark');

        // Style the buttons
        if (btnDark && btnLight) {
            btnDark.className = "px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all text-[#00ff00] bg-white/10 cursor-pointer";
            btnLight.className = "px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all text-gray-400 hover:text-white cursor-pointer";
        }
    }

    // Refresh active tab button styling to match new theme
    const activeTabBtn = document.querySelector('.tab-btn.active');
    if (activeTabBtn) {
        const tabName = activeTabBtn.id.replace('tab-', '');
        if (themeName === 'light') {
            activeTabBtn.className = "tab-btn active px-4 py-2 rounded-lg font-bold transition-all text-[#047857] bg-white cursor-pointer";
        } else {
            activeTabBtn.className = "tab-btn active px-4 py-2 rounded-lg font-bold transition-all text-[#00ff00] bg-white/10 cursor-pointer";
        }
    }

    window.showMsg(`Theme updated to ${themeName.toUpperCase()}`);
};

// --- LOCAL DATA SAVES MANAGEMENT ---
window.clearAllPortalSaves = function () {
    if (confirm("Are you sure you want to delete all local game saves and settings? This cannot be undone.")) {
        localStorage.clear();
        window.showMsg("All local data and saves successfully wiped!");
        setTimeout(() => {
            window.location.reload();
        }, 1200);
    }
};

// --- DATA EXPORT & DOWNLOAD CHANNELS ---
window.downloadWebDataJSON = function() {
    try {
        const jsonStr = JSON.stringify(gamesData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qtx_games_catalog.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showMsg("Games metadata JSON file download started!");
    } catch (err) {
        console.error("Export JSON failed:", err);
        alert("Failed to export game JSON file.");
    }
};

window.downloadProxyLinksTXT = function() {
    try {
        let txt = "=========================================================\n";
        txt += "   QTX LABS PORTAL - UNBLOCKED WEB GAMES DIRECTORY\n";
        txt += `   Exported: ${new Date().toLocaleString()}\n`;
        txt += "=========================================================\n\n";
        
        gamesData.forEach((game, index) => {
            txt += `${index + 1}. [${(game.category || 'Arcade').toUpperCase()}] ${game.title}\n`;
            txt += `   Description : ${game.description || 'No description'}\n`;
            txt += `   Unblocked URL: ${game.iframeUrl}\n\n`;
        });
        
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qtx_unblocked_links.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showMsg("Unblocked proxy link text registry downloaded!");
    } catch (err) {
        console.error("Export TXT failed:", err);
        alert("Failed to export registry text file.");
    }
};

// --- INITIALIZE PORTAL SYSTEM ---
// --- WALLPAPER AND CORNER SPRITE COMPANION CUSTOMIZATION ENGINE ---
const PRESET_WALLPAPERS = {
    cosmic: 'radial-gradient(circle at top, #0e0e16, #050508, #010103)',
    cybergrid: 'linear-gradient(rgba(0, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.04) 1px, transparent 1px)',
    vaporwave: 'linear-gradient(135deg, #1f102f, #0d0614, #050209)',
    matrix: 'linear-gradient(rgba(0, 255, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.05) 1px, transparent 1px)'
};

const SPRITE_PRESETS = {
    invader: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZ2YTZwMXp4eWhtdjF6dHZzYmsxeHZoc2p4ajJrdmtncnk2ejZpeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/tIsmUIhS9S0tq/giphy.gif',
    coin: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHIyb2ZtY2U4dmVqZnRtbDcyNWsyODN4OGxidW5jMWtqbzRndDk3ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/S60bL6m76B9P2S1Oym/giphy.gif',
    fire_blue: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3g0YnRjZXptZXg5bms3cTNpODFkaTZ5N2o0eDZpM2szN2VrbnU2NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Xg0t8g0b27XgQx2p1D/giphy.gif',
    fire_green: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzgxaDkxMWp3ZncyMWR1ZWtpd3R0Ynk3YTAweTNxNHBtbTJnYTRjNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/mYpS8VfPHgSgU/giphy.gif',
    slime: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc29lOG50ZzdscXFidmZydnFqczNidHBpMWo1NW1kMHdtNjJxdTVreCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/gS7W67O2zRSuXjOas6/giphy.gif',
    bat: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWttcnEycXZmYno1bWp0NTRuNHB5cG5nbjNxMmdndzR2Z3J1MnloMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3oriffXF7e7uM2bVf2/giphy.gif',
    cube: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3QwdjQyZHRyODNocjI0OTNxNHpwNmswYTdmaDJld20yc25rdnpsNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/iY8ZreRzEdfkk/giphy.gif',
    none: ''
};

window.selectWallpaper = function(wpName) {
    const customContainer = document.getElementById('custom-wallpaper-container');
    const customInput = document.getElementById('custom-wallpaper-input');
    
    // Save selection
    localStorage.setItem('qtx-wallpaper-type', wpName);
    
    // Update active state class on buttons
    const presetKeys = ['cosmic', 'cybergrid', 'vaporwave', 'matrix', 'custom'];
    presetKeys.forEach(k => {
        const btn = document.getElementById(`wp-btn-${k}`);
        if (btn) {
            if (k === wpName) {
                btn.className = "px-3 py-2.5 rounded-lg border text-center transition-all font-mono text-xs font-bold cursor-pointer bg-[#00ff00]/10 border-[#00ff00]/30 text-[#00ff00]";
            } else {
                btn.className = "px-3 py-2.5 rounded-lg border text-center transition-all font-mono text-xs font-bold cursor-pointer bg-black/40 border-white/10 text-gray-300 hover:text-[#00ff00] hover:border-[#00ff00]/30";
            }
        }
    });

    if (wpName === 'custom') {
        if (customContainer) customContainer.classList.remove('hidden');
        const storedUrl = localStorage.getItem('qtx-wallpaper-custom-url') || '';
        if (customInput) {
            if (storedUrl.startsWith('data:')) {
                customInput.value = "(Local File / Imported Image)";
            } else {
                customInput.value = storedUrl;
            }
        }
        applyBackgroundStyle('custom', storedUrl);
    } else {
        if (customContainer) customContainer.classList.add('hidden');
        applyBackgroundStyle(wpName);
    }
};

function applyBackgroundStyle(type, customUrl = '') {
    const welcome = document.getElementById('welcome');
    if (!welcome) return;

    // Reset styles
    welcome.style.backgroundColor = '';
    welcome.style.backgroundImage = '';
    welcome.style.backgroundSize = '';
    welcome.style.backgroundRepeat = '';
    welcome.style.backgroundPosition = '';
    welcome.style.backgroundAttachment = '';

    if (type === 'cosmic') {
        welcome.style.backgroundImage = PRESET_WALLPAPERS.cosmic;
    } else if (type === 'cybergrid') {
        welcome.style.backgroundColor = '#05050a';
        welcome.style.backgroundImage = PRESET_WALLPAPERS.cybergrid;
        welcome.style.backgroundSize = '40px 40px';
    } else if (type === 'vaporwave') {
        welcome.style.backgroundImage = PRESET_WALLPAPERS.vaporwave;
        welcome.style.backgroundSize = 'cover';
        welcome.style.backgroundPosition = 'center';
        welcome.style.backgroundAttachment = 'fixed';
    } else if (type === 'matrix') {
        welcome.style.backgroundColor = '#020202';
        welcome.style.backgroundImage = PRESET_WALLPAPERS.matrix;
        welcome.style.backgroundSize = '20px 20px';
    } else if (type === 'custom' && customUrl) {
        welcome.style.backgroundImage = `url('${customUrl}')`;
        welcome.style.backgroundSize = 'cover';
        welcome.style.backgroundPosition = 'center';
        welcome.style.backgroundAttachment = 'fixed';
        welcome.style.backgroundRepeat = 'no-repeat';
    } else {
        welcome.style.backgroundImage = PRESET_WALLPAPERS.cosmic;
    }
}

window.handleWallpaperFileSelect = function(event) {
    const file = (event.target && event.target.files) ? event.target.files[0] : event;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        window.showMsg("Please select an image file (PNG, JPG, GIF, WEBP)!");
        return;
    }

    if (file.size > 3.5 * 1024 * 1024) {
        window.showMsg("Wallpaper file is too large! Please import an image smaller than 3.5MB to save securely.");
        return;
    }

    const dragText = document.getElementById('wp-drag-text');
    if (dragText) {
        dragText.innerText = "⏳ Processing image...";
        dragText.className = "text-xs text-yellow-400 font-mono";
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        try {
            localStorage.setItem('qtx-wallpaper-custom-url', dataUrl);
            localStorage.setItem('qtx-wallpaper-type', 'custom');

            const customInput = document.getElementById('custom-wallpaper-input');
            if (customInput) customInput.value = "(Local File / Imported Image)";

            applyBackgroundStyle('custom', dataUrl);

            if (dragText) {
                dragText.innerText = "✅ Wallpaper Imported!";
                dragText.className = "text-xs text-[#00ff00] font-mono font-bold";
            }

            window.showMsg("🌌 Custom wallpaper imported successfully!");
        } catch (err) {
            console.error("Local storage quota exceeded or failed:", err);
            window.showMsg("❌ Failed to save wallpaper. Please try a smaller or more compressed image file!");
            if (dragText) {
                dragText.innerText = "📁 Select Wallpaper Image";
                dragText.className = "text-xs text-gray-300 font-mono";
            }
        }
    };
    reader.readAsDataURL(file);
};

window.applyCustomWallpaper = function(url) {
    if (!url) return;
    localStorage.setItem('qtx-wallpaper-custom-url', url);
    applyBackgroundStyle('custom', url);
};

window.clearCustomWallpaper = function() {
    const customInput = document.getElementById('custom-wallpaper-input');
    if (customInput) customInput.value = '';
    
    const fileInput = document.getElementById('wallpaper-file-input');
    if (fileInput) fileInput.value = '';

    const dragText = document.getElementById('wp-drag-text');
    if (dragText) {
        dragText.innerText = "📁 Select Wallpaper Image";
        dragText.className = "text-xs text-gray-300 font-mono";
    }

    localStorage.removeItem('qtx-wallpaper-custom-url');
    window.selectWallpaper('cosmic');
};

window.changeLeftSprite = function(val) {
    const customContainer = document.getElementById('custom-left-sprite-container');
    const customInput = document.getElementById('custom-left-sprite-input');
    
    localStorage.setItem('qtx-left-sprite', val);
    
    if (val === 'custom') {
        if (customContainer) customContainer.classList.remove('hidden');
        const stored = localStorage.getItem('qtx-left-sprite-custom-url') || '';
        if (customInput) customInput.value = stored;
        updateCornerSprite('left', 'custom', stored);
    } else {
        if (customContainer) customContainer.classList.add('hidden');
        updateCornerSprite('left', val);
    }
};

window.applyCustomLeftSprite = function(url) {
    if (!url) return;
    localStorage.setItem('qtx-left-sprite-custom-url', url);
    updateCornerSprite('left', 'custom', url);
};

window.changeRightSprite = function(val) {
    const customContainer = document.getElementById('custom-right-sprite-container');
    const customInput = document.getElementById('custom-right-sprite-input');
    
    localStorage.setItem('qtx-right-sprite', val);
    
    if (val === 'custom') {
        if (customContainer) customContainer.classList.remove('hidden');
        const stored = localStorage.getItem('qtx-right-sprite-custom-url') || '';
        if (customInput) customInput.value = stored;
        updateCornerSprite('right', 'custom', stored);
    } else {
        if (customContainer) customContainer.classList.add('hidden');
        updateCornerSprite('right', val);
    }
};

window.applyCustomRightSprite = function(url) {
    if (!url) return;
    localStorage.setItem('qtx-right-sprite-custom-url', url);
    updateCornerSprite('right', 'custom', url);
};

function updateCornerSprite(side, type, customUrl = '') {
    const el = document.getElementById(`corner-companion-${side}`);
    if (!el) return;
    
    el.innerHTML = '';
    
    let url = '';
    if (type === 'custom') {
        url = customUrl;
    } else {
        url = SPRITE_PRESETS[type] || '';
    }
    
    if (!url) {
        el.classList.add('hidden');
        const badge = document.getElementById(`${side}-sprite-preview-badge`);
        if (badge) {
            badge.innerText = 'Hidden';
            badge.className = 'text-[10px] text-gray-500 font-mono';
        }
        return;
    }
    
    el.classList.remove('hidden');
    el.innerHTML = `<img src="${url}" class="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,255,0,0.35)]" alt="${side} corner sprite">`;
    const badge = document.getElementById(`${side}-sprite-preview-badge`);
    if (badge) {
        badge.innerText = type === 'custom' ? 'Custom' : type.toUpperCase();
        badge.className = 'text-[10px] text-[#00ff00] font-mono font-bold';
    }
}

function initWallpaperDragAndDrop() {
    const dragZone = document.getElementById('wallpaper-drag-zone');
    if (!dragZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dragZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dragZone.addEventListener(eventName, () => {
            dragZone.classList.add('border-[#00ff00]/60', 'bg-black/50');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dragZone.addEventListener(eventName, () => {
            dragZone.classList.remove('border-[#00ff00]/60', 'bg-black/50');
        }, false);
    });

    dragZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            window.handleWallpaperFileSelect(files[0]);
        }
    });
}

function initPortalSystem() {
    // Restore Saved Theme
    const savedTheme = localStorage.getItem('qtx-theme') || 'dark';
    window.setTheme(savedTheme);

    // Restore Saved Wallpaper
    const savedWallpaper = localStorage.getItem('qtx-wallpaper-type') || 'cosmic';
    window.selectWallpaper(savedWallpaper);

    // Initialize Wallpaper Drag & Drop Area
    initWallpaperDragAndDrop();

    // Restore Saved Left Sprite
    const savedLeftSprite = localStorage.getItem('qtx-left-sprite') || 'invader';
    const leftSelect = document.getElementById('left-sprite-select');
    if (leftSelect) {
        leftSelect.value = savedLeftSprite;
    }
    window.changeLeftSprite(savedLeftSprite);

    // Restore Saved Right Sprite
    const savedRightSprite = localStorage.getItem('qtx-right-sprite') || 'fire_blue';
    const rightSelect = document.getElementById('right-sprite-select');
    if (rightSelect) {
        rightSelect.value = savedRightSprite;
    }
    window.changeRightSprite(savedRightSprite);

    // Randomize cache latency display in Settings for realism
    const latencyEl = document.getElementById('cache-latency');
    if (latencyEl) {
        latencyEl.innerText = (Math.random() * 0.15 + 0.05).toFixed(2) + "ms";
    }

    // Initialize statistics fields
    updateRosterStats();

    // Initialize real-time anonymous board
    initChatroom();
}

// --- REAL-TIME ANONYMOUS CHATROOM ---
let currentChatRoom = 'global';
let chatNickname = localStorage.getItem('qtx-chat-nickname') || ('Anon#' + Math.floor(1000 + Math.random() * 9000));
let chatPfp = localStorage.getItem('qtx-chat-pfp') || '👾';
let chatBanner = localStorage.getItem('qtx-chat-banner') || '';
let chatPin = localStorage.getItem('qtx-chat-pin') || '';
let chatDisplayName = localStorage.getItem('qtx-chat-display-name') || chatNickname;
let chatBio = localStorage.getItem('qtx-chat-bio') || '🎮 Just exploring the unblocked retro gaming sandbox! 🔥';
window.mySentMessages = JSON.parse(localStorage.getItem('qtx-my-messages') || '[]');
let currentChatAttachment = null;
let currentChatAttachmentType = null; // 'image', 'video' or 'file'
let currentChatAttachmentName = null;
let currentChatAttachmentSize = null;
let chatRoomsList = { global: 0 };
let chatPollInterval = null;

// Track local PIN updates
window.updateLocalPin = function(val) {
    chatPin = val;
    localStorage.setItem('qtx-chat-pin', chatPin);
};

window.changeChatDisplayName = function(val) {
    const cleaned = val.trim();
    chatDisplayName = cleaned || chatNickname;
    localStorage.setItem('qtx-chat-display-name', chatDisplayName);
    updateChatIdentityUI();
};

window.changeChatBio = function(val) {
    const cleaned = val.trim();
    chatBio = cleaned || 'No bio written yet. 🎮';
    localStorage.setItem('qtx-chat-bio', chatBio);
    updateChatIdentityUI();
};

// Call backend to register and claim a name
window.claimUsername = async function() {
    if (!chatNickname || chatNickname.toLowerCase() === 'anonymous') {
        window.showMsg("Cannot protect generic 'Anonymous' name.");
        return;
    }
    if (!chatPin) {
        window.showMsg("Please enter a PIN/Access Key first!");
        return;
    }

    try {
        const response = await fetch('/api/chat/register-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: chatNickname, key: chatPin })
        });
        const data = await response.json();
        if (response.ok) {
            window.showMsg("✅ Name claimed & protected successfully!");
        } else {
            window.showMsg("❌ " + (data.error || "Failed to protect name."));
        }
    } catch (e) {
        console.error("Error claiming name:", e);
        window.showMsg("Server error trying to claim name.");
    }
};

// Call backend to delete a chat message
window.deleteChatMessage = async function(id) {
    if (!confirm("Are you sure you want to delete this message?")) return;
    const isSelfDelete = (window.mySentMessages || []).includes(id);
    try {
        const response = await fetch('/api/chat/delete-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isSelfDelete })
        });
        if (response.ok) {
            window.showMsg("🗑️ Message deleted successfully.");
            if (isSelfDelete) {
                window.mySentMessages = window.mySentMessages.filter(mId => mId !== id);
                localStorage.setItem('qtx-my-messages', JSON.stringify(window.mySentMessages));
            }
            fetchChatMessages();
        } else {
            const data = await response.json();
            window.showMsg("❌ " + (data.error || "Failed to delete message."));
        }
    } catch (e) {
        console.error("Error deleting message:", e);
        window.showMsg("Server error deleting message.");
    }
};

function initChatroom() {
    // Sync current nickname and pfp values on load
    updateChatIdentityUI();

    // Populate saved PIN inputs if available
    const pinInput = document.getElementById('profile-pin-input');
    if (pinInput) pinInput.value = chatPin;

    // Helper to process selected or dropped file
    function processSelectedFile(file) {
        if (!file) return;
        if (file.type.startsWith('image/')) {
            if (file.size > 2 * 1024 * 1024) {
                window.showMsg("Image must be smaller than 2MB!");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                currentChatAttachment = event.target.result;
                currentChatAttachmentType = 'image';
                currentChatAttachmentName = file.name;
                currentChatAttachmentSize = file.size;
                showChatImagePreview(currentChatAttachment, 'image');
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            if (file.size > 10 * 1024 * 1024) {
                window.showMsg("Video must be smaller than 10MB!");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                currentChatAttachment = event.target.result;
                currentChatAttachmentType = 'video';
                currentChatAttachmentName = file.name;
                currentChatAttachmentSize = file.size;
                showChatImagePreview(currentChatAttachment, 'video');
            };
            reader.readAsDataURL(file);
        } else {
            // Support general files
            if (file.size > 8 * 1024 * 1024) {
                window.showMsg("File must be smaller than 8MB!");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                currentChatAttachment = event.target.result;
                currentChatAttachmentType = 'file';
                currentChatAttachmentName = file.name;
                currentChatAttachmentSize = file.size;
                showChatImagePreview(currentChatAttachment, 'file');
            };
            reader.readAsDataURL(file);
        }
    }
    window.processSelectedFile = processSelectedFile;

    // Set up drag & drop listeners for chat attachment
    const dragZone = document.getElementById('image-drag-zone');
    if (dragZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dragZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dragZone.addEventListener(eventName, () => {
                dragZone.classList.add('border-[#00ff00]/60', 'bg-black/50');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dragZone.addEventListener(eventName, () => {
                dragZone.classList.remove('border-[#00ff00]/60', 'bg-black/50');
            }, false);
        });

        dragZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                processSelectedFile(files[0]);
            }
        });
    }

    // Set up emoji button insertions
    window.insertEmoji = function(emoji) {
        const msgInput = document.getElementById('chat-message-input');
        if (msgInput) {
            msgInput.value += emoji;
            msgInput.focus();
        }
    };

    // Load initial list and messages
    fetchChatRooms();
    fetchChatMessages();

    // Set up polling interval
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(() => {
        // Only fetch if the chat view is visible (to minimize background network activity)
        const chatView = document.getElementById('view-chat');
        if (chatView && !chatView.classList.contains('hidden')) {
            fetchChatMessages();
            fetchChatRooms();
        }
    }, 3000);
}

// Update Chat Identity UI across header, Discord-style sidebar, and settings previews
function updateChatIdentityUI() {
    const headerUsername = document.getElementById('chat-header-username');
    const headerAvatar = document.getElementById('chat-header-avatar');
    const previewAvatar = document.getElementById('chat-profile-avatar-preview');
    const profileNickInput = document.getElementById('profile-nick-input');
    const profileDisplayNameInput = document.getElementById('profile-display-name-input');
    const profileBioInput = document.getElementById('profile-bio-input');

    // Added elements for Discord bottom sidebar
    const discordSidebarDisplayName = document.getElementById('discord-sidebar-display-name');
    const discordSidebarUsername = document.getElementById('discord-sidebar-username');
    const discordSidebarAvatarContainer = document.getElementById('discord-sidebar-avatar-container');

    // Added elements for settings preview card
    const previewCardDisplayName = document.getElementById('preview-card-display-name');
    const previewCardUsername = document.getElementById('preview-card-username');
    const previewCardBio = document.getElementById('preview-card-bio');

    const cleanDisplay = chatDisplayName || chatNickname;

    if (headerUsername) headerUsername.innerText = cleanDisplay;
    if (profileNickInput) profileNickInput.value = chatNickname;
    if (profileDisplayNameInput) profileDisplayNameInput.value = chatDisplayName;
    if (profileBioInput) profileBioInput.value = chatBio;

    if (discordSidebarDisplayName) discordSidebarDisplayName.innerText = cleanDisplay;
    if (discordSidebarUsername) discordSidebarUsername.innerText = `@${chatNickname.toLowerCase()}`;

    if (previewCardDisplayName) previewCardDisplayName.innerText = cleanDisplay;
    if (previewCardUsername) previewCardUsername.innerText = `@${chatNickname.toLowerCase()}`;
    if (previewCardBio) previewCardBio.innerText = chatBio;

    const previewBanner = document.getElementById('preview-card-banner');
    if (previewBanner) {
        if (chatBanner) {
            previewBanner.style.backgroundImage = `url('${chatBanner}')`;
            previewBanner.style.backgroundSize = 'cover';
            previewBanner.style.backgroundPosition = 'center';
        } else {
            previewBanner.style.backgroundImage = '';
        }
    }

    // Check if the pfp is a URL or Base64 string
    const isUrl = chatPfp.startsWith('http://') || chatPfp.startsWith('https://') || chatPfp.startsWith('data:image/');
    
    if (headerAvatar) {
        if (isUrl) {
            headerAvatar.innerHTML = `<img src="${chatPfp}" class="w-5 h-5 rounded-full object-cover inline-block border border-white/10" alt="avatar" onerror="this.outerHTML='👾'">`;
        } else {
            headerAvatar.innerHTML = chatPfp;
        }
    }

    if (previewAvatar) {
        if (isUrl) {
            previewAvatar.innerHTML = `<img src="${chatPfp}" class="w-full h-full object-cover rounded" alt="avatar" onerror="this.innerHTML='👾'">`;
        } else {
            previewAvatar.innerText = chatPfp;
        }
    }

    if (discordSidebarAvatarContainer) {
        if (isUrl) {
            discordSidebarAvatarContainer.innerHTML = `
                <img src="${chatPfp}" class="w-full h-full object-cover rounded-lg" alt="avatar" onerror="this.outerHTML='👾'">
                <span class="absolute bottom-[-2px] right-[-2px] w-2.5 h-2.5 bg-emerald-400 border border-[#090a0f] rounded-full animate-pulse shadow-glow"></span>
            `;
        } else {
            discordSidebarAvatarContainer.innerHTML = `
                ${chatPfp}
                <span class="absolute bottom-[-2px] right-[-2px] w-2.5 h-2.5 bg-emerald-400 border border-[#090a0f] rounded-full animate-pulse shadow-glow"></span>
            `;
        }
    }
}

// Change user nickname (saves instantly to localStorage)
window.changeChatNickname = function(val) {
    const cleaned = val.trim();
    chatNickname = cleaned || 'Anonymous';
    localStorage.setItem('qtx-chat-nickname', chatNickname);
    
    // Auto-update display name if no custom display name has been set
    if (!localStorage.getItem('qtx-chat-display-name')) {
        chatDisplayName = chatNickname;
        const profileDisplayNameInput = document.getElementById('profile-display-name-input');
        if (profileDisplayNameInput) profileDisplayNameInput.value = chatDisplayName;
    }
    
    updateChatIdentityUI();
};

// Open Discord Settings Modal
window.openDiscordSettings = function() {
    const modal = document.getElementById('discord-settings-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        updateChatIdentityUI();
    }
};

// Close Discord Settings Modal
window.closeDiscordSettings = function() {
    const modal = document.getElementById('discord-settings-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Switch Settings Tabs
window.switchSettingsTab = function(tab) {
    const btnProfile = document.getElementById('btn-set-tab-profile');
    const btnProtection = document.getElementById('btn-set-tab-protection');
    const paneProfile = document.getElementById('settings-pane-profile');
    const paneProtection = document.getElementById('settings-pane-protection');
    
    if (tab === 'profile') {
        if (btnProfile) {
            btnProfile.className = "w-full text-left px-3 py-2 rounded-lg bg-[#00ff00]/10 text-[#00ff00] font-bold text-xs transition-all cursor-pointer flex items-center gap-2 border border-[#00ff00]/15";
        }
        if (btnProtection) {
            btnProtection.className = "w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs transition-all cursor-pointer flex items-center gap-2 border border-transparent";
        }
        if (paneProfile) paneProfile.classList.remove('hidden');
        if (paneProtection) paneProtection.classList.add('hidden');
    } else {
        if (btnProfile) {
            btnProfile.className = "w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs transition-all cursor-pointer flex items-center gap-2 border border-transparent";
        }
        if (btnProtection) {
            btnProtection.className = "w-full text-left px-3 py-2 rounded-lg bg-[#00ff00]/10 text-[#00ff00] font-bold text-xs transition-all cursor-pointer flex items-center gap-2 border border-[#00ff00]/15";
        }
        if (paneProfile) paneProfile.classList.add('hidden');
        if (paneProtection) paneProtection.classList.remove('hidden');
    }
};

// Key event listener for ESC to close settings
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeDiscordSettings();
    }
});

// Select standard Emoji avatar
window.selectPfpIcon = function(icon) {
    chatPfp = icon;
    localStorage.setItem('qtx-chat-pfp', chatPfp);
    updateChatIdentityUI();
    
    // Hide custom URL container
    const customContainer = document.getElementById('custom-pfp-container');
    if (customContainer) customContainer.classList.add('hidden');
};

// Toggle Custom PFP URL inputs
window.toggleCustomPfpInput = function() {
    const customContainer = document.getElementById('custom-pfp-container');
    if (customContainer) {
        customContainer.classList.toggle('hidden');
    }
};

// Apply Custom PFP image URL
window.applyCustomPfpUrl = function() {
    const input = document.getElementById('custom-pfp-url-input');
    if (!input) return;
    const url = input.value.trim();
    if (!url) {
        window.showMsg("Please enter a valid URL!");
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
        window.showMsg("URL must start with http:// or https://");
        return;
    }

    chatPfp = url;
    localStorage.setItem('qtx-chat-pfp', chatPfp);
    updateChatIdentityUI();
    window.showMsg("Custom avatar URL set successfully!");
};

// Handle file selector for profile picture (avatar) upload
window.handlePfpFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        window.showMsg("Please select an image file!");
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        window.showMsg("Avatar image must be smaller than 2MB!");
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        chatPfp = e.target.result;
        localStorage.setItem('qtx-chat-pfp', chatPfp);
        updateChatIdentityUI();
        window.showMsg("Profile picture uploaded successfully!");
    };
    reader.readAsDataURL(file);
};

// Select standard or animated GIF banner
window.selectChatBanner = function(url) {
    chatBanner = url;
    localStorage.setItem('qtx-chat-banner', chatBanner);
    updateChatIdentityUI();
    
    // Hide custom URL container
    const customContainer = document.getElementById('custom-banner-container');
    if (customContainer) customContainer.classList.add('hidden');
};

// Toggle Custom Banner URL inputs
window.toggleCustomBannerInput = function() {
    const customContainer = document.getElementById('custom-banner-container');
    if (customContainer) {
        customContainer.classList.toggle('hidden');
    }
};

// Apply Custom Banner image/gif URL
window.applyCustomBannerUrl = function() {
    const input = document.getElementById('custom-banner-url-input');
    if (!input) return;
    const url = input.value.trim();
    if (!url) {
        window.showMsg("Please enter a valid URL!");
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
        window.showMsg("URL must start with http:// or https://");
        return;
    }

    chatBanner = url;
    localStorage.setItem('qtx-chat-banner', chatBanner);
    updateChatIdentityUI();
    window.showMsg("Custom profile banner set successfully!");
};

// Handle file selector for banner image/gif upload
window.handleBannerFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        window.showMsg("Please select an image/gif file!");
        return;
    }
    if (file.size > 3 * 1024 * 1024) {
        window.showMsg("Banner image must be smaller than 3MB!");
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        chatBanner = e.target.result;
        localStorage.setItem('qtx-chat-banner', chatBanner);
        updateChatIdentityUI();
        window.showMsg("Profile banner uploaded successfully!");
    };
    reader.readAsDataURL(file);
};

// Helper to detect if a file or URL is an image or video
function detectMediaType(urlOrData) {
    if (!urlOrData) return 'image';
    if (typeof urlOrData !== 'string') return 'image';
    if (urlOrData.startsWith('data:video/')) {
        return 'video';
    }
    if (urlOrData.startsWith('data:image/')) {
        return 'image';
    }
    const cleanUrl = urlOrData.toLowerCase().split('?')[0].split('#')[0];
    if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.mkv')) {
        return 'video';
    }
    return 'image';
}

// Handle file selector for chat message image/video/file attachment
window.handleChatFileSelect = function(event) {
    const file = event.target.files[0];
    if (file && window.processSelectedFile) {
        window.processSelectedFile(file);
    }
};

// Update preview block
function showChatImagePreview(src, type = null) {
    if (!type) {
        type = detectMediaType(src);
    }
    currentChatAttachmentType = type;

    const previewBox = document.getElementById('chat-image-preview-box');
    const previewImg = document.getElementById('chat-image-preview-img');
    const previewVid = document.getElementById('chat-video-preview-vid');
    const previewGeneric = document.getElementById('chat-file-preview-generic');
    const previewFileName = document.getElementById('chat-file-preview-name');
    const previewFileSize = document.getElementById('chat-file-preview-size');
    const dragText = document.getElementById('drag-zone-text');

    if (previewBox) {
        previewBox.classList.remove('hidden');
        if (type === 'video') {
            if (previewImg) previewImg.classList.add('hidden');
            if (previewGeneric) previewGeneric.classList.add('hidden');
            if (previewVid) {
                previewVid.src = src;
                previewVid.classList.remove('hidden');
            }
        } else if (type === 'file') {
            if (previewImg) previewImg.classList.add('hidden');
            if (previewVid) {
                previewVid.classList.add('hidden');
                previewVid.src = '';
            }
            if (previewGeneric) {
                previewGeneric.classList.remove('hidden');
                if (previewFileName) previewFileName.innerText = currentChatAttachmentName || "file.bin";
                if (previewFileSize) {
                    const sizeKB = Math.round((currentChatAttachmentSize || 0) / 1024);
                    previewFileSize.innerText = sizeKB > 1024 
                        ? `${(sizeKB / 1024).toFixed(1)} MB` 
                        : `${sizeKB} KB`;
                }
            }
        } else {
            if (previewVid) {
                previewVid.classList.add('hidden');
                previewVid.src = '';
            }
            if (previewGeneric) previewGeneric.classList.add('hidden');
            if (previewImg) {
                previewImg.src = src;
                previewImg.classList.remove('hidden');
            }
        }
    }
    if (dragText) {
        if (type === 'video') dragText.innerText = "✅ Video Attached";
        else if (type === 'file') dragText.innerText = "✅ File Attached";
        else dragText.innerText = "✅ Image Attached";
        dragText.classList.add('text-[#00ff00]');
    }
}

// Preview from pasted media URL
window.previewChatImageFromUrl = function() {
    const input = document.getElementById('chat-image-url-input');
    if (!input) return;
    const url = input.value.trim();
    if (url) {
        currentChatAttachment = url;
        const detected = detectMediaType(url);
        showChatImagePreview(url, detected);
    } else {
        window.clearChatImageAttachment();
    }
};

// Clear Chat Attachment
window.clearChatImageAttachment = function() {
    currentChatAttachment = null;
    currentChatAttachmentType = null;
    currentChatAttachmentName = null;
    currentChatAttachmentSize = null;
    const urlInput = document.getElementById('chat-image-url-input');
    const fileInput = document.getElementById('chat-image-file-input');
    const previewBox = document.getElementById('chat-image-preview-box');
    const previewImg = document.getElementById('chat-image-preview-img');
    const previewVid = document.getElementById('chat-video-preview-vid');
    const previewGeneric = document.getElementById('chat-file-preview-generic');
    const dragText = document.getElementById('drag-zone-text');
    
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    if (previewBox) previewBox.classList.add('hidden');
    if (previewImg) {
        previewImg.src = '';
        previewImg.classList.add('hidden');
    }
    if (previewVid) {
        previewVid.src = '';
        previewVid.classList.add('hidden');
    }
    if (previewGeneric) {
        previewGeneric.classList.add('hidden');
    }
    if (dragText) {
        dragText.innerText = "📁 Select File or Media";
        dragText.classList.remove('text-[#00ff00]');
    }
};

// Toggle message image/video tray
window.toggleImageInput = function() {
    const container = document.getElementById('chat-image-url-container');
    if (container) {
        container.classList.toggle('hidden');
    }
};

// Zoom chat media full screen Modal (handles image & video)
window.zoomChatImage = function(src, type = 'image') {
    if (!type || type === 'image') {
        type = detectMediaType(src);
    }
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center p-4 animate-fadeIn';
    
    let mediaHtml = '';
    if (type === 'video') {
        mediaHtml = `<video src="${src}" class="object-contain max-w-full max-h-[82vh] rounded-lg shadow-2xl border border-white/10" controls autoplay></video>`;
    } else {
        mediaHtml = `<img src="${src}" class="object-contain max-w-full max-h-[82vh] rounded-lg shadow-2xl border border-white/10" alt="Zoomed view">`;
    }
    
    modal.innerHTML = `
        <div class="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onclick="event.stopPropagation()">
            ${mediaHtml}
            <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-red-400 font-mono text-xs mt-4 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full cursor-pointer transition-all">
                ✕ CLOSE PLAYER
            </button>
        </div>
    `;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
};

// Fetch active rooms & update sidebar
async function fetchChatRooms() {
    try {
        const res = await fetch('/api/chat/rooms');
        if (!res.ok) return;
        const rooms = await res.json();
        chatRoomsList = rooms;
        renderChatRooms();
    } catch (err) {
        console.error("Failed to load chat rooms:", err);
    }
}

// Render Rooms sidebar list
function renderChatRooms() {
    const listContainer = document.getElementById('chat-rooms-list');
    if (!listContainer) return;

    let html = '';
    const sortedRooms = Object.keys(chatRoomsList).sort();
    
    // Ensure 'global' is always first
    const globalIdx = sortedRooms.indexOf('global');
    if (globalIdx > -1) {
        sortedRooms.splice(globalIdx, 1);
        sortedRooms.unshift('global');
    }

    sortedRooms.forEach(room => {
        const isActive = room === currentChatRoom;
        const count = chatRoomsList[room] || 0;
        const icon = room === 'global' ? '🌍' : '🔒';
        
        const btnClass = isActive 
            ? "flex items-center justify-between w-full text-left px-3 py-2 rounded-lg bg-[#00ff00]/10 border border-[#00ff00]/20 text-[#00ff00] font-bold cursor-pointer transition-all"
            : "flex items-center justify-between w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer transition-all";

        html += `
            <button onclick="window.selectChatRoom('${room}')" class="${btnClass}">
                <span class="truncate">${icon} ${room}</span>
                <span class="text-[9px] ${isActive ? 'bg-[#00ff00]/20 text-white' : 'bg-white/10 text-gray-400'} px-1.5 py-0.5 rounded">${count}</span>
            </button>
        `;
    });

    listContainer.innerHTML = html;
}

// Switch Chat Room
window.selectChatRoom = function(roomName) {
    if (!roomName) return;
    currentChatRoom = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!currentChatRoom) currentChatRoom = 'global';
    
    const roomEl = document.getElementById('chat-current-room');
    if (roomEl) roomEl.innerText = currentChatRoom;
    
    renderChatRooms();
    fetchChatMessages(true); // force scroll to bottom
};

// Create or join a private room
window.createOrJoinRoom = async function() {
    const input = document.getElementById('new-room-name');
    if (!input) return;
    const roomVal = input.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!roomVal) {
        window.showMsg("Enter a valid room name (letters/numbers/hyphens only)!");
        return;
    }
    input.value = '';

    try {
        const response = await fetch('/api/chat/create-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName: roomVal, username: chatNickname })
        });
        const data = await response.json();
        if (response.ok) {
            window.showMsg(`✅ ${data.message || 'Room created!'}`);
            window.selectChatRoom(roomVal);
            await fetchChatRooms();
        } else {
            window.showMsg("❌ " + (data.error || "Failed to create room."));
        }
    } catch (e) {
        console.error("Error creating room:", e);
        window.showMsg("Server error trying to create room.");
        // Fallback to client-side switch
        window.selectChatRoom(roomVal);
    }
};

// Fetch Chat Messages
let lastMessageCount = 0;
async function fetchChatMessages(forceScroll = false) {
    try {
        const res = await fetch(`/api/chat/messages?room=${encodeURIComponent(currentChatRoom)}`);
        if (!res.ok) return;
        const data = await res.json();
        
        let messages = [];
        let pinned = [];
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            messages = data.messages || [];
            pinned = data.pinned || [];
        } else if (Array.isArray(data)) {
            messages = data;
            pinned = data.filter(m => m.pinned);
        }
        
        renderChatMessages(messages, forceScroll);
        renderPinnedMessages(pinned);
    } catch (err) {
        console.error("Failed to load chat messages:", err);
    }
}

// Format raw links into nice active styled clickable anchors safely
function formatLinks(text) {
    const urlPattern = /(\b(https?:\/\/|www\.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, (url) => {
        const href = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline hover:text-[#00ff00] transition-all font-mono break-all">${url}</a>`;
    });
}

// Helper to escape HTML tags to prevent custom script injections/XSS
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Render Pinned Messages to header container
function renderPinnedMessages(pinned) {
    const container = document.getElementById('chat-pinned-messages-container');
    const list = document.getElementById('chat-pinned-list');
    const countBadge = document.getElementById('chat-pinned-count');
    if (!container || !list) return;

    if (!pinned || pinned.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    if (countBadge) {
        countBadge.innerText = `${pinned.length} message${pinned.length === 1 ? '' : 's'} pinned`;
    }

    let html = '';
    pinned.forEach(msg => {
        const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const cleanUser = escapeHTML(msg.username || 'Anonymous');
        const cleanText = formatLinks(escapeHTML(msg.text || ''));
        const postNum = (msg.timestamp % 100000000);

        let unpinBtnHtml = `
            <button onclick="window.pinChatMessage('${msg.id}')" class="text-[9px] text-yellow-500/90 hover:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 px-2 py-0.5 rounded cursor-pointer border border-yellow-500/20 transition-all font-mono">
                📌 UNPIN
            </button>
        `;

        // Mini avatar rendering
        const isAvatarUrl = msg.avatar && (msg.avatar.startsWith('http://') || msg.avatar.startsWith('https://') || msg.avatar.startsWith('data:image/'));
        const avatarHtml = isAvatarUrl 
            ? `<img src="${msg.avatar}" class="w-4 h-4 rounded object-cover border border-white/10 shrink-0 inline-block align-middle mr-1.5" alt="avatar" onerror="this.outerHTML='👾'">`
            : `<span class="text-xs shrink-0 leading-none mr-1.5 inline-block align-middle">${msg.avatar || '👾'}</span>`;

        // Render attachments thumbnails inside pinned messages too
        let attachmentThumb = '';
        if (msg.image) {
            attachmentThumb = `
                <div class="mt-1.5 max-w-[80px] rounded overflow-hidden border border-white/5 cursor-zoom-in" onclick="window.zoomChatImage('${escapeHTML(msg.image)}')">
                    <img src="${msg.image}" class="object-cover h-10 w-10 hover:opacity-90" alt="Pinned Image">
                </div>
            `;
        } else if (msg.video) {
            attachmentThumb = `
                <div class="mt-1.5 max-w-[80px] rounded overflow-hidden border border-white/5 cursor-pointer flex items-center justify-center bg-black/40 h-10 w-10" onclick="window.zoomChatImage('${escapeHTML(msg.video)}', 'video')">
                    <span class="text-[10px]">📹</span>
                </div>
            `;
        }

        html += `
            <div class="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-2.5 flex flex-col gap-1 transition-all">
                <div class="flex items-center justify-between gap-2 border-b border-yellow-500/10 pb-1 mb-1">
                    <div class="flex items-center flex-wrap gap-1 text-[11px]">
                        ${avatarHtml}
                        <span class="font-bold font-mono" style="color: ${msg.color || '#ffcc00'}">${cleanUser}</span>
                        <span class="text-[8px] text-gray-500 font-mono">No. ${postNum}</span>
                        <span class="text-[8px] text-gray-500 font-mono">• ${formattedTime}</span>
                    </div>
                    ${unpinBtnHtml}
                </div>
                <div class="flex gap-2.5 items-start">
                    <div class="flex-1 min-w-0">
                        <p class="text-xs text-gray-300 font-sans leading-relaxed break-words whitespace-pre-wrap">${cleanText}</p>
                    </div>
                    ${attachmentThumb}
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

// Pin / Unpin a chat message
window.pinChatMessage = async function(id) {
    try {
        const response = await fetch('/api/chat/pin-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (response.ok) {
            const data = await response.json();
            window.showMsg(data.pinned ? "📌 Message pinned successfully!" : "📌 Message unpinned successfully.");
            fetchChatMessages();
        } else {
            const data = await response.json();
            window.showMsg("❌ " + (data.error || "Failed to toggle pin."));
        }
    } catch (e) {
        console.error("Error pinning message:", e);
        window.showMsg("Server error pinning message.");
    }
};

// Render Messages to container
function renderChatMessages(messages, forceScroll = false) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-xs">
                No messages in this channel yet. Be the first to start the board!
            </div>
        `;
        return;
    }

    let html = '';
    messages.forEach(msg => {
        const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const cleanUser = escapeHTML(msg.username || 'Anonymous');
        const cleanDisplayName = escapeHTML(msg.displayName || msg.username || 'Anonymous');
        const cleanBio = escapeHTML(msg.bio || '🎮 Just exploring the unblocked retro gaming sandbox! 🔥');
        const cleanText = formatLinks(escapeHTML(msg.text || ''));
        const cleanBanner = escapeHTML(msg.banner || '');
        
        // Render PFP / Avatar (Clickable to show Discord profile)
        const isAvatarUrl = msg.avatar && (msg.avatar.startsWith('http://') || msg.avatar.startsWith('https://') || msg.avatar.startsWith('data:image/'));
        const avatarHtml = isAvatarUrl 
            ? `<img src="${msg.avatar}" class="w-6 h-6 rounded-lg object-cover border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-all" alt="avatar" onerror="this.outerHTML='👾'" onclick="window.showDiscordProfile('${cleanUser}', '${cleanDisplayName}', '${cleanBio}', '${escapeHTML(msg.avatar || '')}', '${msg.color || '#00ff00'}', '${cleanBanner}')">`
            : `<span class="text-base shrink-0 leading-none cursor-pointer hover:scale-110 transition-transform inline-block" onclick="window.showDiscordProfile('${cleanUser}', '${cleanDisplayName}', '${cleanBio}', '${escapeHTML(msg.avatar || '')}', '${msg.color || '#00ff00'}', '${cleanBanner}')">${msg.avatar || '👾'}</span>`;

        // Render attached image
        let attachedImageHtml = '';
        if (msg.image) {
            attachedImageHtml = `
                <div class="mt-3.5 rounded-xl overflow-hidden border border-white/5 bg-black/30 max-w-full md:max-w-md cursor-zoom-in group relative" onclick="window.zoomChatImage('${escapeHTML(msg.image)}')">
                    <img src="${msg.image}" class="object-contain max-h-60 w-auto hover:opacity-95 transition-all" alt="Attached Chat Image">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="bg-black/80 text-white font-mono text-[10px] px-2.5 py-1 rounded border border-white/15">🔍 VIEW FULL SIZE</span>
                    </div>
                </div>
            `;
        }

        // Render attached video
        let attachedVideoHtml = '';
        if (msg.video) {
            attachedVideoHtml = `
                <div class="mt-3.5 rounded-xl overflow-hidden border border-white/5 bg-black/30 max-w-full md:max-w-md relative group">
                    <video src="${escapeHTML(msg.video)}" class="object-contain max-h-60 w-auto hover:opacity-95 transition-all" controls muted preload="metadata"></video>
                    <div class="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.zoomChatImage('${escapeHTML(msg.video)}', 'video')" class="bg-black/80 hover:bg-[#00ff00]/20 hover:text-[#00ff00] text-white font-mono text-[9px] px-2 py-1 rounded border border-white/15 transition-all cursor-pointer">
                            🖥️ FULLSCREEN
                        </button>
                    </div>
                </div>
            `;
        }

        // Render attached general file
        let attachedFileHtml = '';
        if (msg.fileData) {
            const cleanFileName = escapeHTML(msg.fileName || 'file.bin');
            let sizeStr = '';
            if (msg.fileSize) {
                const kb = Math.round(msg.fileSize / 1024);
                sizeStr = kb > 1024 ? `(${(kb / 1024).toFixed(1)} MB)` : `(${kb} KB)`;
            }
            attachedFileHtml = `
                <div class="mt-3 bg-black/40 hover:bg-black/60 border border-[#00ff00]/15 hover:border-[#00ff00]/30 rounded-xl p-3 max-w-full md:max-w-md flex items-center justify-between gap-3 font-mono transition-all">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-2xl shrink-0">📄</span>
                        <div class="flex flex-col min-w-0">
                            <span class="text-xs text-white font-bold truncate max-w-[200px]">${cleanFileName}</span>
                            <span class="text-[10px] text-gray-500">${sizeStr || 'Unspecified size'}</span>
                        </div>
                    </div>
                    <a href="${escapeHTML(msg.fileData)}" download="${cleanFileName}" class="shrink-0 text-[10px] font-bold text-[#00ff00] hover:text-[#00ff00]/80 bg-[#00ff00]/10 hover:bg-[#00ff00]/15 px-3 py-1.5 rounded-lg border border-[#00ff00]/25 hover:border-[#00ff00]/40 transition-all cursor-pointer flex items-center gap-1">
                        📥 DOWNLOAD
                    </a>
                </div>
            `;
        }

        // Generate a numeric anonymous post ID from timestamp
        const postNum = (msg.timestamp % 100000000);

        // Delete button is always available since moderator key is removed!
        const isMyPost = (window.mySentMessages || []).includes(msg.id);
        const deleteBtnHtml = `
            <button onclick="window.deleteChatMessage('${msg.id}')" class="text-[9px] text-red-500/80 hover:text-red-400 font-mono bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded cursor-pointer transition-all ml-2 border border-red-500/20">
                🗑️ DELETE ${isMyPost ? '(YOU)' : ''}
            </button>
        `;

        // Pin button is always available since moderator key is removed!
        const isPinned = !!msg.pinned;
        const pinBtnHtml = `
            <button onclick="window.pinChatMessage('${msg.id}')" class="text-[9px] ${isPinned ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/25 border-yellow-500/35' : 'text-gray-400 bg-white/5 hover:bg-white/10 border-white/15'} font-mono px-2 py-0.5 rounded cursor-pointer transition-all ml-1.5 border">
                📌 ${isPinned ? 'UNPIN' : 'PIN'}
            </button>
        `;

        html += `
            <div class="chat-message bg-[#0f0f15]/50 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-all flex gap-3 items-start">
                <!-- Avatar image/emoji on left -->
                <div class="mt-0.5">${avatarHtml}</div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5 border-b border-white/[0.03] pb-1.5">
                        <div class="flex items-center gap-2">
                            <!-- Clickable display name and handle like Discord! -->
                            <span class="font-bold font-sans text-xs text-white hover:underline cursor-pointer" style="color: ${msg.color || '#00ff00'}" onclick="window.showDiscordProfile('${cleanUser}', '${cleanDisplayName}', '${cleanBio}', '${escapeHTML(msg.avatar || '')}', '${msg.color || '#00ff00'}', '${cleanBanner}')">${cleanDisplayName}</span>
                            <span class="text-[9px] font-mono text-gray-500 cursor-pointer hover:text-gray-400" onclick="window.showDiscordProfile('${cleanUser}', '${cleanDisplayName}', '${cleanBio}', '${escapeHTML(msg.avatar || '')}', '${msg.color || '#00ff00'}', '${cleanBanner}')">@${cleanUser}</span>
                            <span class="text-[9px] text-gray-600 font-mono">No. ${postNum}</span>
                            ${deleteBtnHtml}
                            ${pinBtnHtml}
                        </div>
                        <span class="text-[9px] text-gray-500 font-mono">${formattedTime}</span>
                    </div>
                    <p class="text-xs text-gray-300 font-sans leading-relaxed break-words whitespace-pre-wrap">${cleanText}</p>
                    ${attachedImageHtml}
                    ${attachedVideoHtml}
                    ${attachedFileHtml}
                </div>
            </div>
        `;
    });

    // Check if user was already at the bottom of the container, or if we forceScroll
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 45;
    
    container.innerHTML = html;

    if (forceScroll || isAtBottom || messages.length !== lastMessageCount) {
        container.scrollTop = container.scrollHeight;
    }
    
    lastMessageCount = messages.length;
}

// Send Message
window.handleChatSubmit = async function(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('chat-message-input');
    if (!input) return;
    const textVal = input.value.trim();
    if (!textVal && !currentChatAttachment) return; // allow sending only an image

    // Keep backup copy of typed message in case send fails (due to name protection or NSFW block)
    const backupText = textVal;
    
    // Clear input instantly for snappy responsiveness
    input.value = '';

    try {
        const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room: currentChatRoom,
                username: chatNickname,
                displayName: chatDisplayName,
                bio: chatBio,
                avatar: chatPfp,
                banner: chatBanner,
                text: textVal,
                image: currentChatAttachmentType === 'image' ? currentChatAttachment : null,
                video: currentChatAttachmentType === 'video' ? currentChatAttachment : null,
                fileData: currentChatAttachmentType === 'file' ? currentChatAttachment : null,
                fileName: currentChatAttachmentType === 'file' ? currentChatAttachmentName : null,
                fileSize: currentChatAttachmentType === 'file' ? currentChatAttachmentSize : null,
                fileType: currentChatAttachmentType === 'file' ? 'general' : null,
                key: chatPin // Pass the PIN key to authenticate name claims
            })
        });

        if (res.ok) {
            try {
                const msgData = await res.json();
                if (msgData && msgData.id) {
                    window.mySentMessages.push(msgData.id);
                    localStorage.setItem('qtx-my-messages', JSON.stringify(window.mySentMessages));
                }
            } catch (e) {
                console.error("Error reading submitted message response:", e);
            }
            window.clearChatImageAttachment();
            const attachmentContainer = document.getElementById('chat-image-url-container');
            if (attachmentContainer) attachmentContainer.classList.add('hidden'); // Close tray on send
            fetchChatMessages(true); // force scroll on own post
            fetchChatRooms();
        } else {
            const errData = await res.json();
            // Restore text so they don't lose their typed message!
            input.value = backupText;
            
            // If they get warned about NSFW, show a custom prominent popup with the warning
            if (errData.warning) {
                window.showMsg(errData.warning);
            } else {
                window.showMsg(errData.error || errData.message || "Failed to send message.");
            }
        }
    } catch (err) {
        console.error("Failed to submit message:", err);
        input.value = backupText;
        window.showMsg("Network error sending message.");
    }
};

// Start load and initialize theme settings
loadGamesPortal();
initPortalSystem();

// Show Retro Arcade Gamer Profile modal (overhauled away from Discord look)
window.showDiscordProfile = function(username, displayName, bio, avatarUrl, color, bannerUrl) {
    let modal = document.getElementById('discord-profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'discord-profile-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs transition-opacity duration-300 opacity-0 pointer-events-none';
        document.body.appendChild(modal);
    }

    const accentColor = color || '#00ff00';
    const isAvatarUrl = avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'));
    
    let avatarMarkup = '';
    if (isAvatarUrl) {
        avatarMarkup = `<img src="${avatarUrl}" class="w-20 h-20 rounded-xl border-2 border-solid object-cover bg-black" style="border-color: ${accentColor}; box-shadow: 0 0 12px ${accentColor}50" alt="avatar" onerror="this.outerHTML='👾'">`;
    } else {
        avatarMarkup = `<div class="w-20 h-20 rounded-xl border-2 border-solid bg-[#0b0c10] flex items-center justify-center text-4xl select-none" style="border-color: ${accentColor}; box-shadow: 0 0 12px ${accentColor}50">${avatarUrl || '👾'}</div>`;
    }

    modal.innerHTML = `
        <div class="relative w-full max-w-sm bg-[#090a0f] rounded-2xl overflow-hidden border-2 border-solid font-mono text-white animate-scale-up" style="border-color: ${accentColor}80; box-shadow: 0 0 30px ${accentColor}33" onclick="event.stopPropagation()">
            
            <!-- Retro Cyber Header Grid Background -->
            <div class="h-24 w-full relative bg-[#12131a] overflow-hidden border-b border-solid bg-cover bg-center" style="border-color: ${accentColor}20; ${bannerUrl ? `background-image: url('${bannerUrl}');` : ''}">
                ${!bannerUrl ? `
                <div class="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
                <div class="absolute inset-0" style="background-image: linear-gradient(rgba(0, 255, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.05) 1px, transparent 1px); background-size: 8px 8px;"></div>
                ` : ''}
                
                <div class="absolute top-3 right-3 flex gap-2">
                    <span class="px-2 py-0.5 rounded bg-black/60 border border-solid text-[8px] uppercase tracking-wider font-bold select-none" style="color: ${accentColor}; border-color: ${accentColor}40">ONLINE PROT</span>
                </div>
                <div class="absolute bottom-2 right-3">
                    <span class="text-[9px] text-gray-500 font-mono tracking-widest bg-black/60 px-1.5 py-0.5 rounded">NET_ID: 108.9</span>
                </div>
            </div>

            <!-- Avatar Overlapping -->
            <div class="absolute top-12 left-4 z-10">
                ${avatarMarkup}
            </div>

            <!-- Gamer Card Content -->
            <div class="pt-10 pb-5 px-4">
                <div class="bg-black/60 rounded-xl p-4 border border-solid" style="border-color: ${accentColor}15">
                    
                    <!-- Names & Handle -->
                    <div class="mb-4">
                        <div class="text-white text-lg font-bold tracking-tight flex items-center gap-1.5">
                            <span style="color: ${accentColor}">🎮</span> ${displayName}
                        </div>
                        <div class="text-gray-400 text-xs mt-0.5">@${username}</div>
                    </div>

                    <!-- Scanline visual divider -->
                    <div class="h-0.5 my-3.5" style="background: linear-gradient(to right, transparent, ${accentColor}60, transparent)"></div>

                    <!-- Player Biography -->
                    <div class="mb-4">
                        <div class="text-[10px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase flex items-center gap-1">
                            <span class="inline-block w-1 h-2" style="background-color: ${accentColor}"></span> PLAYER BIO
                        </div>
                        <div class="bg-black/40 border border-white/5 rounded-lg p-2 text-xs leading-relaxed text-gray-300 font-sans break-words whitespace-pre-wrap">${bio}</div>
                    </div>

                    <!-- Sandbox Stats -->
                    <div>
                        <div class="text-[10px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase flex items-center gap-1">
                            <span class="inline-block w-1 h-2" style="background-color: ${accentColor}"></span> STATUS & REALM
                        </div>
                        <div class="flex items-center gap-2 bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400">
                            <span class="text-sm">⚡</span>
                            <span>Active in <span class="text-[#00ff00] font-bold">Retro Unblocked Sandbox</span></span>
                        </div>
                    </div>
                </div>

                <!-- Action Button -->
                <button onclick="window.closeDiscordProfile()" class="w-full mt-4 bg-black/40 hover:bg-[#00ff00]/10 border border-solid text-xs font-bold py-2.5 px-4 rounded-lg transition-all focus:outline-none shadow-md cursor-pointer flex items-center justify-center gap-1.5" style="color: ${accentColor}; border-color: ${accentColor}40">
                    <span>✕</span> CLOSE DATACARD
                </button>
            </div>
        </div>
    `;

    // Make modal visible with smooth transition
    modal.classList.remove('pointer-events-none');
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    
    // Add backdrop close listener
    modal.onclick = window.closeDiscordProfile;
};

// Close Retro Gamer Profile modal
window.closeDiscordProfile = function() {
    const modal = document.getElementById('discord-profile-modal');
    if (modal) {
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        modal.classList.add('pointer-events-none');
    }
};
