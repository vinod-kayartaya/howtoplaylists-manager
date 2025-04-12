const fs = require('fs').promises;
const path = require('path');

const dataFilePath = path.join(__dirname, '../../data/playlists.json');

class PlaylistModel {
  // Get all playlists
  static async getAllPlaylists() {
    try {
      const data = await fs.readFile(dataFilePath, 'utf8');
      return JSON.parse(data).playlists;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it with empty playlists array
        await this.saveAllPlaylists([]);
        return [];
      }
      throw error;
    }
  }

  // Get a single playlist by ID
  static async getPlaylistById(id) {
    const playlists = await this.getAllPlaylists();
    return playlists.find(playlist => playlist.id === id);
  }

  // Add a new playlist
  static async addPlaylist(playlist) {
    const playlists = await this.getAllPlaylists();
    
    // Check if playlist with same ID already exists
    const existingIndex = playlists.findIndex(p => p.id === playlist.id);
    
    if (existingIndex !== -1) {
      // Update existing playlist
      playlists[existingIndex] = {
        ...playlists[existingIndex],
        ...playlist,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
    } else {
      // Add new playlist
      playlists.push({
        ...playlist,
        created: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    
    await this.saveAllPlaylists(playlists);
    return existingIndex !== -1 ? playlists[existingIndex] : playlist;
  }

  // Update an existing playlist
  static async updatePlaylist(playlist) {
    const playlists = await this.getAllPlaylists();
    const index = playlists.findIndex(p => p.id === playlist.id);
    
    if (index === -1) {
      throw new Error('Playlist not found');
    }
    
    playlists[index] = {
      ...playlists[index],
      ...playlist,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    await this.saveAllPlaylists(playlists);
    return playlists[index];
  }

  // Delete a playlist
  static async deletePlaylist(id) {
    const playlists = await this.getAllPlaylists();
    const filteredPlaylists = playlists.filter(playlist => playlist.id !== id);
    
    if (filteredPlaylists.length === playlists.length) {
      throw new Error('Playlist not found');
    }
    
    await this.saveAllPlaylists(filteredPlaylists);
    return { id };
  }

  // Save all playlists to the JSON file
  static async saveAllPlaylists(playlists) {
    const data = JSON.stringify({ playlists }, null, 2);
    await fs.writeFile(dataFilePath, data, 'utf8');
  }

  // Save playlist order
  static async savePlaylistOrder(playlistIds) {
    try {
      // Get all playlists
      const playlists = await this.getAllPlaylists();
      
      // Create a map of playlists by ID for quick lookup
      const playlistMap = {};
      playlists.forEach(playlist => {
        playlistMap[playlist.id] = playlist;
      });
      
      // Create a new array with playlists in the specified order
      const orderedPlaylists = [];
      
      // First add playlists in the specified order
      playlistIds.forEach(id => {
        if (playlistMap[id]) {
          orderedPlaylists.push(playlistMap[id]);
          delete playlistMap[id]; // Remove from map to avoid duplicates
        }
      });
      
      // Then add any remaining playlists that weren't in the order array
      Object.values(playlistMap).forEach(playlist => {
        orderedPlaylists.push(playlist);
      });
      
      // Save the reordered playlists
      await this.saveAllPlaylists(orderedPlaylists);
      
      return orderedPlaylists;
    } catch (error) {
      console.error('Error saving playlist order:', error);
      throw error;
    }
  }
}

module.exports = PlaylistModel; 