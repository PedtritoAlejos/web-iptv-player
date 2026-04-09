import React, { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';
import { getSeriesInfo } from '../utils/xtreamApi';
import '../styles/Modals.css';

const SeriesModal = ({ series, credentials, fallbackImage, onClose, onPlayEpisode }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      const res = await getSeriesInfo(credentials.url, credentials.username, credentials.password, series.series_id || series.stream_id);
      
      if (isMounted) {
        if (res && res.episodes) {
          setData(res);
          // Set first available season as active
          const seasons = Object.keys(res.episodes);
          if (seasons.length > 0) {
            setActiveSeason(seasons[0]);
          }
        }
        setLoading(false);
      }
    };
    
    fetchInfo();
    return () => { isMounted = false; };
  }, [series, credentials]);

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="series-modal" style={{justifyContent: 'center', alignItems: 'center', minHeight: '300px'}}>
          <h2 style={{color: '#A0A0A0'}}>Cargando Temporadas...</h2>
        </div>
      </div>
    );
  }

  if (!data || !data.episodes) {
    return (
      <div className="modal-overlay">
        <div className="series-modal" style={{justifyContent: 'center', alignItems: 'center', minHeight: '300px'}}>
          <button className="modal-close-btn" onClick={onClose}><X size={28} /></button>
          <h2 style={{color: 'var(--color-error)'}}>Error al cargar información de la serie.</h2>
        </div>
      </div>
    );
  }

  const { info, episodes } = data;
  const seasons = Object.keys(episodes);
  const currentEpisodes = episodes[activeSeason] || [];

  return (
    <div className="modal-overlay">
      <div className="series-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" style={{zIndex: 10}} onClick={onClose}><X size={32} /></button>
        
        {/* Header Metadata */}
        <div className="series-header-info">
          <img 
            src={info.cover || series.stream_icon || fallbackImage} 
            alt={info.name || series.name} 
            className="series-poster"
            onError={(e) => { e.target.src = fallbackImage; }}
          />
          <div className="series-details">
            <h1 style={{fontSize: '2.5rem', marginBottom: '10px', fontWeight: 800}}>{info.name || series.name}</h1>
            
            <div className="series-meta">
              {info.rating && info.rating !== "0" && <span className="rating">★ {info.rating}</span>}
              {info.releaseDate && <span>{info.releaseDate}</span>}
              {info.genre && <span>{info.genre}</span>}
            </div>
            
            <div className="series-plot">
              {info.plot || "No hay sinopsis disponible para esta serie."}
            </div>
            
            <div style={{color: 'var(--color-text-muted)', fontSize: '0.9rem'}}>
              <strong>Elenco:</strong> {info.cast || "Desconocido"}
            </div>
          </div>
        </div>

        {/* Seasons Tab Bar */}
        <div className="season-tabs">
          {seasons.map(seasonNum => (
            <button 
              key={`season-${seasonNum}`}
              className={`season-tab ${activeSeason === seasonNum ? 'active' : ''}`}
              onClick={() => setActiveSeason(seasonNum)}
            >
              Temporada {seasonNum}
            </button>
          ))}
        </div>

        {/* Episodes Explorer */}
        <div className="episodes-list">
          {currentEpisodes.map((ep, idx) => {
            const epImage = ep.info?.movie_image || ep.info?.cover || fallbackImage;
            
            return (
              <div 
                key={ep.id} 
                className="episode-card"
                onClick={() => onPlayEpisode({
                  ...ep,
                  stream_id: ep.id,
                  name: ep.title || `Episodio ${ep.episode_num}`,
                  stream_type: 'series',
                  container_extension: ep.container_extension || 'mp4',
                  stream_icon: epImage
                })}
              >
                <img 
                  className="episode-thumb" 
                  src={epImage} 
                  alt={ep.title} 
                  onError={(e) => { e.target.src = fallbackImage; }}
                />
                <div className="episode-info">
                  <div className="episode-num">S{activeSeason} E{ep.episode_num || (idx + 1)}</div>
                  <div className="episode-title">{ep.title || `Episodio ${idx + 1}`}</div>
                </div>
                <Play className="play-icon" style={{position: 'static', opacity: 0.5, transform: 'none'}} size={24} />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default SeriesModal;
