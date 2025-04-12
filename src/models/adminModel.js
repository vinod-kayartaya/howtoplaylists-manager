const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const adminFilePath = path.join(__dirname, '../../data/admin.json');

class AdminModel {
  // Get admin data
  static async getAdmin() {
    try {
      const data = await fs.readFile(adminFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it with default admin
        const defaultAdmin = {
          username: 'admin',
          password: await bcrypt.hash('admin', 10), // Default password: admin
          twoFactorSecret: null,
          twoFactorEnabled: false
        };
        await this.saveAdmin(defaultAdmin);
        return defaultAdmin;
      }
      throw error;
    }
  }

  // Save admin data
  static async saveAdmin(adminData) {
    const data = JSON.stringify(adminData, null, 2);
    await fs.writeFile(adminFilePath, data, 'utf8');
    return adminData;
  }

  // Update admin password
  static async updatePassword(newPassword) {
    const admin = await this.getAdmin();
    admin.password = await bcrypt.hash(newPassword, 10);
    return this.saveAdmin(admin);
  }

  // Enable two-factor authentication
  static async enableTwoFactor(secret) {
    const admin = await this.getAdmin();
    admin.twoFactorSecret = secret;
    admin.twoFactorEnabled = true;
    return this.saveAdmin(admin);
  }

  // Disable two-factor authentication
  static async disableTwoFactor() {
    const admin = await this.getAdmin();
    admin.twoFactorSecret = null;
    admin.twoFactorEnabled = false;
    return this.saveAdmin(admin);
  }

  // Verify password
  static async verifyPassword(password) {
    const admin = await this.getAdmin();
    return bcrypt.compare(password, admin.password);
  }
}

module.exports = AdminModel; 