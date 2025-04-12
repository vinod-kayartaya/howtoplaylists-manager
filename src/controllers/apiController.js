const PlaylistModel = require('../models/playlistModel');
const YouTubeService = require('../services/youtubeService');

class ApiController {
  // Get all playlists
  static async getAllPlaylists(req, res) {
    try {
      const playlists = await PlaylistModel.getAllPlaylists();
      res.json({ success: true, data: playlists });
    } catch (error) {
      console.error('API Error - getAllPlaylists:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to fetch playlists' 
      });
    }
  }

  // Get a single playlist by ID
  static async getPlaylist(req, res) {
    try {
      const playlist = await PlaylistModel.getPlaylistById(req.params.id);
      
      if (!playlist) {
        return res.status(404).json({ 
          success: false, 
          error: 'Playlist not found' 
        });
      }
      
      res.json({ success: true, data: playlist });
    } catch (error) {
      console.error('API Error - getPlaylist:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to fetch playlist' 
      });
    }
  }

  // Add a new playlist from YouTube
  static async addPlaylist(req, res) {
    try {
      const { playlistId, videoId, method } = req.body;
      
      if (!playlistId && !videoId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Either playlistId or videoId is required' 
        });
      }
      
      const youtubeService = new YouTubeService();
      let playlistData;

      // Determine which method to use for fetching playlist data
      if (playlistId) {
        if (method === 'axios') {
          playlistData = await youtubeService.getPlaylistByIdWithAxios(playlistId);
        } else {
          playlistData = await youtubeService.getPlaylistById(playlistId);
        }
      } else if (videoId) {
        const playlists = await youtubeService.getPlaylistFromVideoId(videoId);
        if (playlists.length > 0) {
          // Get the first playlist with full details
          playlistData = await youtubeService.getPlaylistById(playlists[0].id);
        } else {
          return res.status(404).json({ 
            success: false, 
            error: 'No playlists found for this video' 
          });
        }
      }

      // Save the playlist to our JSON file
      const savedPlaylist = await PlaylistModel.addPlaylist(playlistData);
      
      res.status(201).json({ 
        success: true, 
        message: 'Playlist added successfully', 
        data: savedPlaylist 
      });
    } catch (error) {
      console.error('API Error - addPlaylist:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to add playlist' 
      });
    }
  }

  // Update an existing playlist
  static async updatePlaylist(req, res) {
    try {
      const { id } = req.params;
      const { refresh } = req.query;
      
      // Check if playlist exists
      const existingPlaylist = await PlaylistModel.getPlaylistById(id);
      
      if (!existingPlaylist) {
        return res.status(404).json({ 
          success: false, 
          error: 'Playlist not found' 
        });
      }
      
      // If refresh=true, fetch fresh data from YouTube
      if (refresh === 'true') {
        const youtubeService = new YouTubeService();
        const freshData = await youtubeService.getPlaylistById(id);
        const updatedPlaylist = await PlaylistModel.updatePlaylist(id, freshData);
        
        return res.json({ 
          success: true, 
          message: 'Playlist refreshed from YouTube', 
          data: updatedPlaylist 
        });
      }
      
      // Otherwise, update with provided data
      const updatedPlaylist = await PlaylistModel.updatePlaylist(id, req.body);
      
      res.json({ 
        success: true, 
        message: 'Playlist updated successfully', 
        data: updatedPlaylist 
      });
    } catch (error) {
      console.error('API Error - updatePlaylist:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to update playlist' 
      });
    }
  }

  // Delete a playlist
  static async deletePlaylist(req, res) {
    try {
      await PlaylistModel.deletePlaylist(req.params.id);
      
      res.json({ 
        success: true, 
        message: 'Playlist deleted successfully' 
      });
    } catch (error) {
      console.error('API Error - deletePlaylist:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to delete playlist' 
      });
    }
  }

  // Fetch playlists from YouTube without saving
  static async fetchFromYouTube(req, res) {
    try {
      const { playlistId, videoId, method } = req.query;
      
      if (!playlistId && !videoId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Either playlistId or videoId is required' 
        });
      }
      
      const youtubeService = new YouTubeService();
      let result;

      if (playlistId) {
        if (method === 'axios') {
          result = await youtubeService.getPlaylistByIdWithAxios(playlistId);
        } else {
          result = await youtubeService.getPlaylistById(playlistId);
        }
        
        res.json({ 
          success: true, 
          data: result 
        });
      } else if (videoId) {
        // Check if we're requesting a single video's details
        if (req.query.details === 'true') {
          try {
            result = await youtubeService.getVideoDetails(videoId);
            return res.json({
              success: true,
              data: result
            });
          } catch (error) {
            return res.status(404).json({
              success: false,
              error: `Video not found with ID: ${videoId}`
            });
          }
        }
        
        // Otherwise, get playlists containing this video
        try {
          result = await youtubeService.getPlaylistFromVideoId(videoId);
          
          res.json({ 
            success: true, 
            data: result 
          });
        } catch (error) {
          return res.status(404).json({
            success: false,
            error: error.message || `No playlists found for video with ID: ${videoId}`
          });
        }
      }
    } catch (error) {
      console.error('API Error - fetchFromYouTube:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to fetch from YouTube' 
      });
    }
  }

  // Save playlist order
  static async savePlaylistOrder(req, res) {
    try {
      const { playlistIds } = req.body;
      
      if (!playlistIds || !Array.isArray(playlistIds) || playlistIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'A non-empty array of playlist IDs is required' 
        });
      }
      
      const orderedPlaylists = await PlaylistModel.savePlaylistOrder(playlistIds);
      
      res.json({ 
        success: true, 
        message: 'Playlist order saved successfully', 
        data: orderedPlaylists 
      });
    } catch (error) {
      console.error('API Error - savePlaylistOrder:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to save playlist order' 
      });
    }
  }
}

module.exports = ApiController; 