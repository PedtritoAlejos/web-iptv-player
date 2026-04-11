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
  const [showManualCopy, setShowManualCopy] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  
  // Detect iOS for specific compatibility adjustments
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Optimization: Force .m3u8 for VOD as it's the most compatible format for both Apple 
  // and PC (via hls.js). Based on your provider's supported formats: [m3u8, ts, rtmp]
  const initialExtension = (type !== "live") ? "m3u8" : extension;
  
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
          if (activeExtension === "m3u8") {
            console.log("M3U8 failed, retrying with MP4...");
            setActiveExtension("mp4");
            setRetryCount(prev => prev + 1);
            setLoading(true);
            return;
          } else if (activeExtension === "mp4") {
            console.log("MP4 failed, retrying with original extension:", extension);
            setActiveExtension(extension);
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
    setDuration(videoRef.current.duration);
    setLoading(false);
    resetControlsTimeout();
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    
    // Auto-hide controls after 3 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const toggleControls = (e) => {
    e.stopPropagation();
    if (showControls) {
      setShowControls(false);
    } else {
      resetControlsTimeout();
    }
  };

  const skipForward = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      resetControlsTimeout();
    }
  };

  const skipBackward = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      resetControlsTimeout();
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
      
      // Essential for iOS: must be visible and part of the viewport
      textArea.style.position = "fixed";
      textArea.style.left = "10px";
      textArea.style.top = "10px";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.opacity = "0.01";
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Extra step for iOS
      textArea.setSelectionRange(0, 99999);
      
      let successful = false;
      try {
        successful = document.execCommand('copy');
      } catch (err) {
        successful = false;
      }
      
      if (successful) {
        showToast('Detalles del error copiados', 'success');
      } else {
        // Fallback: show the manual copy text area in the UI
        setReportContent(text);
        setShowManualCopy(true);
        showToast('Copia automática falló. Usa el cuadro inferior.', 'info');
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

      <div className="video-container" onClick={toggleControls}>
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
            
            <div style={{ fontSize: '0.85rem', color: '#fff', marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              Si el error persiste, intenta cambiar la calidad o usa un reproductor externo.
            </div>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <button 
                className="hero-btn" 
                style={{ fontSize: '0.8rem', padding: '6px 15px', height: 'auto', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
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

            {showManualCopy && (
              <div style={{ marginTop: '15px' }}>
                <textarea 
                  readOnly 
                  value={reportContent}
                  onClick={(e) => e.target.select()}
                  style={{
                    width: '100%',
                    height: '80px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '10px',
                    fontFamily: 'monospace',
                    resize: 'none'
                  }}
                />
                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '5px' }}>
                  Tu navegador bloqueó la copia automática. Selecciona y copia este texto manualmente.
                </div>
              </div>
            )}
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
          opacity: showControls ? 1 : 0, 
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s', zIndex: 1002
        }} className="player-controls" onClick={(e) => e.stopPropagation()}>
           
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
              <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                <button className="icon-btn" onClick={skipBackward} title="Atrás 10s">
                  <div style={{ position: 'relative' }}>
                    <RefreshCw size={24} style={{ transform: 'scaleX(-1)' }} />
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '8px', fontWeight: 800 }}>10</span>
                  </div>
                </button>

                <button className="icon-btn" onClick={togglePlay}>
                  {isPlaying ? <Pause size={32}/> : <Play size={32}/>}
                </button>

                <button className="icon-btn" onClick={skipForward} title="Adelante 10s">
                  <div style={{ position: 'relative' }}>
                    <RefreshCw size={24} />
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '8px', fontWeight: 800 }}>10</span>
                  </div>
                </button>

                <button className="icon-btn" onClick={toggleMute}>
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
