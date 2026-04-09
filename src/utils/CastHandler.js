/**
 * Custom CastHandler for Google Cast integration
 */

let castSession = null;
let castContext = null;

export const initializeCastApi = () => {
  const setupCast = () => {
    try {
      castContext = window.cast.framework.CastContext.getInstance();
      castContext.setOptions({
        receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
      });
      console.log('GCast Api Initialized successfully');
    } catch (e) {
      console.error('Error setting up GCast Api:', e);
    }
  };

  if (window.cast && window.cast.framework) {
    setupCast();
  } else {
    window.__onGCastApiAvailable = (isAvailable) => {
      if (isAvailable && window.cast) {
        setupCast();
      }
    };
  }
};

export const loadMedia = (url, title, subtitle, imageUrl, extension = 'm3u8') => {
  if (!castContext) {
    console.error('Cast context not initialized. Is the browser compatible?');
    // Intentar inicializarlo nuevamente por si acaso falló por race condition
    if (window.cast && window.cast.framework) {
        castContext = window.cast.framework.CastContext.getInstance();
    } else {
        return;
    }
  }

  castSession = castContext.getCurrentSession();
  
  if (!castSession) {
    console.log('No active cast session. Trying to request session...');
    castContext.requestSession().then(
      () => {
        castSession = castContext.getCurrentSession();
        sendMediaRequest(url, title, subtitle, imageUrl, extension);
      },
      (error) => {
        console.error('Error requesting cast session:', error);
      }
    );
  } else {
    sendMediaRequest(url, title, subtitle, imageUrl, extension);
  }
};

const sendMediaRequest = (url, title, subtitle, imageUrl, extension) => {
  if (!castSession) return;
  
  let contentType = 'application/x-mpegurl'; // m3u8
  if (extension === 'mp4') contentType = 'video/mp4';
  if (extension === 'mkv') contentType = 'video/x-matroska';
  
  const mediaInfo = new window.chrome.cast.media.MediaInfo(url, contentType);
  
  const metadata = new window.chrome.cast.media.GenericMediaMetadata();
  metadata.title = title || 'TV-Altoke Stream';
  metadata.subtitle = subtitle || 'Live TV';
  
  if (imageUrl) {
    metadata.images = [
      new window.chrome.cast.Image(imageUrl)
    ];
  }
  
  mediaInfo.metadata = metadata;
  
  const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = true;
  
  console.log('Sending LoadRequest to Chromecast...', request);
  
  castSession.loadMedia(request).then(
    () => {
      console.log('Media Loaded on Receiver Successfully');
    },
    (errorCode) => {
      console.error('Error loading media to receiver. Error Code:', errorCode);
    }
  );
};
