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

let recentlyPlayedList = [];
try {
    recentlyPlayedList = JSON.parse(localStorage.getItem('qtx-recent-games') || '[]');
} catch (e) {
    console.error("Failed to load recently played list:", e);
}

let gamePlayCounts = {};
try {
    gamePlayCounts = JSON.parse(localStorage.getItem('qtx-game-plays') || '{}');
} catch (e) {
    console.error("Failed to load game play counts:", e);
}

function getGamePlayCount(title) {
    return gamePlayCounts[title] || 0;
}

function incrementGamePlayCount(title) {
    if (!title) return;
    gamePlayCounts[title] = (gamePlayCounts[title] || 0) + 1;
    try {
        localStorage.setItem('qtx-game-plays', JSON.stringify(gamePlayCounts));
    } catch (e) {
        console.error("Failed to save game play counts:", e);
    }
}

function isGameStorageSaved(game) {
    if (!game) return false;
    
    // Check if browser supports localStorage
    let lsSupported = false;
    try {
        const testKey = '__qtx_ls_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        lsSupported = true;
    } catch (e) {
        lsSupported = false;
    }

    if (!lsSupported) return false;

    // Check game explicit save properties
    if (game.hasSave === false || game.supportsSave === false || game.supportsLocalStorage === false) {
        return false;
    }

    // Check URL patterns that explicitly indicate no persistence
    if (game.iframeUrl) {
        const url = String(game.iframeUrl).toLowerCase();
        if (url.includes('no-save') || url.includes('nosave') || url.includes('temp-only')) {
            return false;
        }
    }

    return true;
}

function recordRecentlyPlayed(iframeUrl, title) {
    if (!iframeUrl) return;

    // Search for matching game in gamesData
    const matched = gamesData.find(g => g.iframeUrl === iframeUrl || (g.title && g.title === title));

    let gameObj;
    if (matched) {
        gameObj = {
            id: String(matched.id),
            title: matched.title,
            iframeUrl: matched.iframeUrl,
            thumbnail: matched.thumbnail || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250",
            category: matched.category || 'Arcade',
            description: matched.description || '',
            hasSave: matched.hasSave !== undefined ? matched.hasSave : (matched.supportsSave !== undefined ? matched.supportsSave : true)
        };
    } else {
        gameObj = {
            id: 'custom-' + encodeURIComponent(iframeUrl),
            title: title || 'Unblocked Game',
            iframeUrl: iframeUrl,
            thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250",
            category: 'Arcade',
            description: 'Recently played game.',
            hasSave: true
        };
    }

    // Filter out existing duplicate
    recentlyPlayedList = recentlyPlayedList.filter(g => 
        String(g.id) !== String(gameObj.id) && 
        g.iframeUrl !== gameObj.iframeUrl && 
        g.title !== gameObj.title
    );

    // Unshift to front
    recentlyPlayedList.unshift(gameObj);

    // Keep top 10
    recentlyPlayedList = recentlyPlayedList.slice(0, 10);

    try {
        localStorage.setItem('qtx-recent-games', JSON.stringify(recentlyPlayedList));
    } catch (e) {
        console.error("Failed to save recently played games:", e);
    }

    // Increment game play count
    incrementGamePlayCount(gameObj.title);

    renderRecentlyPlayed();
    renderGames();
}

function renderRecentlyPlayed() {
    const section = $id('recently-played-section');
    const grid = $id('recently-played-grid');
    if (!section || !grid) return;

    if (!recentlyPlayedList || recentlyPlayedList.length === 0) {
        section.classList.add('hidden');
        section.classList.remove('flex');
        return;
    }

    section.classList.remove('hidden');
    section.classList.add('flex');

    const last4 = recentlyPlayedList.slice(0, 4);

    let html = '';
    last4.forEach(game => {
        const thumbnail = game.thumbnail || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250";
        const escapedTitle = (game.title || '').replace(/'/g, "\\'");
        const escapedIframeUrl = (game.iframeUrl || '').replace(/'/g, "\\'");
        const isSaved = isGameStorageSaved(game);

        const saveBadgeHtml = isSaved
            ? `<span class="inline-flex items-center gap-1 text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0 shadow-sm" title="Supports persistent storage in localStorage">
                <svg class="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Saved
               </span>`
            : `<span class="inline-flex items-center gap-1 text-[8px] font-mono font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0 shadow-sm" title="Persistent storage in localStorage not supported">
                <svg class="w-2.5 h-2.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                Unsaved
               </span>`;

        html += `
            <div class="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0f0f15]/90 p-3.5 flex flex-col justify-between hover:border-[#00f0ff]/50 hover:bg-[#14141c] hover:shadow-[0_0_20px_rgba(0,255,0,0.08)] transition-all duration-300">
                <div class="flex gap-3 items-center">
                    <div class="w-16 h-12 rounded-lg bg-black overflow-hidden shrink-0 border border-white/10 relative">
                        <img src="${thumbnail}" alt="${game.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" referrerPolicy="no-referrer">
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <span class="text-[8px] font-mono font-bold text-[#00f0ff] uppercase tracking-wider block truncate">
                                ${game.category || 'Arcade'}
                            </span>
                            ${saveBadgeHtml}
                        </div>
                        <h4 class="text-xs font-bold text-white font-mono truncate group-hover:text-[#00f0ff] transition-colors">
                            ${game.title}
                        </h4>
                    </div>
                </div>
                <div class="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                    <span class="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse"></span>
                        Recent
                    </span>
                    <button onclick="window.launchGame('${escapedIframeUrl}', '${escapedTitle}')" class="bg-[#00f0ff]/10 hover:bg-[#00f0ff] text-[#00f0ff] hover:text-black border border-[#00f0ff]/30 hover:border-transparent text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                        ▶ PLAY AGAIN
                    </button>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

window.clearRecentlyPlayed = function () {
    recentlyPlayedList = [];
    localStorage.removeItem('qtx-recent-games');
    renderRecentlyPlayed();
    window.showMsg("Recently played history cleared!");
};

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
        const container = layer.firstElementChild;
        if (container) {
            if (text.includes('ERROR')) {
                container.className = "bg-red-950/90 border border-red-500/60 text-red-400 px-5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs font-bold flex items-center gap-2 tracking-wider";
            } else {
                container.className = "bg-black/90 border border-[#00f0ff]/30 text-[#00f0ff] px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs flex items-center gap-2";
            }
        }
        layer.hidden = false;
        setTimeout(() => {
            layer.hidden = true;
        }, 3000);
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

    let html = `<button onclick="window.selectCategory('All')" class="category-pill active bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all">ALL</button>`;
    
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
            <span class="inline-block animate-spin mr-2 border-2 border-[#00f0ff] border-t-transparent w-4 h-4 rounded-full align-middle"></span>
            Acquiring premium games inventory...
        </div>
    `;

    try {
        let response;
        try {
            response = await fetch('./src/games.json');
            if (!response.ok) throw new Error();
        } catch (e1) {
            try {
                response = await fetch('src/games.json');
                if (!response.ok) throw new Error();
            } catch (e2) {
                try {
                    response = await fetch('./games.json');
                    if (!response.ok) throw new Error();
                } catch (e3) {
                    response = await fetch('games.json');
                }
            }
        }
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
        
        renderCategories();
        renderGames();
        renderRecentlyPlayed();
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
            html += `<button class="px-3 py-1.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] rounded-lg font-bold transition-all select-none">${p}</button>`;
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
        if (!matchesCategory) return false;
        if (!searchVal) return true;
        return game.title.toLowerCase().includes(searchVal) || 
               (game.description || '').toLowerCase().includes(searchVal) ||
               (game.category || '').toLowerCase().includes(searchVal);
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

    // Determine max play count across played games efficiently
    let maxPlays = 0;
    const playCounts = Object.values(gamePlayCounts);
    for (let i = 0; i < playCounts.length; i++) {
        if (playCounts[i] > maxPlays) {
            maxPlays = playCounts[i];
        }
    }

    const totalPages = Math.ceil(filtered.length / GAMES_PER_PAGE) || 1;
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    const paginatedGames = filtered.slice((currentPage - 1) * GAMES_PER_PAGE, currentPage * GAMES_PER_PAGE);

    const fragment = document.createDocumentFragment();

    paginatedGames.forEach(game => {
        const playCount = getGamePlayCount(game.title);
        const isMostPlayed = maxPlays > 0 && playCount === maxPlays;

        const card = document.createElement('div');
        card.className = isMostPlayed 
            ? "group relative overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-[#16120b]/90 flex flex-col justify-between transition-colors duration-200 hover:border-amber-400 hover:bg-[#1f180e] game-card-optimized" 
            : "group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f15]/80 flex flex-col justify-between transition-colors duration-200 hover:border-[#00f0ff]/40 hover:bg-[#14141c] game-card-optimized";
        
        const thumbnail = game.thumbnail || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250";
        const escapedTitle = game.title.replace(/'/g, "\\'");
        const escapedIframeUrl = game.iframeUrl.replace(/'/g, "\\'");

        const badgeHtml = isMostPlayed ? `
            <span class="absolute top-3 left-3 text-[9px] font-mono font-black text-amber-300 bg-black/90 border border-amber-500/70 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 z-10">
                🔥 MOST PLAYED
            </span>
        ` : `
            <span class="absolute top-3 left-3 text-[9px] font-mono font-bold text-white bg-black/80 border border-white/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                ${game.category}
            </span>
        `;

        card.innerHTML = `
            <div>
                <!-- Image container -->
                <div class="relative w-full aspect-video overflow-hidden border-b border-white/5 bg-black">
                    <img src="${thumbnail}" alt="${game.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer">
                    ${badgeHtml}
                    <button onclick="window.toggleFavorite('${game.id}', event)" class="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 text-gray-400 hover:text-red-500 transition-all cursor-pointer z-10" title="Toggle Favorite">
                        ${isFavorited(game.id) 
                            ? `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`
                            : `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white hover:text-red-500 fill-none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`
                        }
                    </button>
                </div>
                <!-- Content -->
                <div class="p-5">
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <h3 class="text-base font-bold text-white tracking-tight transition-colors group-hover:text-[#00f0ff] font-mono truncate">
                            ${game.title}
                        </h3>
                    </div>
                    <p class="text-xs text-gray-400 mt-2 font-sans line-clamp-3 leading-relaxed">
                        ${game.description}
                    </p>
                </div>
            </div>
            <!-- Action Footer -->
            <div class="p-5 pt-0 mt-auto border-t border-white/[0.02] flex items-center justify-between">
                <span class="text-[10px] font-mono ${isMostPlayed ? 'text-amber-300 font-bold' : 'text-gray-400'} flex items-center gap-1">
                    <span class="${isMostPlayed ? 'text-amber-400' : 'text-cyan-400'}">🎮</span> ${playCount} ${playCount === 1 ? 'play' : 'plays'}
                </span>
                <button onclick="window.launchGame('${escapedIframeUrl}', '${escapedTitle}')" class="${isMostPlayed ? 'bg-amber-500/20 border border-amber-500/40 hover:bg-amber-400 hover:text-black hover:border-transparent text-amber-300' : 'bg-[#00f0ff]/10 border border-[#00f0ff]/20 hover:bg-[#00f0ff] hover:text-black hover:border-transparent text-[#00f0ff]'} text-xs font-bold font-mono px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5">
                    PLAY NOW &rarr;
                </button>
            </div>
        `;
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);

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
            pill.className = "category-pill active bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all";
        } else {
            pill.className = "category-pill bg-white/5 border border-white/5 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all hover:text-white hover:bg-white/10";
        }
    });

    renderGames();
};

let filterDebounceTimer = null;
window.filterGames = function () {
    if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => {
        currentPage = 1;
        renderGames();

        const searchInput = $id('game-search');
        if (searchInput && searchInput.value.trim().length > 0) {
            const grid = $id('games-grid');
            if (grid) {
                const rect = grid.getBoundingClientRect();
                if (rect.top > window.innerHeight * 0.7 || rect.top < 0) {
                    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }
    }, 120);
};

window.playWebGame = function (iframeUrl, title) {
    recordRecentlyPlayed(iframeUrl, title);

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

    // Normalize GitHub repository/blob URLs if needed
    let targetIframeUrl = iframeUrl;
    if (targetIframeUrl && targetIframeUrl.includes('github.com/') && targetIframeUrl.includes('/blob/')) {
        targetIframeUrl = targetIframeUrl
            .replace('github.com/', 'raw.githubusercontent.com/')
            .replace('/blob/', '/');
    }

    // Check if URL is a CDN raw HTML or GitHub file
    const isCdnHtml = (targetIframeUrl.startsWith('http://') || targetIframeUrl.startsWith('https://')) && 
                      (targetIframeUrl.includes('jsdelivr.net') || 
                       targetIframeUrl.includes('githubusercontent.com') || 
                       targetIframeUrl.includes('github.io') ||
                       targetIframeUrl.includes('github.com') ||
                       targetIframeUrl.includes('rawcdn.githack.com')) &&
                      (targetIframeUrl.includes('.html') || targetIframeUrl.includes('.htm') || targetIframeUrl.endsWith('/') || !targetIframeUrl.split('?')[0].includes('.'));

    if (isCdnHtml) {
        iframe._lastFetchedUrl = targetIframeUrl;
        iframe.src = `/api/raw-proxy?url=${encodeURIComponent(targetIframeUrl)}`;
        iframe.onload = function() {
            if (loader) loader.style.display = 'none';
        };
    } else {
        iframe._lastFetchedUrl = null;
        iframe.src = targetIframeUrl;
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

// --- SIDEBAR TOGGLE LOGIC ---
window.toggleSidebar = function (forceState) {
    const sidebar = document.getElementById('sidebar-nav');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;

    const isCurrentlyHidden = sidebar.classList.contains('-translate-x-full');
    const show = (forceState !== undefined) ? forceState : isCurrentlyHidden;

    if (show) {
        sidebar.classList.remove('-translate-x-full');
        if (overlay) overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    }
};

// --- NAVIGATION TAB SWITCHER LOGIC & TAB LOCK PROTECTION ---
window.unlockedTabSessions = {};
window.pendingTabToUnlock = null;

window.switchTab = function (tabName, forceUnlock = false) {
    if (tabName === 'chat') {
        window.showMsg("ERROR: SUN");
        return;
    }

    const lockedTabs = JSON.parse(localStorage.getItem('qtx_locked_tabs') || '{}');
    if (!forceUnlock && lockedTabs[tabName] && !window.unlockedTabSessions[tabName]) {
        window.pendingTabToUnlock = tabName;
        const nameEl = document.getElementById('unlock-tab-name');
        if (nameEl) nameEl.innerText = tabName;
        const modal = document.getElementById('unlock-tab-modal');
        if (modal) modal.classList.remove('hidden');
        const pinInput = document.getElementById('unlock-tab-pin');
        if (pinInput) {
            pinInput.value = '';
            setTimeout(() => pinInput.focus(), 100);
        }
        return;
    }

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
    const isLight = document.body.classList.contains('light-theme');
    tabBtns.forEach(btn => {
        const isSelected = btn.id === `tab-${tabName}`;
        if (isSelected) {
            btn.classList.add('active');
            if (isLight) {
                btn.className = "tab-btn active w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-[#047857] bg-white shadow-md cursor-pointer text-left group";
            } else {
                btn.className = "tab-btn active w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-[#00f0ff] bg-white/10 border border-[#00f0ff]/30 cursor-pointer text-left group";
            }
        } else {
            btn.classList.remove('active');
            btn.className = "tab-btn w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5 border border-transparent cursor-pointer text-left group";
        }
    });

    // Auto close sidebar on smaller screen sizes after selection
    if (window.innerWidth < 1024) {
        window.toggleSidebar(false);
    }

    window.showMsg(`Switched to ${tabName.toUpperCase()} view`);
};

window.toggleTabLock = function(tabName) {
    const lockedTabs = JSON.parse(localStorage.getItem('qtx_locked_tabs') || '{}');
    lockedTabs[tabName] = !lockedTabs[tabName];
    localStorage.setItem('qtx_locked_tabs', JSON.stringify(lockedTabs));
    window.updateTabLockUI();
    window.showMsg(`${tabName.toUpperCase()} tab is now ${lockedTabs[tabName] ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}`);
};

window.saveTabPin = function() {
    const pinInput = document.getElementById('tab-pin-input');
    const pin = pinInput ? pinInput.value.trim() : '';
    if (!pin) {
        window.showMsg("Please enter a non-empty PIN!");
        return;
    }
    localStorage.setItem('qtx_tab_pin', pin);
    if (pinInput) pinInput.value = '';
    window.showMsg("Security PIN updated successfully! 🔒");
};

window.submitTabUnlock = function() {
    const pinInput = document.getElementById('unlock-tab-pin');
    const entered = pinInput ? pinInput.value.trim() : '';
    const savedPin = localStorage.getItem('qtx_tab_pin') || '1234';

    if (entered === savedPin) {
        const targetTab = window.pendingTabToUnlock;
        if (targetTab) {
            window.unlockedTabSessions[targetTab] = true;
            window.closeUnlockTabModal();
            window.switchTab(targetTab, true);
            window.showMsg(`Access Granted! Welcome to ${targetTab.toUpperCase()} 🔓`);
        }
    } else {
        window.showMsg("❌ Incorrect PIN Code! (Default PIN: 1234)");
    }
};

window.closeUnlockTabModal = function() {
    const modal = document.getElementById('unlock-tab-modal');
    if (modal) modal.classList.add('hidden');
    window.pendingTabToUnlock = null;
};

window.updateTabLockUI = function() {
    const lockedTabs = JSON.parse(localStorage.getItem('qtx_locked_tabs') || '{}');
    const tabs = ['chat', 'games', 'news', 'settings'];

    tabs.forEach(t => {
        const isLocked = !!lockedTabs[t];
        // Sidebar badge
        const badge = document.getElementById(`lock-badge-${t}`);
        if (badge) {
            if (isLocked) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }

        // Settings toggle status button
        const statusEl = document.getElementById(`status-lock-${t}`);
        const btnEl = document.getElementById(`toggle-lock-${t}`);
        if (statusEl) {
            statusEl.innerText = isLocked ? '🔒 Locked' : '🔓 Off';
            statusEl.className = isLocked ? 'text-xs text-amber-400 font-bold' : 'text-xs text-gray-500';
        }
        if (btnEl) {
            if (isLocked) {
                btnEl.className = "p-3 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-between bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]";
            } else {
                btnEl.className = "p-3 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-between bg-black/40 border-white/10 text-gray-300 hover:text-white";
            }
        }
    });
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
            btnDark.className = "px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all text-[#00f0ff] bg-white/10 cursor-pointer";
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
            activeTabBtn.className = "tab-btn active px-4 py-2 rounded-lg font-bold transition-all text-[#00f0ff] bg-white/10 cursor-pointer";
        }
    }

    window.showMsg(`Theme updated to ${themeName.toUpperCase()}`);
};

// --- LANGUAGE SELECTOR LOGIC ---
const PORTAL_TRANSLATIONS = {
    en: {
        navGames: "GAMES",
        navChat: "CHAT",
        navNews: "NEWS",
        navSettings: "SETTINGS",
        navMenu: "Tabs Menu",
        searchPlaceholder: "Search unblocked games...",
        settingsTitle: "Portal Settings & Customization",
        themeTitle: "🎨 Theme Selector",
        themeDesc: "Toggle between light mode and dark mode for comfortable navigation.",
        wallpaperTitle: "🌌 Page Wallpaper Selector",
        wallpaperDesc: "Personalize your gaming portal with premium preset backgrounds or import your own animated GIF / image.",
        langTitle: "🌐 Language Selector",
        langDesc: "Choose your preferred language for portal controls and interface.",
        latestUpdates: "Latest Portal Updates",
        msg: "Language set to English"
    },
    es: {
        navGames: "JUEGOS",
        navChat: "CHAT",
        navNews: "NOTICIAS",
        navSettings: "CONFIGURACIÓN",
        navMenu: "Menú de Pestañas",
        searchPlaceholder: "Buscar juegos desbloqueados...",
        settingsTitle: "Configuración y Personalización del Portal",
        themeTitle: "🎨 Selector de Tema",
        themeDesc: "Cambia entre modo claro y modo oscuro para una navegación cómoda.",
        wallpaperTitle: "🌌 Selector de Fondo de Pantalla",
        wallpaperDesc: "Personaliza tu portal con fondos predeterminados o importa tu propio GIF/imagen.",
        langTitle: "🌐 Selector de Idioma",
        langDesc: "Selecciona tu idioma preferido para los controles del portal.",
        latestUpdates: "Últimas Actualizaciones del Portal",
        msg: "Idioma cambiado a Español"
    },
    fr: {
        navGames: "JEUX",
        navChat: "CHAT",
        navNews: "NOUVELLES",
        navSettings: "PARAMÈTRES",
        navMenu: "Menu Onglets",
        searchPlaceholder: "Rechercher des jeux débloqués...",
        settingsTitle: "Paramètres et Personnalisation du Portail",
        themeTitle: "🎨 Sélecteur de Thème",
        themeDesc: "Basculez entre le mode clair et sombre pour une navigation confortable.",
        wallpaperTitle: "🌌 Sélecteur de Fond d'Écran",
        wallpaperDesc: "Personnalisez votre portail avec des fonds d'écran prédéfinis ou importez votre GIF.",
        langTitle: "🌐 Sélecteur de Langue",
        langDesc: "Choisissez votre langue préférée pour l'interface du portail.",
        latestUpdates: "Dernières Mises à Jour du Portail",
        msg: "Langue configurée en Français"
    },
    de: {
        navGames: "SPIELE",
        navChat: "CHAT",
        navNews: "NEUIGKEITEN",
        navSettings: "EINSTELLUNGEN",
        navMenu: "Tabs Menü",
        searchPlaceholder: "Unblockierte Spiele suchen...",
        settingsTitle: "Portal Einstellungen & Anpassung",
        themeTitle: "🎨 Themen-Auswahl",
        themeDesc: "Wechseln Sie zwischen hellem und dunklem Modus für bequeme Navigation.",
        wallpaperTitle: "🌌 Hintergrundbild-Auswahl",
        wallpaperDesc: "Personalisieren Sie Ihr Portal mit Vorlagen oder eigenen GIFs.",
        langTitle: "🌐 Sprachauswahl",
        langDesc: "Wählen Sie Ihre bevorzugte Sprache für die Steuerung aus.",
        latestUpdates: "Neueste Portal-Updates",
        msg: "Sprache auf Deutsch eingestellt"
    },
    ja: {
        navGames: "ゲーム",
        navChat: "チャット",
        navNews: "ニュース",
        navSettings: "設定",
        navMenu: "タブメニュー",
        searchPlaceholder: "ゲームを検索...",
        settingsTitle: "ポータル設定とカスタマイズ",
        themeTitle: "🎨 テーマ選択",
        themeDesc: "ライトモードとダークモードを切り替えます。",
        wallpaperTitle: "🌌 壁紙セレクター",
        wallpaperDesc: "背景画像をプリセットやオリジナルGIFにカスタマイズ。",
        langTitle: "🌐 言語選択",
        langDesc: "ポータルの表示言語を選択します。",
        latestUpdates: "最新アップデート",
        msg: "言語を日本語に設定しました"
    },
    pt: {
        navGames: "JOGOS",
        navChat: "CHAT",
        navNews: "NOTÍCIAS",
        navSettings: "CONFIGURAÇÕES",
        navMenu: "Menu de Abas",
        searchPlaceholder: "Pesquisar jogos desbloqueados...",
        settingsTitle: "Configurações e Personalização do Portal",
        themeTitle: "🎨 Seletor de Tema",
        themeDesc: "Alterne entre o modo claro e escuro para navegação confortável.",
        wallpaperTitle: "🌌 Seletor de Plano de Fundo",
        wallpaperDesc: "Personalize seu portal com planos de fundo predefinidos ou importe seu GIF.",
        langTitle: "🌐 Seletor de Idioma",
        langDesc: "Escolha seu idioma preferido para a interface do portal.",
        latestUpdates: "Últimas Atualizaciones do Portal",
        msg: "Idioma definido para Português"
    }
};

window.setLanguage = function (lang, showToast = true) {
    const t = PORTAL_TRANSLATIONS[lang] || PORTAL_TRANSLATIONS.en;
    localStorage.setItem('qtx_language', lang);

    // Update Language Button States
    ['en', 'es', 'fr', 'de', 'ja', 'pt'].forEach(code => {
        const btn = document.getElementById(`lang-btn-${code}`);
        if (btn) {
            if (code === lang) {
                btn.className = "px-3 py-2.5 rounded-xl border text-center transition-all font-mono text-xs font-bold cursor-pointer bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.2)]";
            } else {
                btn.className = "px-3 py-2.5 rounded-xl border text-center transition-all font-mono text-xs font-bold cursor-pointer bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20 flex items-center justify-center gap-1.5";
            }
        }
    });

    // Update DOM text elements if present
    const elemMap = {
        'nav-lbl-games': t.navGames,
        'nav-lbl-chat': t.navChat,
        'nav-lbl-news': t.navNews,
        'nav-lbl-settings': t.navSettings,
        'lbl-settings-title': t.settingsTitle,
        'lbl-theme-title': t.themeTitle,
        'lbl-theme-desc': t.themeDesc,
        'lbl-wallpaper-title': t.wallpaperTitle,
        'lbl-wallpaper-desc': t.wallpaperDesc,
        'lbl-lang-title': t.langTitle,
        'lbl-lang-desc': t.langDesc
    };

    Object.keys(elemMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = elemMap[id];
    });

    // Update search placeholder
    const searchInput = document.getElementById('game-search');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    if (showToast && window.showMsg) {
        window.showMsg(t.msg);
    }
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
        txt += "   RE-VOLT PORTAL - UNBLOCKED WEB GAMES DIRECTORY\n";
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
    invader: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2300f0ff"><path d="M6 2h12v2H6zm-2 2h16v2H4zm-2 2h20v2H2zm0 2h6v2H2zm14 0h6v2h-6zm-14 2h20v2H2zm4 2h12v2H6zm-2 2h4v2H4zm12 0h4v2h-4z"/></svg>',
    coin: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%23ffd700"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6" stroke="%23b8860b" stroke-width="2"/></svg>',
    fire_blue: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2300bfff"><path d="M12 2c0 0-6 4-6 10a6 6 0 0012 0c0-6-6-10-6-10z"/></svg>',
    fire_green: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2300f0ff"><path d="M12 2c0 0-6 4-6 10a6 6 0 0012 0c0-6-6-10-6-10z"/></svg>',
    slime: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2332cd32"><path d="M12 4c-5 0-9 4-9 9 0 3 2 5 5 5h8c3 0 5-2 5-5 0-5-4-9-9-9z"/></svg>',
    bat: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%23a855f7"><path d="M12 6l3 4h4l-3 4 1 5-5-3-5 3 1-5-3-4h4z"/></svg>',
    cube: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2300ffff"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
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
                btn.className = "px-3 py-2.5 rounded-lg border text-center transition-all font-mono text-xs font-bold cursor-pointer bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff]";
            } else {
                btn.className = "px-3 py-2.5 rounded-lg border text-center transition-all font-mono text-xs font-bold cursor-pointer bg-black/40 border-white/10 text-gray-300 hover:text-[#00f0ff] hover:border-[#00f0ff]/30";
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
    } else if (type === 'matrix') {
        welcome.style.backgroundColor = '#020202';
        welcome.style.backgroundImage = PRESET_WALLPAPERS.matrix;
        welcome.style.backgroundSize = '20px 20px';
    } else if (type === 'custom' && customUrl) {
        welcome.style.backgroundImage = `url('${customUrl}')`;
        welcome.style.backgroundSize = 'cover';
        welcome.style.backgroundPosition = 'center';
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
                dragText.className = "text-xs text-[#00f0ff] font-mono font-bold";
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
        badge.className = 'text-[10px] text-[#00f0ff] font-mono font-bold';
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
            dragZone.classList.add('border-[#00f0ff]/60', 'bg-black/50');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dragZone.addEventListener(eventName, () => {
            dragZone.classList.remove('border-[#00f0ff]/60', 'bg-black/50');
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
    // Restore Saved Language
    const savedLang = localStorage.getItem('qtx_language') || 'en';
    window.setLanguage(savedLang, false);

    // Restore Saved Theme
    const savedTheme = localStorage.getItem('qtx-theme') || 'dark';
    window.setTheme(savedTheme);

    // Restore Saved Wallpaper
    const savedWallpaper = localStorage.getItem('qtx-wallpaper-type') || 'cosmic';
    window.selectWallpaper(savedWallpaper);

    // Initialize Wallpaper Drag & Drop Area
    initWallpaperDragAndDrop();

    // Restore Saved Left Sprite
    const savedLeftSprite = localStorage.getItem('qtx-left-sprite') || 'none';
    const leftSelect = document.getElementById('left-sprite-select');
    if (leftSelect) {
        leftSelect.value = savedLeftSprite;
    }
    window.changeLeftSprite(savedLeftSprite);

    // Restore Saved Right Sprite
    const savedRightSprite = localStorage.getItem('qtx-right-sprite') || 'none';
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

    // Restore Tab Lock States & UI
    if (window.updateTabLockUI) {
        window.updateTabLockUI();
    }

    // Initialize real-time anonymous board
    initChatroom();
}

// --- REAL-TIME ANONYMOUS CHATROOM ---
const AVATAR_PRESETS = {
    'default': `<svg xmlns="http://www.w3.org/2000/svg" class="w-full h-full p-1.5 text-[#00f0ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'cyber': `<svg xmlns="http://www.w3.org/2000/svg" class="w-full h-full p-1.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 10h.01M15 10h.01M9 15h6"/></svg>`,
    'gamer': `<svg xmlns="http://www.w3.org/2000/svg" class="w-full h-full p-1.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><rect width="20" height="12" x="2" y="6" rx="6"/></svg>`,
    'shield': `<svg xmlns="http://www.w3.org/2000/svg" class="w-full h-full p-1.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`
};

function getAvatarHtml(avatar, sizeClass = 'w-6 h-6', extraClasses = '') {
    if (!avatar || avatar === '👾' || (avatar.length <= 4 && !avatar.startsWith('http') && !avatar.startsWith('preset:'))) {
        avatar = 'preset:default';
    }
    if (avatar.startsWith('preset:')) {
        const key = avatar.replace('preset:', '');
        const svg = AVATAR_PRESETS[key] || AVATAR_PRESETS['default'];
        return `<div class="${sizeClass} ${extraClasses} flex items-center justify-center rounded-lg bg-black/60 border border-white/10 shrink-0 overflow-hidden">${svg}</div>`;
    }
    const isUrl = avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image/');
    if (isUrl) {
        return `<img src="${avatar}" class="${sizeClass} ${extraClasses} rounded-lg object-cover border border-white/10 shrink-0" alt="avatar" onerror="this.outerHTML='<div class=\\'${sizeClass} flex items-center justify-center rounded-lg bg-black/60 border border-white/10 shrink-0 overflow-hidden\\'>${AVATAR_PRESETS['default'].replace(/'/g, "\\'")}</div>'">`;
    }
    return `<div class="${sizeClass} ${extraClasses} flex items-center justify-center rounded-lg bg-black/60 border border-white/10 shrink-0 overflow-hidden">${AVATAR_PRESETS['default']}</div>`;
}

let currentChatRoom = 'global';
let chatNickname = localStorage.getItem('qtx-chat-nickname') || ('Anon#' + Math.floor(1000 + Math.random() * 9000));
let savedPfp = localStorage.getItem('qtx-chat-pfp');
if (!savedPfp || savedPfp === '👾' || (savedPfp.length <= 4 && !savedPfp.startsWith('http') && !savedPfp.startsWith('preset:'))) {
    savedPfp = 'preset:default';
}
let chatPfp = savedPfp;
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
let lockedRoomsList = [];
let roomExpirationsList = {};
let chatPollInterval = null;
let activeChatMessages = [];
let currentChatSearchQuery = '';

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
                dragZone.classList.add('border-[#00f0ff]/60', 'bg-black/50');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dragZone.addEventListener(eventName, () => {
                dragZone.classList.remove('border-[#00f0ff]/60', 'bg-black/50');
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

    // Stop polling since chat is currently closed
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
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

    if (headerAvatar) {
        headerAvatar.innerHTML = getAvatarHtml(chatPfp, 'w-5 h-5');
    }

    if (previewAvatar) {
        previewAvatar.innerHTML = getAvatarHtml(chatPfp, 'w-full h-full');
    }

    if (discordSidebarAvatarContainer) {
        discordSidebarAvatarContainer.innerHTML = `
            ${getAvatarHtml(chatPfp, 'w-full h-full')}
            <span class="absolute bottom-[-2px] right-[-2px] w-2.5 h-2.5 bg-emerald-400 border border-[#090a0f] rounded-full animate-pulse shadow-glow z-10"></span>
        `;
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
            btnProfile.className = "w-full text-left px-3 py-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] font-bold text-xs transition-all cursor-pointer flex items-center gap-2 border border-[#00f0ff]/15";
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
            btnProtection.className = "w-full text-left px-3 py-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] font-bold text-xs transition-all cursor-pointer flex items-center gap-2 border border-[#00f0ff]/15";
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

// Select SVG Preset avatar
window.selectPfpPreset = function(presetKey) {
    chatPfp = `preset:${presetKey}`;
    localStorage.setItem('qtx-chat-pfp', chatPfp);
    updateChatIdentityUI();
    
    // Hide custom URL container
    const customContainer = document.getElementById('custom-pfp-container');
    if (customContainer) customContainer.classList.add('hidden');
};

window.selectPfpIcon = function(icon) {
    window.selectPfpPreset('default');
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
        dragText.classList.add('text-[#00f0ff]');
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
        dragText.classList.remove('text-[#00f0ff]');
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
        const data = await res.json();
        if (data && typeof data === 'object' && data.counts) {
            chatRoomsList = data.counts;
            lockedRoomsList = data.lockedRooms || [];
            roomExpirationsList = data.expirations || {};
        } else {
            chatRoomsList = data || {};
            lockedRoomsList = [];
            roomExpirationsList = {};
        }
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
        const isLocked = lockedRoomsList.includes(room);
        const icon = room === 'global' ? '🌍' : (isLocked ? '🔒' : '💬');
        
        let expTag = '';
        if (roomExpirationsList[room] && roomExpirationsList[room].expiresAt) {
            const msLeft = roomExpirationsList[room].expiresAt - Date.now();
            if (msLeft > 0) {
                const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
                expTag = `<span class="text-[8px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-1 py-0.5 rounded ml-1" title="Auto-deletes in ~${hoursLeft}h">⏳ ${hoursLeft}h</span>`;
            }
        }

        const btnClass = isActive 
            ? "flex items-center justify-between w-full text-left px-3 py-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff] font-bold cursor-pointer transition-all"
            : "flex items-center justify-between w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer transition-all";

        html += `
            <button onclick="window.selectChatRoom('${room}')" class="${btnClass}">
                <span class="truncate flex items-center gap-1">${icon} <span>${room}</span>${expTag}</span>
                <span class="text-[9px] ${isActive ? 'bg-[#00f0ff]/20 text-white' : 'bg-white/10 text-gray-400'} px-1.5 py-0.5 rounded shrink-0">${count}</span>
            </button>
        `;
    });

    listContainer.innerHTML = html;
}

// Switch Chat Room
window.selectChatRoom = function(roomName, customPassword) {
    if (!roomName) return;
    currentChatRoom = roomName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    if (!currentChatRoom) currentChatRoom = 'global';
    
    if (customPassword) {
        localStorage.setItem('qtx_room_pass_' + currentChatRoom, customPassword);
    }

    const roomEl = document.getElementById('chat-current-room');
    if (roomEl) {
        const isLocked = lockedRoomsList.includes(currentChatRoom);
        let expText = '';
        if (roomExpirationsList[currentChatRoom] && roomExpirationsList[currentChatRoom].expiresAt) {
            const msLeft = roomExpirationsList[currentChatRoom].expiresAt - Date.now();
            if (msLeft > 0) {
                const hrsLeft = Math.ceil(msLeft / (1000 * 60 * 60));
                expText = ` <span class="text-[10px] text-cyan-300 font-mono font-normal">⏳ (${hrsLeft}h left)</span>`;
            }
        }
        roomEl.innerHTML = (isLocked ? '🔒 ' : '') + currentChatRoom + expText;
    }
    
    renderChatRooms();
    fetchChatMessages(true); // force scroll to bottom
};

// Create or join a private room
window.createOrJoinRoom = async function(customName, customPassword, customExpiration) {
    const nameInput = document.getElementById('new-room-name');
    let rawVal = customName || (nameInput ? nameInput.value : '');
    if (!rawVal) return;

    const roomVal = rawVal.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    if (!roomVal) {
        window.showMsg("Enter a valid room name (letters/numbers/hyphens only)!");
        return;
    }
    if (nameInput) nameInput.value = '';

    const pass = customPassword !== undefined ? customPassword : (localStorage.getItem('qtx_room_pass_' + roomVal) || '');
    const expVal = customExpiration !== undefined ? customExpiration : 24;

    try {
        const response = await fetch('/api/chat/create-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName: roomVal, username: chatNickname, password: pass, expiresInHours: expVal })
        });
        const data = await response.json();
        if (response.ok) {
            window.showMsg(`✅ ${data.message || 'Room created!'}`);
            if (pass) {
                localStorage.setItem('qtx_room_pass_' + (data.room || roomVal), pass);
            }
            window.selectChatRoom(data.room || roomVal, pass);
            await fetchChatRooms();
            window.closeCreateRoomModal();
        } else {
            window.showMsg("❌ " + (data.error || "Failed to create/join room."));
            if (data.isLocked) {
                window.openUnlockRoomModal(roomVal);
            }
        }
    } catch (e) {
        console.error("Error creating room:", e);
        window.showMsg("Server error trying to create room.");
        window.selectChatRoom(roomVal, pass);
        window.closeCreateRoomModal();
    }
};

window.openCreateRoomModal = function() {
    const modal = document.getElementById('create-room-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const nameInput = document.getElementById('modal-room-name');
        const passInput = document.getElementById('modal-room-password');
        const expSelect = document.getElementById('modal-room-expiration');
        if (nameInput) nameInput.value = '';
        if (passInput) passInput.value = '';
        if (expSelect) expSelect.value = '24';
        setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
    }
};

window.closeCreateRoomModal = function() {
    const modal = document.getElementById('create-room-modal');
    if (modal) modal.classList.add('hidden');
};

window.createRoomFromModal = function() {
    const nameInput = document.getElementById('modal-room-name');
    const passInput = document.getElementById('modal-room-password');
    const expSelect = document.getElementById('modal-room-expiration');
    const nameVal = nameInput ? nameInput.value : '';
    const passVal = passInput ? passInput.value : '';
    const expVal = expSelect ? expSelect.value : '24';

    if (nameVal) {
        window.createOrJoinRoom(nameVal, passVal, expVal);
    } else {
        window.showMsg("Please enter a room name!");
    }
};

window.selectPresetRoomTag = function(tag) {
    const input = document.getElementById('modal-room-name');
    if (input) {
        input.value = tag;
    }
};

window.openUnlockRoomModal = function(targetRoom) {
    const target = targetRoom || currentChatRoom;
    const modal = document.getElementById('unlock-room-modal');
    const targetSpan = document.getElementById('unlock-room-target');
    const passInput = document.getElementById('unlock-room-password');

    if (targetSpan) targetSpan.innerText = '#' + target;
    if (passInput) passInput.value = '';
    if (modal) {
        modal.dataset.room = target;
        modal.classList.remove('hidden');
        setTimeout(() => { if (passInput) passInput.focus(); }, 100);
    }
};

window.closeUnlockRoomModal = function() {
    const modal = document.getElementById('unlock-room-modal');
    if (modal) modal.classList.add('hidden');
};

window.submitRoomUnlock = function() {
    const modal = document.getElementById('unlock-room-modal');
    const passInput = document.getElementById('unlock-room-password');
    const targetRoom = modal ? modal.dataset.room || currentChatRoom : currentChatRoom;
    const passVal = passInput ? passInput.value : '';

    if (passVal) {
        localStorage.setItem('qtx_room_pass_' + targetRoom, passVal);
        window.closeUnlockRoomModal();
        window.selectChatRoom(targetRoom, passVal);
        window.showMsg("🔑 Passphrase saved for #" + targetRoom);
    } else {
        window.showMsg("Please enter the room passphrase!");
    }
};

// Fetch Chat Messages
let lastMessageCount = 0;
async function fetchChatMessages(forceScroll = false) {
    try {
        const savedPass = localStorage.getItem('qtx_room_pass_' + currentChatRoom) || '';
        const res = await fetch(`/api/chat/messages?room=${encodeURIComponent(currentChatRoom)}&password=${encodeURIComponent(savedPass)}`);
        
        if (res.status === 401) {
            const errData = await res.json();
            if (errData && errData.isLocked) {
                renderLockedRoomOverlay(currentChatRoom);
                return;
            }
        }
        
        if (!res.ok) return;
        const data = await res.json();

        if (data && data.isLocked) {
            renderLockedRoomOverlay(currentChatRoom);
            return;
        }
        
        let messages = [];
        let pinned = [];
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            messages = data.messages || [];
            pinned = data.pinned || [];
        } else if (Array.isArray(data)) {
            messages = data;
            pinned = data.filter(m => m.pinned);
        }
        
        activeChatMessages = messages;
        renderChatMessages(messages, forceScroll);
        renderPinnedMessages(pinned);
    } catch (err) {
        console.error("Failed to load chat messages:", err);
    }
}

function renderLockedRoomOverlay(roomName) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-6 font-mono text-white">
            <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
                🔒
            </div>
            <div class="flex flex-col gap-1 max-w-sm">
                <h3 class="text-sm font-bold text-amber-400 uppercase tracking-wider">Room #${roomName} is Locked</h3>
                <p class="text-xs text-gray-400 font-sans">This private room is password protected. Enter the correct passphrase to read and post messages.</p>
            </div>
            <button onclick="window.openUnlockRoomModal('${roomName}')" class="bg-amber-400 hover:bg-amber-300 text-black font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2">
                <span>🔑</span> ENTER PASSPHRASE
            </button>
        </div>
    `;
}

// Format raw links into nice active styled clickable anchors safely
function formatLinks(text) {
    const urlPattern = /(\b(https?:\/\/|www\.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, (url) => {
        const href = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline hover:text-[#00f0ff] transition-all font-mono break-all">${url}</a>`;
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
        const avatarHtml = `<div class="mr-1.5 inline-block align-middle shrink-0">${getAvatarHtml(msg.avatar, 'w-4 h-4')}</div>`;

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

    let displayedMessages = messages;
    if (currentChatSearchQuery) {
        displayedMessages = messages.filter(msg => {
            const query = currentChatSearchQuery.replace(/^@/, '');
            const matchesUser = (msg.username || '').toLowerCase().includes(query) || 
                                (msg.displayName || '').toLowerCase().includes(query);
            const matchesText = (msg.text || '').toLowerCase().includes(currentChatSearchQuery);
            return matchesUser || matchesText;
        });
    }

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-xs">
                No messages in this channel yet. Be the first to start the board!
            </div>
        `;
        return;
    }

    if (displayedMessages.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400 font-mono text-xs p-8 text-center gap-2">
                <span>🔍 No messages match your search filter "${escapeHTML(currentChatSearchQuery)}".</span>
                <button onclick="window.clearChatSearch()" class="text-[10px] text-[#00f0ff] hover:underline bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-2.5 py-1 rounded-lg mt-2 cursor-pointer">
                    Clear Search
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    displayedMessages.forEach(msg => {
        const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const cleanUser = escapeHTML(msg.username || 'Anonymous');
        const cleanDisplayName = escapeHTML(msg.displayName || msg.username || 'Anonymous');
        const cleanBio = escapeHTML(msg.bio || '🎮 Just exploring the unblocked retro gaming sandbox! 🔥');
        const cleanText = formatLinks(escapeHTML(msg.text || ''));
        const cleanBanner = escapeHTML(msg.banner || '');
        
        // Render PFP / Avatar (Clickable to show Discord profile)
        const avatarHtml = `<div class="cursor-pointer hover:opacity-80 transition-all inline-block shrink-0" onclick="window.showDiscordProfile('${cleanUser}', '${cleanDisplayName}', '${cleanBio}', '${escapeHTML(msg.avatar || '')}', '${msg.color || '#00f0ff'}', '${cleanBanner}')">${getAvatarHtml(msg.avatar, 'w-6 h-6')}</div>`;

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
                        <button onclick="window.zoomChatImage('${escapeHTML(msg.video)}', 'video')" class="bg-black/80 hover:bg-[#00f0ff]/20 hover:text-[#00f0ff] text-white font-mono text-[9px] px-2 py-1 rounded border border-white/15 transition-all cursor-pointer">
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
                <div class="mt-3 bg-black/40 hover:bg-black/60 border border-[#00f0ff]/15 hover:border-[#00f0ff]/30 rounded-xl p-3 max-w-full md:max-w-md flex items-center justify-between gap-3 font-mono transition-all">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-2xl shrink-0">📄</span>
                        <div class="flex flex-col min-w-0">
                            <span class="text-xs text-white font-bold truncate max-w-[200px]">${cleanFileName}</span>
                            <span class="text-[10px] text-gray-500">${sizeStr || 'Unspecified size'}</span>
                        </div>
                    </div>
                    <a href="${escapeHTML(msg.fileData)}" download="${cleanFileName}" class="shrink-0 text-[10px] font-bold text-[#00f0ff] hover:text-[#00f0ff]/80 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/15 px-3 py-1.5 rounded-lg border border-[#00f0ff]/25 hover:border-[#00f0ff]/40 transition-all cursor-pointer flex items-center gap-1">
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
                            <span class="font-bold font-sans text-xs text-white hover:underline cursor-pointer" style="color: ${msg.color || '#00f0ff'}" onclick="window.showDiscordProfile('${cleanUser}', '${cleanDisplayName}', '${cleanBio}', '${escapeHTML(msg.avatar || '')}', '${msg.color || '#00f0ff'}', '${cleanBanner}')">${cleanDisplayName}</span>
                            <span class="text-[9px] font-mono text-gray-500 cursor-pointer hover:text-gray-400" onclick="window.showDiscordProfile('${cleanUser}', '${cleanDisplayName}', '${cleanBio}', '${escapeHTML(msg.avatar || '')}', '${msg.color || '#00f0ff'}', '${cleanBanner}')">@${cleanUser}</span>
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

// Search & Filter Chat Messages
window.filterChatMessages = function() {
    const input = document.getElementById('chat-search-input');
    const clearBtn = document.getElementById('chat-search-clear');
    if (!input) return;

    currentChatSearchQuery = input.value.trim().toLowerCase();

    if (currentChatSearchQuery) {
        if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
        if (clearBtn) clearBtn.classList.add('hidden');
    }

    renderChatMessages(activeChatMessages, false);
};

window.clearChatSearch = function() {
    const input = document.getElementById('chat-search-input');
    if (input) input.value = '';
    currentChatSearchQuery = '';
    const clearBtn = document.getElementById('chat-search-clear');
    if (clearBtn) clearBtn.classList.add('hidden');
    renderChatMessages(activeChatMessages, false);
};

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
        const roomPass = localStorage.getItem('qtx_room_pass_' + currentChatRoom) || '';
        const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room: currentChatRoom,
                password: roomPass,
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
            
            if (errData.isLocked || res.status === 401) {
                window.openUnlockRoomModal(currentChatRoom);
                window.showMsg("🔒 Passphrase required to post in #" + currentChatRoom);
            } else if (errData.warning) {
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

    const accentColor = color || '#00f0ff';
    const avatarMarkup = getAvatarHtml(avatarUrl, 'w-20 h-20', 'rounded-xl border-2 border-solid');

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
                            <span>Active in <span class="text-[#00f0ff] font-bold">Retro Unblocked Sandbox</span></span>
                        </div>
                    </div>
                </div>

                <!-- Action Button -->
                <button onclick="window.closeDiscordProfile()" class="w-full mt-4 bg-black/40 hover:bg-[#00f0ff]/10 border border-solid text-xs font-bold py-2.5 px-4 rounded-lg transition-all focus:outline-none shadow-md cursor-pointer flex items-center justify-center gap-1.5" style="color: ${accentColor}; border-color: ${accentColor}40">
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

// News Voting (W / L) System
window.initNewsVotes = function() {
    const votes = JSON.parse(localStorage.getItem('qtx_news_votes') || '{"w": 1, "l": 0, "userVote": null}');
    const wCountEl = document.getElementById('news-w-count');
    const lCountEl = document.getElementById('news-l-count');
    const wBtn = document.getElementById('news-w-btn');
    const lBtn = document.getElementById('news-l-btn');

    if (wCountEl) wCountEl.innerText = votes.w;
    if (lCountEl) lCountEl.innerText = votes.l;

    if (wBtn) {
        if (votes.userVote === 'W') {
            wBtn.classList.add('bg-emerald-500/30', 'ring-1', 'ring-emerald-400');
        } else {
            wBtn.classList.remove('bg-emerald-500/30', 'ring-1', 'ring-emerald-400');
        }
    }

    if (lBtn) {
        if (votes.userVote === 'L') {
            lBtn.classList.add('bg-rose-500/30', 'ring-1', 'ring-rose-400');
        } else {
            lBtn.classList.remove('bg-rose-500/30', 'ring-1', 'ring-rose-400');
        }
    }
};

window.voteNews = function(type) {
    const votes = JSON.parse(localStorage.getItem('qtx_news_votes') || '{"w": 1, "l": 0, "userVote": null}');
    
    if (votes.userVote === type) {
        // Toggle off vote
        if (type === 'W') votes.w = Math.max(0, votes.w - 1);
        if (type === 'L') votes.l = Math.max(0, votes.l - 1);
        votes.userVote = null;
    } else {
        // Remove previous vote if any
        if (votes.userVote === 'W') votes.w = Math.max(0, votes.w - 1);
        if (votes.userVote === 'L') votes.l = Math.max(0, votes.l - 1);

        // Add new vote
        if (type === 'W') votes.w += 1;
        if (type === 'L') votes.l += 1;
        votes.userVote = type;
    }

    localStorage.setItem('qtx_news_votes', JSON.stringify(votes));
    window.initNewsVotes();
};

document.addEventListener('DOMContentLoaded', () => {
    window.initNewsVotes();
});
setTimeout(() => {
    window.initNewsVotes();
}, 200);
