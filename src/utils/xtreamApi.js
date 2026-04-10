/**
 * Utility functions for interacting with Xtream Codes API
 */

// Use the base URL from Vite config to handle subfolder deployments (like /tv/)
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
const PROXY_URL = `${BASE}proxy.php?url=`;

const wrapApiUrl = (fullUrl) => {
  // To avoid CORS (Cross-Origin Resource Sharing) we route API metadata calls through our custom PHP proxy.
  if (fullUrl.startsWith('http')) {
    // Calculate the absolute path to proxy.php based on the current domain and base path
    const proxyBase = window.location.origin + PROXY_URL;
    return `${proxyBase}${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
};

export const wrapMediaUrl = (fullUrl) => {
  if (!fullUrl) return fullUrl;
  
  // User Preference Check: If "Direct Mode" is enabled in settings, bypass proxy.
  const isDirectMode = localStorage.getItem('tv_altoke_direct_mode') === 'true';
  if (isDirectMode) return fullUrl;
  
  // Mixed Content Check: If the app is on HTTPS, we MUST use a proxy for HTTP streams.
  // BUT if the app is on HTTP, we should use DIRECT connections for media.
  const isCurrentlyHttps = window.location.protocol === 'https:';
  const isMediaHttp = fullUrl.startsWith('http:');
  
  if (isCurrentlyHttps && isMediaHttp) {
    const proxyBase = window.location.origin + PROXY_URL;
    return `${proxyBase}${encodeURIComponent(fullUrl)}`;
  }
  
  return fullUrl;
};

export const login = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}`);
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    
    if (data.user_info && data.user_info.auth === 1) {
      return data;
    } else {
      throw new Error('Invalid credentials or inactive account');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getLiveCategories = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`);
    const response = await fetch(fullUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const getLiveStreams = async (url, username, password, categoryId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${categoryId}`);
    const response = await fetch(fullUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching streams:', error);
    return [];
  }
};

export const getVodCategories = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_categories`);
    const response = await fetch(fullUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching VOD categories:', error);
    return [];
  }
};

export const getVodStreams = async (url, username, password, categoryId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_streams&category_id=${categoryId}`);
    const response = await fetch(fullUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching VOD streams:', error);
    return [];
  }
};

export const getSeriesCategories = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_series_categories`);
    const response = await fetch(fullUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching series categories:', error);
    return [];
  }
};

export const getSeriesStreams = async (url, username, password, categoryId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_series&category_id=${categoryId}`);
    const response = await fetch(fullUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching series streams:', error);
    return [];
  }
};

export const getSeriesInfo = async (url, username, password, seriesId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const fullUrl = wrapApiUrl(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${seriesId}`);
    const response = await fetch(fullUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching series info:', error);
    return null;
  }
};

export const getStreamUrl = (url, username, password, streamId, type = "live", extension = "mkv") => {
  const baseUrl = url.replace(/\/$/, "");
  let streamUrl = "";
  
  if (type === "live") {
    streamUrl = `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
  } else if (type === "movie") {
    streamUrl = `${baseUrl}/movie/${username}/${password}/${streamId}.${extension}`;
  } else if (type === "series") {
    streamUrl = `${baseUrl}/series/${username}/${password}/${streamId}.${extension}`;
  } else {
    streamUrl = `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
  }

  // Use wrapMediaUrl to prioritize direct connections for video streams
  return wrapMediaUrl(streamUrl);
};
