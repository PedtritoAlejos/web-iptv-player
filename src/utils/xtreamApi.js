/**
 * Utility functions for interacting with Xtream Codes API
 */

export const login = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}`);
    
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
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const getLiveStreams = async (url, username, password, categoryId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${categoryId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching streams:', error);
    return [];
  }
};

export const getVodCategories = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_categories`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching VOD categories:', error);
    return [];
  }
};

export const getVodStreams = async (url, username, password, categoryId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_streams&category_id=${categoryId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching VOD streams:', error);
    return [];
  }
};

export const getSeriesCategories = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_series_categories`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching series categories:', error);
    return [];
  }
};

export const getSeriesStreams = async (url, username, password, categoryId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_series&category_id=${categoryId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching series streams:', error);
    return [];
  }
};

export const getSeriesInfo = async (url, username, password, seriesId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${seriesId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching series info:', error);
    return null;
  }
};

export const getStreamUrl = (url, username, password, streamId, type = "live", extension = "mkv") => {
  const cleanUrl = url.replace(/\/$/, "");
  if (type === "live") {
    return `${cleanUrl}/live/${username}/${password}/${streamId}.m3u8`;
  }
  if (type === "movie") {
    return `${cleanUrl}/movie/${username}/${password}/${streamId}.${extension}`;
  }
  if (type === "series") {
    return `${cleanUrl}/series/${username}/${password}/${streamId}.${extension}`;
  }
  return `${cleanUrl}/live/${username}/${password}/${streamId}.m3u8`;
};
