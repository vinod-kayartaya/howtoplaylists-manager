const { google } = require('googleapis');
const axios = require('axios');

class YouTubeService {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  }

  // Method 1: Using googleapis library
  async getPlaylistById(playlistId) {
    try {
      // Get playlist details
      const playlistResponse = await this.youtube.playlists.list({
        part: 'snippet,contentDetails',
        id: playlistId
      });

      if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
        throw new Error('Playlist not found');
      }

      const playlistData = playlistResponse.data.items[0];
      const playlistInfo = {
        id: playlistData.id,
        title: playlistData.snippet.title,
        description: playlistData.snippet.description,
        thumbnail: playlistData.snippet.thumbnails.high.url,
        videos: [],
        tags: playlistData.snippet.tags || []
      };

      // Get playlist items (videos)
      const videos = await this.getPlaylistVideos(playlistId);
      playlistInfo.videos = videos;

      return playlistInfo;
    } catch (error) {
      console.error('Error fetching playlist:', error.message);
      throw error;
    }
  }

  // Get all videos in a playlist
  async getPlaylistVideos(playlistId) {
    try {
      const videos = [];
      let nextPageToken = null;

      do {
        const response = await this.youtube.playlistItems.list({
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken
        });

        const videoIds = response.data.items.map(item => item.contentDetails.videoId).join(',');
        
        // Get video details (duration, etc.)
        if (videoIds.length > 0) {
          const videoDetailsResponse = await this.youtube.videos.list({
            part: 'contentDetails,snippet,statistics',
            id: videoIds
          });

          const videoDetails = videoDetailsResponse.data.items;
          
          response.data.items.forEach(item => {
            const videoDetail = videoDetails.find(v => v.id === item.contentDetails.videoId);
            
            if (videoDetail) {
              videos.push({
                id: item.contentDetails.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                duration: this.formatDuration(videoDetail.contentDetails.duration),
                uploadDate: item.snippet.publishedAt.split('T')[0]
              });
            }
          });
        }

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      return videos;
    } catch (error) {
      console.error('Error fetching playlist videos:', error.message);
      throw error;
    }
  }

  // Method 2: Using direct API calls with axios
  async getPlaylistByIdWithAxios(playlistId) {
    try {
      // Get playlist details
      const playlistResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${process.env.YOUTUBE_API_KEY}`
      );

      if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
        throw new Error('Playlist not found');
      }

      const playlistData = playlistResponse.data.items[0];
      const playlistInfo = {
        id: playlistData.id,
        title: playlistData.snippet.title,
        description: playlistData.snippet.description,
        thumbnail: playlistData.snippet.thumbnails.high.url,
        videos: [],
        tags: playlistData.snippet.tags || []
      };

      // Get playlist items (videos)
      const videos = await this.getPlaylistVideosWithAxios(playlistId);
      playlistInfo.videos = videos;

      return playlistInfo;
    } catch (error) {
      console.error('Error fetching playlist with Axios:', error.message);
      throw error;
    }
  }

  // Get all videos in a playlist using Axios
  async getPlaylistVideosWithAxios(playlistId) {
    try {
      const videos = [];
      let nextPageToken = null;

      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}&key=${process.env.YOUTUBE_API_KEY}`;
        const response = await axios.get(url);

        const videoIds = response.data.items.map(item => item.contentDetails.videoId).join(',');
        
        // Get video details (duration, etc.)
        if (videoIds.length > 0) {
          const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`;
          const videoDetailsResponse = await axios.get(videoDetailsUrl);

          const videoDetails = videoDetailsResponse.data.items;
          
          response.data.items.forEach(item => {
            const videoDetail = videoDetails.find(v => v.id === item.contentDetails.videoId);
            
            if (videoDetail) {
              videos.push({
                id: item.contentDetails.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                duration: this.formatDuration(videoDetail.contentDetails.duration),
                uploadDate: item.snippet.publishedAt.split('T')[0]
              });
            }
          });
        }

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      return videos;
    } catch (error) {
      console.error('Error fetching playlist videos with Axios:', error.message);
      throw error;
    }
  }

  // Method 3: Get playlist from a video ID
  async getPlaylistFromVideoId(videoId) {
    try {
      // First, get the video details to find its playlists
      const videoResponse = await this.youtube.videos.list({
        part: 'snippet',
        id: videoId
      });

      if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
        throw new Error('Video not found');
      }

      // Search for playlists containing this video
      const playlistsResponse = await this.youtube.playlists.list({
        part: 'snippet,contentDetails',
        channelId: videoResponse.data.items[0].snippet.channelId
      });

      if (!playlistsResponse.data.items || playlistsResponse.data.items.length === 0) {
        throw new Error('No playlists found for this video');
      }

      // Check each playlist to see if it contains the video
      const playlists = [];
      for (const playlist of playlistsResponse.data.items) {
        const playlistItemsResponse = await this.youtube.playlistItems.list({
          part: 'contentDetails',
          playlistId: playlist.id,
          maxResults: 50
        });

        const containsVideo = playlistItemsResponse.data.items.some(
          item => item.contentDetails.videoId === videoId
        );

        if (containsVideo) {
          playlists.push({
            id: playlist.id,
            title: playlist.snippet.title,
            description: playlist.snippet.description,
            thumbnail: playlist.snippet.thumbnails.high?.url || playlist.snippet.thumbnails.default?.url
          });
        }
      }

      return playlists;
    } catch (error) {
      console.error('Error finding playlists for video:', error.message);
      throw error;
    }
  }

  // Get details for a single video
  async getVideoDetails(videoId) {
    try {
      const videoResponse = await this.youtube.videos.list({
        part: 'snippet,contentDetails,statistics',
        id: videoId
      });

      if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
        throw new Error(`Video not found with ID: ${videoId}`);
      }

      const videoData = videoResponse.data.items[0];
      
      return {
        id: videoData.id,
        title: videoData.snippet.title,
        description: videoData.snippet.description,
        url: `https://www.youtube.com/watch?v=${videoData.id}`,
        thumbnail: videoData.snippet.thumbnails.high?.url || videoData.snippet.thumbnails.default?.url,
        duration: this.formatDuration(videoData.contentDetails.duration),
        uploadDate: videoData.snippet.publishedAt.split('T')[0]
      };
    } catch (error) {
      console.error(`Error fetching video details for ${videoId}:`, error.message);
      throw error;
    }
  }

  // Helper method to format ISO 8601 duration to readable format
  formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    
    const hours = (match[1] && match[1].replace('H', '')) || 0;
    const minutes = (match[2] && match[2].replace('M', '')) || 0;
    const seconds = (match[3] && match[3].replace('S', '')) || 0;
    
    let formattedDuration = '';
    
    if (hours > 0) {
      formattedDuration += `${hours}:`;
      formattedDuration += `${minutes.toString().padStart(2, '0')}:`;
    } else {
      formattedDuration += `${minutes}:`;
    }
    
    formattedDuration += seconds.toString().padStart(2, '0');
    
    return formattedDuration;
  }
}

module.exports = YouTubeService; 