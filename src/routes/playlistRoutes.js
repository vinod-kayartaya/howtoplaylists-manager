const express = require('express');
const router = express.Router();
const PlaylistController = require('../controllers/playlistController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Home page - list all playlists (public)
router.get('/', PlaylistController.index);

// Add new playlist form (protected)
router.get('/playlists/add', isAuthenticated, PlaylistController.showAddForm);

// Custom playlist creation form (protected)
router.get('/playlists/custom', isAuthenticated, PlaylistController.showCustomPlaylistForm);

// Process custom playlist creation (protected)
router.post('/playlists/custom', isAuthenticated, PlaylistController.processCustomPlaylist);

// Process add/update playlist form (protected)
router.post('/playlists', isAuthenticated, PlaylistController.processPlaylistForm);

// View a single playlist (public)
router.get('/playlists/:id', PlaylistController.showPlaylist);

// Edit playlist form (protected)
router.get('/playlists/:id/edit', isAuthenticated, PlaylistController.showEditForm);

// Update a playlist (protected)
router.post('/playlists/:id/update', isAuthenticated, PlaylistController.updatePlaylist);

// Delete a playlist (protected)
router.delete('/playlists/:id', isAuthenticated, PlaylistController.deletePlaylist);

// About page (public)
router.get('/about', PlaylistController.about);

module.exports = router; 