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
  const [isMuted, setIsMuted] = useState(true); // Start muted for mobile compatibility
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { message, details }
  
  // Detect iOS for specific compatibility adjustments
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Optimization for iOS: Force .mp4 for VOD if the extension is .mkv (not supported by Safari)
  const initialExtension = (isIOS && type !== "live" && extension === "mkv") ? "mp4" : extension;
  
  const [activeExtension, setActiveExtension] = useState(initialExtension);
  const [retryCount, setRetryCount] = useState(0);

  const streamUrl = getStreamUrl(credentials.url, credentials.username, credentials.password, streamId, type, activeExtension);
  
  // Time States
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let hls;
    const video = videoRef.current;
    if (!video) return;
    
    // Check if it's an HLS stream (m3u8)
    const isHls = streamUrl.includes('.m3u8');

    // Special logic for Safari and iOS: they prefer native HLS support
    const useNativeHls = video.canPlayType('application/vnd.apple.mpegurl');

    if (isHls && Hls.isSupported() && !useNativeHls) {
      // Use hls.js for browsers that support MSE but NOT native HLS
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
          setError({
            message: 'Error fatal de HLS',
            details: `Evento: ${event}, Tipo: ${data.type}, Detalles: ${data.details}, Fatal: ${data.fatal}`
          });
          setLoading(false);
        }
      });
    } else {
      // For Safari native HLS, iOS, or direct MP4/MKV VOD playback
      video.src = streamUrl;
      
      const handleLoadedData = () => {
        setLoading(false);
        video.play().catch(e => {
          console.log('Autoplay prevented, user interaction required:', e);
          // Some browsers still block it even if muted, but muted gives us the best chance
        });
      };

      const handleVideoError = () => {
        const mediaError = video.error;
        let details = 'Error desconocido en el elemento de video';
        if (mediaError) {
          details = `Código: ${mediaError.code}, Mensaje: ${mediaError.message || 'N/A'}`;
        }
        
        // Smart Retry Logic for iOS/Mobile
        if (type !== "live" && retryCount < 2) {
          if (activeExtension === "mp4") {
            console.log("MP4 failed, retrying with M3U8...");
            setActiveExtension("m3u8");
            setRetryCount(prev => prev + 1);
            setLoading(true);
            return;
          } else if (activeExtension === "mkv") {
            console.log("MKV failed, retrying with MP4...");
            setActiveExtension("mp4");
            setRetryCount(prev => prev + 1);
            setLoading(true);
            return;
          }
        }

        setError({
          message: 'Error de reproducción nativa',
          details: details
        });
        setLoading(false);
      };

      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleVideoError);

      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleVideoError);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
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
  
  const handleCopyError = (e) => {
    e.stopPropagation();
    if (!error) return;
    
    // Mask sensitive info for security when sharing
    const maskedUrl = streamUrl
      .replace(/password=[^&]*/, 'password=********')
      .replace(/username=[^&]*/, 'username=********');
    
    const report = `--- REPORTE DE ERROR TV-ALTOKE ---
Stream: ${name} (ID: ${streamId})
Tipo: ${type} | Ext: ${extension} (Final: ${activeExtension}, Reintentos: ${retryCount})
URL (Mascarada): ${maskedUrl}
Error: ${error.message}
Detalles: ${error.details}
Navegador: ${navigator.userAgent}
Fecha: ${new Date().toLocaleString()}
----------------------------------`;
    
    // Fallback copy function for non-secure contexts (HTTP) or restricted mobile browsers
    const fallbackCopy = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Some mobile browsers require the element to be slightly visible to allow selection
      textArea.style.position = "fixed";
      textArea.style.left = "0";
      textArea.style.top = "0";
      textArea.style.opacity = "0.01";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      let successful = false;
      try {
        successful = document.execCommand('copy');
      } catch (err) {
        successful = false;
      }
      
      if (successful) {
        showToast('Detalles del error copiados', 'success');
      } else {
        // Absolute last resort for HTTP/Restricted browsers: show a prompt with the text
        window.prompt("Copia el reporte manualmente:", text);
      }
      
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(report).then(() => {
        showToast('Detalles del error copiados', 'success');
      }).catch(() => {
        fallbackCopy(report);
      });
    } else {
      fallbackCopy(report);
    }
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
        {error && (
          <div className="player-loader" style={{ 
            color: 'var(--color-error)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px',
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '80%',
            textAlign: 'center'
          }}>
            <div>{error.message}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{error.details}</div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <button 
                className="hero-btn" 
                style={{ fontSize: '0.9rem', padding: '8px 20px', height: 'auto' }}
                onClick={handleCopyError}
              >
                Copiar Detalles
              </button>
              
              <a 
                href={`vlc://${streamUrl}`}
                className="hero-btn" 
                style={{ 
                  fontSize: '0.9rem', padding: '8px 20px', height: 'auto', 
                  backgroundColor: '#7289da', color: 'white', textDecoration: 'none' 
                }}
              >
                Abrir en VLC
              </a>
              
              <a 
                href={`nplayer-${streamUrl}`}
                className="hero-btn" 
                style={{ 
                  fontSize: '0.9rem', padding: '8px 20px', height: 'auto', 
                  backgroundColor: '#E91E63', color: 'white', textDecoration: 'none' 
                }}
              >
                nPlayer
              </a>
            </div>
          </div>
        )}
        
        <video 
          ref={videoRef}
          x-webkit-airplay="allow" 
          playsInline
          autoPlay
          muted={isMuted}
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
