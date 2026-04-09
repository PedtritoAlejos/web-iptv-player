import React, { useState, useEffect, useMemo } from 'react';
import { X, Play } from 'lucide-react';
import { getLiveStreams, getVodStreams, getSeriesStreams } from '../utils/xtreamApi';
import '../styles/Modals.css';

const SearchOverlay = ({ onClose, credentials, fallbackImage, setActiveStream }) => {
  const [query, setQuery] = useState('');
  const [globalPool, setGlobalPool] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the entire universal database quietly
  useEffect(() => {
    let isMounted = true;
    const fetchUniversal = async () => {
      try {
        const [live, vod, series] = await Promise.allSettled([
          getLiveStreams(credentials.url, credentials.username, credentials.password),
          getVodStreams(credentials.url, credentials.username, credentials.password),
          getSeriesStreams(credentials.url, credentials.username, credentials.password)
        ]);
        
        let pool = [];
        
        if (live.status === 'fulfilled' && live.value) {
          pool = pool.concat(live.value.map(s => ({...s, stream_type: 'live', name: s.name})));
        }
        if (vod.status === 'fulfilled' && vod.value) {
          pool = pool.concat(vod.value.map(s => ({...s, stream_type: 'movie', name: s.name, container_extension: s.container_extension || 'mp4'})));
        }
        if (series.status === 'fulfilled' && series.value) {
          pool = pool.concat(series.value.map(s => ({
            ...s, stream_type: 'series', name: s.name || s.title, 
            stream_id: s.series_id, container_extension: s.container_extension || 'mp4',
            stream_icon: s.cover || s.pic
          })));
        }
        
        if(isMounted) {
          setGlobalPool(pool);
          setLoading(false);
        }
      } catch(e) {
         console.error('Search pool error', e);
         if(isMounted) setLoading(false);
      }
    };
    
    fetchUniversal();
    return () => { isMounted = false; };
  }, [credentials]);

  const filteredResults = useMemo(() => {
    if (!query || query.length < 2) return [];
    const lowerQ = query.toLowerCase();
    return globalPool.filter(s => s.name?.toLowerCase().includes(lowerQ)).slice(0, 50); // limit to top 50 matches for perf
  }, [query, globalPool]);

  return (
    <div className="search-overlay">
      <div className="search-container">
        <div className="search-header">
           <input 
             type="text" 
             className="search-input" 
             placeholder="Busca canales, series, películas..." 
             autoFocus
             value={query}
             onChange={(e) => setQuery(e.target.value)}
           />
           <button className="icon-btn" onClick={onClose} style={{ position:'absolute', right: 0 }}>
             <X size={36} />
           </button>
        </div>

        {loading && <div style={{textAlign:'center', color:'#A0A0A0', fontSize:'1.2rem'}}>Indexando contenido universal...</div>}

        <div className="search-results">
          {!loading && query.length >= 2 && filteredResults.length === 0 && (
             <h3 style={{color: '#A0A0A0'}}>No hay resultados para "{query}"</h3>
          )}
          {filteredResults.map((stream, idx) => (
             <div 
               key={`search-${stream.stream_id || idx}`} 
               className="channel-card" 
               onClick={() => {
                 setActiveStream(stream);
                 onClose();
               }}
               style={{ width: '100%', minWidth: '180px' }}
             >
               <img src={stream.stream_icon || fallbackImage} alt={stream.name} onError={(e) => { e.target.src = fallbackImage; }} />
               <div className="channel-info">
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{stream.name}</span>
                  <div style={{fontSize: '0.7rem', color: 'var(--color-accent)', textTransform: 'uppercase'}}>{stream.stream_type}</div>
               </div>
               <Play className="play-icon" size={40} />
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
