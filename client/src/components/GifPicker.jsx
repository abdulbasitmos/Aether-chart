import React, { useState, useRef, useCallback } from 'react';
import { FiSearch, FiTrendingUp } from 'react-icons/fi';

const TENOR_API_KEY = 'AIzaSyDeXxAF0P2pGd9WIFl7R6Y6GqFY0H2P-LA';
const TENOR_CLIENT_KEY = 'aetherchat';
const TRENDING_GIFS = [
  { id: 'tg1', url: 'https://media.tenor.com/-gP6VhUz_IcAAAAC/hello-hi.gif', preview: 'https://media.tenor.com/-gP6VhUz_IcAAAAM/hello-hi.gif' },
  { id: 'tg2', url: 'https://media.tenor.com/HGzW0E-M9TAAAAAC/laughing-laugh.gif', preview: 'https://media.tenor.com/HGzW0E-M9TAAAAAM/laughing-laugh.gif' },
  { id: 'tg3', url: 'https://media.tenor.com/vhL_dGzgk8sAAAAC/celebrate-party.gif', preview: 'https://media.tenor.com/vhL_dGzgk8sAAAAM/celebrate-party.gif' },
  { id: 'tg4', url: 'https://media.tenor.com/4PTV6D0jL4cAAAAC/thumbs-up-ok.gif', preview: 'https://media.tenor.com/4PTV6D0jL4cAAAAM/thumbs-up-ok.gif' },
  { id: 'tg5', url: 'https://media.tenor.com/KOEOBFeRRUcAAAAC/sad-cry.gif', preview: 'https://media.tenor.com/KOEOBFeRRUcAAAAM/sad-cry.gif' },
  { id: 'tg6', url: 'https://media.tenor.com/FbC5ZG6HYtsAAAAC/wow-amazing.gif', preview: 'https://media.tenor.com/FbC5ZG6HYtsAAAAM/wow-amazing.gif' },
  { id: 'tg7', url: 'https://media.tenor.com/0Gm3Y4c_yyIAAAAC/clap-applause.gif', preview: 'https://media.tenor.com/0Gm3Y4c_yyIAAAAM/clap-applause.gif' },
  { id: 'tg8', url: 'https://media.tenor.com/8C7iP1wWJ78AAAAC/frustrated-angry.gif', preview: 'https://media.tenor.com/8C7iP1wWJ78AAAAM/frustrated-angry.gif' },
  { id: 'tg9', url: 'https://media.tenor.com/4JfQsBqwh5YAAAAC/dancing-dance.gif', preview: 'https://media.tenor.com/4JfQsBqwh5YAAAAM/dancing-dance.gif' },
  { id: 'tg10', url: 'https://media.tenor.com/sCYfF93yIS8AAAAC/okaydeal.gif', preview: 'https://media.tenor.com/sCYfF93yIS8AAAAM/okaydeal.gif' },
  { id: 'tg11', url: 'https://media.tenor.com/GB0oRMLNyiUAAAAC/thank-you-thanks.gif', preview: 'https://media.tenor.com/GB0oRMLNyiUAAAAM/thank-you-thanks.gif' },
  { id: 'tg12', url: 'https://media.tenor.com/L-pRWF3_jBERkQAAAAC/cute-cat.gif', preview: 'https://media.tenor.com/L-pRWF3_jBERkQAAAAM/cute-cat.gif' },
];

const GifPicker = ({ onSelect, theme }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('trending');
  const searchTimeout = useRef(null);

  const searchGifs = useCallback(async (q) => {
    if (!q.trim()) {
      setMode('trending');
      setResults([]);
      return;
    }
    setLoading(true);
    setMode('search');
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20&media_filter=tinygif`
      );
      const data = await res.json();
      setResults(
        (data.results || []).map((g) => ({
          id: g.id,
          url: g.media_formats?.tinygif?.url || '',
          preview: g.media_formats?.tinygif?.url || '',
        }))
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchGifs(val), 400);
  };

  const displayGifs = mode === 'trending' ? TRENDING_GIFS : results;
  const showTrendingFallback = mode === 'trending' || (mode === 'search' && results.length === 0 && !loading);

  return (
    <div className="flex flex-col h-[320px] bg-white dark:bg-[#202C33]">
      <div className="p-2 border-b border-slate-200 dark:border-white/5 shrink-0">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search GIFs..."
            className="w-full bg-slate-100 dark:bg-[#2A3942] text-[13px] text-slate-800 dark:text-[#E9EDEF] placeholder-slate-400 outline-none rounded-lg pl-9 pr-3 py-2 border border-slate-200 dark:border-white/5 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showTrendingFallback && mode === 'trending' ? (
          <div>
            <div className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <FiTrendingUp size={13} /> TRENDING
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TRENDING_GIFS.map((gif) => (
                <div
                  key={gif.id}
                  onClick={() => onSelect(gif.url)}
                  className="aspect-video rounded-lg overflow-hidden cursor-pointer hover:opacity-85 active:scale-95 transition-all border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#2A3942]"
                >
                  <img
                    src={gif.preview}
                    alt="GIF"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : displayGifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {displayGifs.map((gif) => (
              <div
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="aspect-video rounded-lg overflow-hidden cursor-pointer hover:opacity-85 active:scale-95 transition-all border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#2A3942]"
              >
                <img
                  src={gif.preview}
                  alt="GIF"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-slate-400">
            {mode === 'search' ? 'No GIFs found' : 'Search for GIFs'}
          </div>
        )}
      </div>
    </div>
  );
};

export default GifPicker;
