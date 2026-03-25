/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Search, Gamepad2, X, Maximize2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gamesData from './games.json';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const filteredGames = useMemo(() => {
    return gamesData.filter(game => 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-[#00ff00] selection:text-black">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedGame(null)}>
            <div className="w-8 h-8 bg-[#00ff00] rounded flex items-center justify-center text-black">
              <Gamepad2 size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">Unblocked Hub</h1>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-[#00ff00] transition-colors text-sm"
            />
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs font-mono uppercase text-[#666]">
            <span>{filteredGames.length} Games</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        {!selectedGame && searchQuery === '' && (
          <section className="mb-12">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#222] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl sm:text-6xl font-black uppercase italic leading-none mb-4">
                  Play Anywhere. <br />
                  <span className="text-[#00ff00]">No Limits.</span>
                </h2>
                <p className="text-[#888] text-lg mb-8">
                  The ultimate collection of unblocked web games. Fast, free, and always accessible.
                </p>
                <button 
                  onClick={() => {
                    const random = gamesData[Math.floor(Math.random() * gamesData.length)];
                    setSelectedGame(random);
                  }}
                  className="bg-[#00ff00] text-black px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <Gamepad2 size={20} />
                  Random Game
                </button>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                <div className="grid grid-cols-4 gap-2 rotate-12 scale-150">
                  {gamesData.map((g, i) => (
                    <div key={i} className="aspect-square bg-white rounded-lg shadow-2xl" />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Game Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredGames.map((game) => (
              <motion.div
                layout
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedGame(game)}
                className="group cursor-pointer bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#00ff00]/50 transition-all shadow-lg hover:shadow-[#00ff00]/10"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-[#00ff00] text-black p-3 rounded-full">
                      <Gamepad2 size={24} />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 group-hover:text-[#00ff00] transition-colors">{game.title}</h3>
                  <p className="text-[#666] text-sm line-clamp-2">{game.description}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-20">
            <div className="text-[#333] mb-4 flex justify-center">
              <Gamepad2 size={64} />
            </div>
            <h3 className="text-xl font-bold mb-2">No games found</h3>
            <p className="text-[#666]">Try searching for something else.</p>
          </div>
        )}
      </main>

      {/* Game Player Modal */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`bg-[#111] border border-[#333] rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${isFullScreen ? 'w-full h-full' : 'w-full max-w-5xl aspect-video'}`}
            >
              {/* Toolbar */}
              <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#00ff00] rounded flex items-center justify-center text-black">
                    <Gamepad2 size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold leading-none">{selectedGame.title}</h2>
                    <span className="text-[10px] uppercase tracking-widest text-[#666] font-mono">Playing Now</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-2 hover:bg-[#333] rounded-lg transition-colors text-[#888] hover:text-white"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 size={20} />
                  </button>
                  <a 
                    href={selectedGame.iframeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-[#333] rounded-lg transition-colors text-[#888] hover:text-white"
                    title="Open in New Tab"
                  >
                    <ExternalLink size={20} />
                  </a>
                  <div className="w-px h-6 bg-[#333] mx-2" />
                  <button 
                    onClick={() => {
                      setSelectedGame(null);
                      setIsFullScreen(false);
                    }}
                    className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors text-[#888]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Iframe Container */}
              <div className="flex-1 bg-black relative">
                <iframe
                  src={selectedGame.iframeUrl}
                  className="w-full h-full border-none"
                  title={selectedGame.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-[#222] py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#00ff00] rounded flex items-center justify-center text-black">
              <Gamepad2 size={14} />
            </div>
            <span className="font-bold uppercase tracking-tighter italic">Unblocked Hub</span>
          </div>
          
          <div className="flex gap-8 text-sm font-mono uppercase text-[#666]">
            <a href="#" className="hover:text-[#00ff00] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#00ff00] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#00ff00] transition-colors">Contact</a>
          </div>

          <p className="text-[#444] text-xs font-mono uppercase">
            &copy; 2026 Unblocked Games Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
