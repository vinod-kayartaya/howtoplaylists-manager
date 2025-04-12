const passport = require('passport');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const AdminModel = require('../models/adminModel');

class AuthController {
  // Show login form
  static showLoginForm(req, res) {
    res.render('auth/login', {
      title: 'Admin Login',
      error: req.flash('error')
    });
  }

  // Process login
  static async processLogin(req, res, next) {
    try {
      const { username, password } = req.body;
      
      // Check if username is correct
      const admin = await AdminModel.getAdmin();
      if (username !== admin.username) {
        req.flash('error', 'Invalid username or password');
        return res.redirect('/auth/login');
      }
      
      // Check if password is correct
      const isPasswordValid = await AdminModel.verifyPassword(password);
      if (!isPasswordValid) {
        req.flash('error', 'Invalid username or password');
        return res.redirect('/auth/login');
      }
      
      // If 2FA is enabled, redirect to 2FA verification
      if (admin.twoFactorEnabled) {
        req.session.preAuth = { username };
        return res.redirect('/auth/verify-2fa');
      }
      
      // If 2FA is not enabled, log the user in
      req.session.isAuthenticated = true;
      req.session.user = { username: admin.username };
      
      // Redirect to the dashboard or home page
      res.redirect('/');
    } catch (error) {
      console.error('Login error:', error);
      req.flash('error', 'An error occurred during login');
      res.redirect('/auth/login');
    }
  }

  // Show 2FA verification form
  static showVerify2FA(req, res) {
    if (!req.session.preAuth) {
      return res.redirect('/auth/login');
    }
    
    res.render('auth/verify-2fa', {
      title: 'Verify Two-Factor Authentication',
      error: req.flash('error')
    });
  }

  // Process 2FA verification
  static async processVerify2FA(req, res) {
    try {
      if (!req.session.preAuth) {
        return res.redirect('/auth/login');
      }
      
      const { token } = req.body;
      const admin = await AdminModel.getAdmin();
      
      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token
      });
      
      if (!verified) {
        req.flash('error', 'Invalid authentication code');
        return res.redirect('/auth/verify-2fa');
      }
      
      // Complete authentication
      req.session.isAuthenticated = true;
      req.session.user = { username: admin.username };
      delete req.session.preAuth;
      
      // Redirect to the dashboard or home page
      res.redirect('/');
    } catch (error) {
      console.error('2FA verification error:', error);
      req.flash('error', 'An error occurred during verification');
      res.redirect('/auth/verify-2fa');
    }
  }

  // Show admin settings
  static async showSettings(req, res) {
    try {
      const admin = await AdminModel.getAdmin();
      
      res.render('auth/settings', {
        title: 'Admin Settings',
        twoFactorEnabled: admin.twoFactorEnabled,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Settings error:', error);
      req.flash('error', 'An error occurred while loading settings');
      res.redirect('/');
    }
  }

  // Setup 2FA
  static async setupTwoFactor(req, res) {
    try {
      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: 'How to? Playlists Admin'
      });
      
      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      
      // Store the secret temporarily in the session
      req.session.twoFactorSecret = secret.base32;
      
      res.render('auth/setup-2fa', {
        title: 'Setup Two-Factor Authentication',
        qrCodeUrl,
        secret: secret.base32,
        error: req.flash('error')
      });
    } catch (error) {
      console.error('2FA setup error:', error);
      req.flash('error', 'An error occurred during 2FA setup');
      res.redirect('/auth/settings');
    }
  }

  // Confirm 2FA setup
  static async confirmTwoFactor(req, res) {
    try {
      const { token } = req.body;
      const secret = req.session.twoFactorSecret;
      
      if (!secret) {
        req.flash('error', 'Two-factor authentication setup expired');
        return res.redirect('/auth/settings');
      }
      
      // Verify the token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token
      });
      
      if (!verified) {
        req.flash('error', 'Invalid authentication code');
        return res.redirect('/auth/setup-2fa');
      }
      
      // Enable 2FA
      await AdminModel.enableTwoFactor(secret);
      
      // Clean up session
      delete req.session.twoFactorSecret;
      
      req.flash('success', 'Two-factor authentication enabled successfully');
      res.redirect('/auth/settings');
    } catch (error) {
      console.error('2FA confirmation error:', error);
      req.flash('error', 'An error occurred during 2FA confirmation');
      res.redirect('/auth/settings');
    }
  }

  // Disable 2FA
  static async disableTwoFactor(req, res) {
    try {
      await AdminModel.disableTwoFactor();
      
      req.flash('success', 'Two-factor authentication disabled successfully');
      res.redirect('/auth/settings');
    } catch (error) {
      console.error('2FA disable error:', error);
      req.flash('error', 'An error occurred while disabling 2FA');
      res.redirect('/auth/settings');
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Verify current password
      const isPasswordValid = await AdminModel.verifyPassword(currentPassword);
      if (!isPasswordValid) {
        req.flash('error', 'Current password is incorrect');
        return res.redirect('/auth/settings');
      }
      
      // Check if new passwords match
      if (newPassword !== confirmPassword) {
        req.flash('error', 'New passwords do not match');
        return res.redirect('/auth/settings');
      }
      
      // Update password
      await AdminModel.updatePassword(newPassword);
      
      req.flash('success', 'Password changed successfully');
      res.redirect('/auth/settings');
    } catch (error) {
      console.error('Password change error:', error);
      req.flash('error', 'An error occurred while changing password');
      res.redirect('/auth/settings');
    }
  }

  // Logout
  static logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
}

module.exports = AuthController; 