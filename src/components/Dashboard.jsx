import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, Search, Settings, ChevronRight, ChevronLeft, Play, RefreshCw, 
  Compass, Tv, Film, Clapperboard 
} from 'lucide-react';
import { 
  getLiveCategories, getLiveStreams, 
  getVodCategories, getVodStreams, 
  getSeriesCategories, getSeriesStreams,
  wrapImageUrl
} from '../utils/xtreamApi';
import { initializeCastApi } from '../utils/CastHandler';
import Player from './Player';
import SearchOverlay from './SearchOverlay';
import SettingsModal from './SettingsModal';
import SeriesModal from './SeriesModal';
import { showToast } from './Toast';

const CategoryRow = ({ category, fetchStreamsFn, credentials, type, fallbackImage, setActiveStream, limit = 0 }) => {
  const [streams, setStreams] = useState(category.streams || []);
  const [loading, setLoading] = useState(!category.streams);
  const containerRef = useRef(null);

  useEffect(() => {
    if (streams.length > 0) return; // already loaded

    const observer = new IntersectionObserver(
      (entries, obs) => {
        if (entries[0].isIntersecting) {
          obs.disconnect(); // Stop observing once triggered
          loadStreams();
        }
      },
      { rootMargin: '200px' } // Pre-load slightly before it comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line
  }, [category.category_id]);

  const loadStreams = async () => {
    try {
      const res = await fetchStreamsFn(credentials.url, credentials.username, credentials.password, category.category_id);
      const normalizedStreams = (res || []).map(s => ({
        ...s,
        stream_id: s.stream_id || s.series_id,
        name: s.name || s.title,
        stream_icon: s.stream_icon || s.cover || s.pic,
        stream_type: type,
        container_extension: s.container_extension || 'mp4'
      }));
      setStreams(normalizedStreams);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && streams.length === 0) return <div ref={containerRef} style={{ display: 'none' }}></div>;

  const displayStreams = limit > 0 ? streams.slice(0, limit) : streams;

  return (
    <div className="category-row" ref={containerRef}>
      <h2 className="category-title">{category.category_name}</h2>
      <div className="grid-container">
        <div className="grid-content">
          {loading && <div style={{ padding: '20px', color: '#A0A0A0' }}>Cargando streams...</div>}
          {displayStreams.map((stream, idx) => (
            <div key={`${stream.stream_id}-${idx}`} className="channel-card" onClick={() => setActiveStream(stream)}>
              <img src={wrapImageUrl(stream.stream_icon) || fallbackImage} alt={stream.name} onError={(e) => { e.target.src = fallbackImage; }} />
              <div className="channel-info"><span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{stream.name}</span></div>
              <Play className="play-icon" size={32} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const Dashboard = ({ credentials, onLogout }) => {
  const [activeTab, setActiveTab] = useState('discovery');
  
  // Data States
  const [liveData, setLiveData] = useState({ categories: [] });
  const [movieData, setMovieData] = useState({ categories: [] });
  const [seriesData, setSeriesData] = useState({ categories: [] });
  
  // UI States
  const [activeStream, setActiveStream] = useState(null);
  const [heroStream, setHeroStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals
  const [activeSeries, setActiveSeries] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fallbackImage = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22250%22%20height%3D%22140%22%3E%3Crect%20width%3D%22250%22%20height%3D%22140%22%20fill%3D%22%23121212%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23FFEA00%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3ENo%20Logo%3C%2Ftext%3E%3C%2Fsvg%3E';

  // Smart handler to differentiate Series folder from direct Video streams
  const handleItemClick = (stream) => {
    if (stream.stream_type === 'series' && stream.series_id) {
       setActiveSeries(stream);
    } else {
       setActiveStream(stream);
    }
  };

  useEffect(() => {
    initializeCastApi();
    loadContent('live'); 
    loadContent('movie'); // Pushing these so Discovery is fast
    // eslint-disable-next-line
  }, []);

  const loadContent = async (type, bypassCache = false) => {
    setLoading(true);
    try {
      if (!bypassCache) {
        if (type === 'live' && liveData.categories.length > 0) { setLoading(false); return liveData; }
        if (type === 'movie' && movieData.categories.length > 0) { setLoading(false); return movieData; }
        if (type === 'series' && seriesData.categories.length > 0) { setLoading(false); return seriesData; }
      }

      let fetchCats = type === 'live' ? getLiveCategories : (type === 'movie' ? getVodCategories : getSeriesCategories);
      let fetchStreamsFn = type === 'live' ? getLiveStreams : (type === 'movie' ? getVodStreams : getSeriesStreams);

      const cats = await fetchCats(credentials.url, credentials.username, credentials.password, bypassCache);
      
      // Removed .slice() - Load ALL categories!
      const allCats = cats || [];
      
      // Fetch only the VERY FIRST category streams for the Hero component immediately
      let firstStreams = [];
      if (allCats.length > 0) {
         firstStreams = await fetchStreamsFn(credentials.url, credentials.username, credentials.password, allCats[0].category_id, bypassCache);
         firstStreams = (firstStreams || []).map(s => ({
            ...s,
            stream_id: s.stream_id || s.series_id,
            name: s.name || s.title,
            stream_icon: s.stream_icon || s.cover || s.pic,
            stream_type: type,
            container_extension: s.container_extension || 'mp4'
         }));
         
         // Attach the pre-fetched streams to the first category to avoid double fetch
         allCats[0].streams = firstStreams;
      }
      
      const newData = { categories: allCats, fetchStreamsFn };

      if (type === 'live') setLiveData(newData);
      if (type === 'movie') setMovieData(newData);
      if (type === 'series') setSeriesData(newData);

      if (!heroStream && firstStreams.length > 0) {
        setHeroStream(firstStreams[0]);
      }
      
      setLoading(false);
      return newData;
    } catch (error) {
      console.error(`Error loading ${type} data`, error);
      setLoading(false);
      return { categories: [] };
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reset data
    setLiveData({ categories: [] });
    setMovieData({ categories: [] });
    setSeriesData({ categories: [] });
    // Reload active tab specifically, forcing bypassCache
    await handleTabChange(activeTab, true);
    setIsRefreshing(false);
    showToast('Contenido actualizado correctamente', 'success');
  };

  const handleTabChange = async (tab, bypassCache = false) => {
    setActiveTab(tab);
    if (tab === 'live') await loadContent('live', bypassCache);
    if (tab === 'movie') await loadContent('movie', bypassCache);
    if (tab === 'series') await loadContent('series', bypassCache);
    if (tab === 'discovery') {
      await loadContent('live', bypassCache);
      await loadContent('movie', bypassCache);
    }
  };

  const renderDiscoveryMode = () => {
    // For discovery, render the first 2 categories of movie, live, series safely
    const rows = [];
    if (movieData.categories?.length > 0) rows.push(<CategoryRow key="disc_movie_0" category={movieData.categories[0]} fetchStreamsFn={getVodStreams} credentials={credentials} type="movie" fallbackImage={fallbackImage} setActiveStream={handleItemClick} />);
    if (liveData.categories?.length > 0) rows.push(<CategoryRow key="disc_live_0" category={liveData.categories[0]} fetchStreamsFn={getLiveStreams} credentials={credentials} type="live" fallbackImage={fallbackImage} setActiveStream={handleItemClick} />);
    if (seriesData.categories?.length > 0) rows.push(<CategoryRow key="disc_ser_0" category={seriesData.categories[0]} fetchStreamsFn={getSeriesStreams} credentials={credentials} type="series" fallbackImage={fallbackImage} setActiveStream={handleItemClick} />);
    
    // Add second rows if they exist
    if (liveData.categories?.length > 1) rows.push(<CategoryRow key="disc_live_1" category={liveData.categories[1]} fetchStreamsFn={getLiveStreams} credentials={credentials} type="live" fallbackImage={fallbackImage} setActiveStream={handleItemClick} />);
    
    if (rows.length === 0) {
      return <div style={{padding: '50px', textAlign: 'center'}}>Cargando Discovery...</div>;
    }
    return rows;
  };

  const renderCurrentTabData = () => {
    if (activeTab === 'discovery') return renderDiscoveryMode();
    
    let currentData = null;
    let type = '';
    let fetchFn = null;

    if (activeTab === 'live') { currentData = liveData; type = 'live'; fetchFn = getLiveStreams; }
    if (activeTab === 'movie') { currentData = movieData; type = 'movie'; fetchFn = getVodStreams; }
    if (activeTab === 'series') { currentData = seriesData; type = 'series'; fetchFn = getSeriesStreams; }

    if (!currentData || !currentData.categories || currentData.categories.length === 0) {
      return loading ? <div style={{padding: '50px'}}>Cargando contenido...</div> : <div style={{padding: '50px'}}>No hay categorías.</div>;
    }

    return (
      <div className="categories-container">
        {currentData.categories.map((cat, i) => (
          <CategoryRow 
            key={`${cat.category_id}-${i}`} 
            category={cat} 
            fetchStreamsFn={fetchFn} 
            credentials={credentials} 
            type={type} 
            fallbackImage={fallbackImage} 
            setActiveStream={handleItemClick} 
            limit={activeTab === 'discovery' ? 10 : 0}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <div className="brand-logo">TV<span>-Altoke</span></div>
        <div className="header-actions">
          <button className="icon-btn" title="Actualizar Contenido" aria-label="Actualizar" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={22} className={isRefreshing ? "spinning" : ""} />
          </button>
          <button className="icon-btn" title="Buscar" aria-label="Buscar" onClick={() => setShowSearch(true)}><Search size={22} /></button>
          <button className="icon-btn" title="Ajustes" aria-label="Ajustes" onClick={() => setShowSettings(true)}><Settings size={22} /></button>
          <button className="icon-btn" title="Cerrar Sesión" aria-label="Salir" onClick={onLogout}><LogOut size={22} /></button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button className={`nav-tab ${activeTab === 'discovery' ? 'active' : ''}`} onClick={() => handleTabChange('discovery')}>
          <Compass size={20} />
          <span>Discovery</span>
        </button>
        <button className={`nav-tab ${activeTab === 'live' ? 'active' : ''}`} onClick={() => handleTabChange('live')}>
          <Tv size={20} />
          <span>En Vivo</span>
        </button>
        <button className={`nav-tab ${activeTab === 'movie' ? 'active' : ''}`} onClick={() => handleTabChange('movie')}>
          <Film size={20} />
          <span>Películas</span>
        </button>
        <button className={`nav-tab ${activeTab === 'series' ? 'active' : ''}`} onClick={() => handleTabChange('series')}>
          <Clapperboard size={20} />
          <span>Series</span>
        </button>
      </nav>

      {activeStream && (
        <Player 
          streamId={activeStream.stream_id} 
          name={activeStream.name}
          logo={wrapImageUrl(activeStream.stream_icon)}
          type={activeStream.stream_type}
          extension={activeStream.container_extension}
          credentials={credentials}
          onClose={() => setActiveStream(null)}
        />
      )}

      <div className="hero-section" style={{ backgroundImage: `url(${wrapImageUrl(heroStream?.stream_icon) || fallbackImage})` }}>
        <div className="hero-fading"></div>
        <div className="hero-content">
          <div className="hero-meta">{activeTab.toUpperCase()} DESTACADO</div>
          <h1 className="hero-title">{heroStream?.name || 'TV-Altoke'}</h1>
          <button className="hero-btn" onClick={() => heroStream && handleItemClick(heroStream)}>
            <Play fill="black" size={20} /> Reproducir
          </button>
        </div>
      </div>

      <div className="categories-container">
        {renderCurrentTabData()}
      </div>

      {showSearch && (
        <SearchOverlay 
          onClose={() => setShowSearch(false)} 
          credentials={credentials} 
          fallbackImage={fallbackImage} 
          setActiveStream={handleItemClick} 
        />
      )}

      {activeSeries && (
        <SeriesModal
          series={activeSeries}
          credentials={credentials}
          fallbackImage={fallbackImage}
          onClose={() => setActiveSeries(null)}
          onPlayEpisode={(ep) => {
             setActiveSeries(null);
             setActiveStream(ep);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          credentials={credentials} 
          onChangeAccent={(color) => {
            document.documentElement.style.setProperty('--color-accent', color);
            // Optionally save to local storage
            localStorage.setItem('tv_altoke_color', color);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
