const express = require('express');
const router = express.Router();
const ApiController = require('../controllers/apiController');

// Get all playlists
router.get('/playlists', ApiController.getAllPlaylists);

// Get a single playlist
router.get('/playlists/:id', ApiController.getPlaylist);

// Add a new playlist
router.post('/playlists', ApiController.addPlaylist);

// Update a playlist
router.put('/playlists/:id', ApiController.updatePlaylist);

// Delete a playlist
router.delete('/playlists/:id', ApiController.deletePlaylist);

// Fetch from YouTube without saving
router.get('/youtube', ApiController.fetchFromYouTube);

// Save playlist order
router.post('/playlists/order', ApiController.savePlaylistOrder);

module.exports = router; 