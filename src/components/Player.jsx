import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { ArrowLeft, Cast, Maximize, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getStreamUrl } from '../utils/xtreamApi';
import { loadMedia } from '../utils/CastHandler';
import { showToast } from './Toast';

const Player = ({ streamId, name, logo, type = "live", extension = "mkv", credentials, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Time States
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const streamUrl = getStreamUrl(credentials.url, credentials.username, credentials.password, streamId, type, extension);

  useEffect(() => {
    let hls;
    const video = videoRef.current;
    
    // Check if it's an HLS stream (m3u8). Live streams from Xtream are usually m3u8.
    const isHls = streamUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(e => console.log('Autoplay prevented:', e));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError(true);
          setLoading(false);
        }
      });
    } else {
      // For Safari native HLS, or direct MP4/MKV VOD playback
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        video.play().catch(e => console.log('Autoplay prevented:', e));
      });
      video.addEventListener('error', () => {
        setError(true);
        setLoading(false);
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
      video.removeEventListener('seeking', () => setLoading(true));
      video.removeEventListener('seeked', () => setLoading(false));
      video.removeEventListener('waiting', () => setLoading(true));
      video.removeEventListener('playing', () => setLoading(false));
    };
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleSeeking = () => setLoading(true);
    const handleSeeked = () => setLoading(false);
    const handleWaiting = () => setLoading(true);
    const handlePlaying = () => setLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map(v => v < 10 ? "0" + v : v)
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  const isLive = type === "live";

  const handleCast = () => {
    // Correct Order: url, title, subtitle, imageUrl, extension
    showToast('Iniciando sesión de Cast...', 'info');
    loadMedia(streamUrl, name, "TV-Altoke Stream", logo, extension);
  };

  return (
    <div className="player-overlay active" ref={containerRef}>
      <div className="player-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="icon-btn" onClick={onClose}>
            <ArrowLeft size={24} />
          </button>
          <h3 style={{ margin: 0, fontWeight: 600 }}>{name}</h3>
        </div>
        
        <div className="header-actions">
          <button className="icon-btn" onClick={handleCast} title="Google Cast">
            <Cast size={24} />
          </button>
          {/* Airplay button is native in Safari but we can include a custom trigger if needed */}
        </div>
      </div>

      <div className="video-container" onClick={togglePlay}>
        {loading && <div className="player-loader">Cargando Stream...</div>}
        {error && <div className="player-loader" style={{ color: 'var(--color-error)' }}>Error al cargar el stream.</div>}
        
        <video 
          ref={videoRef}
          x-webkit-airplay="allow" /* Apple ecosytem native support */
          playsInline
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
        
        {/* Simple Custom Controls Overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, 
          padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: '15px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          opacity: 0, transition: 'opacity 0.3s', zIndex: 1002
        }} className="player-controls">
           
           {/* Seek Bar Area */}
           {!isLive && duration > 0 && (
             <div className="seekbar-container" onClick={(e) => e.stopPropagation()}>
               <div className="time-display current">{formatTime(currentTime)}</div>
               <input 
                 type="range"
                 className="seekbar"
                 min="0"
                 max={duration}
                 value={currentTime}
                 onChange={handleSeek}
               />
               <div className="time-display duration">{formatTime(duration)}</div>
             </div>
           )}

           {isLive && (
             <div className="live-indicator" onClick={(e) => e.stopPropagation()}>
               <div className="live-dot"></div> EN VIVO
             </div>
           )}

           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', gap: '20px' }}>
               <button className="icon-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                 {isPlaying ? <Pause size={24}/> : <Play size={24}/>}
               </button>
               <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                 {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
               </button>
             </div>
             
             <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }}>
               <Maximize size={24}/>
             </button>
           </div>
        </div>
      </div>
      
      <style>{`
        .video-container:hover .player-controls {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default Player;
