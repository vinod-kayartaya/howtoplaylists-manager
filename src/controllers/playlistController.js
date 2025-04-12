const PlaylistModel = require('../models/playlistModel');
const YouTubeService = require('../services/youtubeService');

class PlaylistController {
  // Display homepage with all playlists
  static async index(req, res) {
    try {
      const playlists = await PlaylistModel.getAllPlaylists();
      res.render('index', { 
        title: '"How to?" Playlists',
        playlists 
      });
    } catch (error) {
      console.error('Error in index controller:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to load playlists',
        error 
      });
    }
  }

  // Show form to add a new playlist
  static showAddForm(req, res) {
    res.render('add-playlist', { 
      title: 'Add New Playlist',
      playlist: {} 
    });
  }

  // Show a single playlist
  static async showPlaylist(req, res) {
    try {
      const playlist = await PlaylistModel.getPlaylistById(req.params.id);
      
      if (!playlist) {
        return res.status(404).render('404', { 
          title: 'Playlist Not Found' 
        });
      }
      
      res.render('playlist-detail', { 
        title: playlist.title,
        playlist 
      });
    } catch (error) {
      console.error('Error in showPlaylist controller:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to load playlist',
        error 
      });
    }
  }

  // Show form to edit a playlist
  static async showEditForm(req, res) {
    try {
      const playlist = await PlaylistModel.getPlaylistById(req.params.id);
      
      if (!playlist) {
        return res.status(404).render('404', { 
          title: 'Playlist Not Found' 
        });
      }
      
      res.render('edit-playlist', { 
        title: `Edit ${playlist.title}`,
        playlist 
      });
    } catch (error) {
      console.error('Error in showEditForm controller:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to load playlist for editing',
        error 
      });
    }
  }

  // Process the add/update playlist form
  static async processPlaylistForm(req, res) {
    try {
      const { playlistId, videoId, method } = req.body;
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
          throw new Error('No playlists found for this video');
        }
      } else {
        throw new Error('Either playlist ID or video ID is required');
      }

      // Save the playlist to our JSON file
      await PlaylistModel.addPlaylist(playlistData);
      
      res.redirect('/');
    } catch (error) {
      console.error('Error in processPlaylistForm controller:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to add/update playlist',
        error 
      });
    }
  }

  // Delete a playlist
  static async deletePlaylist(req, res) {
    try {
      await PlaylistModel.deletePlaylist(req.params.id);
      res.redirect('/');
    } catch (error) {
      console.error('Error in deletePlaylist controller:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to delete playlist',
        error 
      });
    }
  }

  // Update a playlist
  static async updatePlaylist(req, res) {
    try {
      const { id } = req.params;
      const { title, description, videoIds } = req.body;
      
      // Get the existing playlist
      const playlist = await PlaylistModel.getPlaylistById(id);
      
      if (!playlist) {
        return res.status(404).render('404', { 
          title: 'Playlist Not Found' 
        });
      }
      
      // Update basic info
      playlist.title = title;
      playlist.description = description;
      
      // If it's a custom playlist and videoIds are provided, update the videos
      if (id.startsWith('custom_') && videoIds) {
        const youtubeService = new YouTubeService();
        const videoIdArray = Array.isArray(videoIds) 
          ? videoIds 
          : videoIds.split(',').map(id => id.trim()).filter(id => id);
        
        // If the order or content has changed, update the videos
        const currentVideoIds = playlist.videos.map(video => video.id);
        const hasChanges = JSON.stringify(currentVideoIds) !== JSON.stringify(videoIdArray);
        
        if (hasChanges) {
          // Create a map of existing videos for quick lookup
          const existingVideos = {};
          playlist.videos.forEach(video => {
            existingVideos[video.id] = video;
          });
          
          // Create the new videos array in the specified order
          const updatedVideos = [];
          for (const videoId of videoIdArray) {
            // If we already have this video, reuse it
            if (existingVideos[videoId]) {
              updatedVideos.push(existingVideos[videoId]);
            } else {
              // Otherwise fetch the new video details
              try {
                const videoDetails = await youtubeService.getVideoDetails(videoId);
                updatedVideos.push(videoDetails);
              } catch (error) {
                console.error(`Error fetching video ${videoId}:`, error);
                // Continue with the next video
              }
            }
          }
          
          // Update the playlist videos
          playlist.videos = updatedVideos;
          
          // Update the thumbnail if needed
          if (updatedVideos.length > 0 && (!playlist.thumbnail || !videoIdArray.includes(currentVideoIds[0]))) {
            playlist.thumbnail = updatedVideos[0].thumbnail;
          }
        }
      }
      
      // Save the updated playlist
      await PlaylistModel.updatePlaylist(playlist);
      
      res.redirect(`/playlists/${id}`);
    } catch (error) {
      console.error('Error in updatePlaylist controller:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to update playlist',
        error 
      });
    }
  }

  // Show form to create a custom playlist
  static showCustomPlaylistForm(req, res) {
    res.render('custom-playlist', { 
      title: 'Create Custom Playlist',
      errors: [],
      formData: {}
    });
  }

  // Process custom playlist creation
  static async processCustomPlaylist(req, res) {
    try {
      const { title, description, videoIds } = req.body;
      const errors = [];

      // Validate inputs
      if (!title) errors.push('Title is required');
      if (!videoIds || videoIds.length === 0) errors.push('At least one video ID is required');

      // If there are errors, re-render the form with errors
      if (errors.length > 0) {
        return res.render('custom-playlist', {
          title: 'Create Custom Playlist',
          errors,
          formData: req.body
        });
      }

      // Create a YouTube service instance
      const youtubeService = new YouTubeService();
      
      // Process video IDs (could be a comma-separated string or an array)
      const videoIdArray = Array.isArray(videoIds) 
        ? videoIds 
        : videoIds.split(',').map(id => id.trim()).filter(id => id);

      // Fetch details for each video
      const videos = [];
      for (const videoId of videoIdArray) {
        try {
          const videoDetails = await youtubeService.getVideoDetails(videoId);
          videos.push(videoDetails);
        } catch (error) {
          console.error(`Error fetching video ${videoId}:`, error);
          errors.push(`Could not fetch video with ID: ${videoId}`);
        }
      }

      // If there were errors fetching videos, re-render the form
      if (errors.length > 0) {
        return res.render('custom-playlist', {
          title: 'Create Custom Playlist',
          errors,
          formData: req.body
        });
      }

      // Create a custom playlist object
      const customPlaylist = {
        id: 'custom_' + Date.now(), // Generate a unique ID
        title,
        description,
        thumbnail: videos[0]?.thumbnail || '', // Use the first video's thumbnail
        videos,
        tags: ['custom']
      };

      // Save the playlist
      await PlaylistModel.addPlaylist(customPlaylist);
      
      res.redirect('/');
    } catch (error) {
      console.error('Error in processCustomPlaylist controller:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to create custom playlist',
        error 
      });
    }
  }

  // About page
  static about(req, res) {
    res.render('about', {
      title: 'About "How to?" Playlists'
    });
  }
}

module.exports = PlaylistController; 