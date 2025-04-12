const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/authMiddleware');

// Login routes
router.get('/login', isNotAuthenticated, AuthController.showLoginForm);
router.post('/login', isNotAuthenticated, AuthController.processLogin);

// 2FA verification routes
router.get('/verify-2fa', AuthController.showVerify2FA);
router.post('/verify-2fa', AuthController.processVerify2FA);

// Admin settings routes (protected)
router.get('/settings', isAuthenticated, AuthController.showSettings);
router.post('/change-password', isAuthenticated, AuthController.changePassword);

// 2FA setup routes (protected)
router.get('/setup-2fa', isAuthenticated, AuthController.setupTwoFactor);
router.post('/setup-2fa', isAuthenticated, AuthController.confirmTwoFactor);
router.post('/disable-2fa', isAuthenticated, AuthController.disableTwoFactor);

// Logout route
router.get('/logout', AuthController.logout);

module.exports = router; 