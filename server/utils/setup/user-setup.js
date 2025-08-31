/**
 * User Setup Module
 * Handles automatic creation of admin, manager, and default user accounts
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class UserSetup {
  constructor() {
    this.name = "UserSetup";
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${this.name}] [${timestamp}] ${message}`);
  }

  validateUserData(userData) {
    const { username, password, email } = userData;
    
    if (!username || username.length < 2) {
      return { valid: false, error: 'Username must be at least 2 characters long' };
    }
    
    if (!/^[a-z0-9_\-.]+$/.test(username)) {
      return { 
        valid: false, 
        error: 'Username must only contain lowercase letters, numbers, underscores, hyphens, and periods' 
      };
    }
    
    if (!password || password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    return { valid: true };
  }

  async hashPassword(password) {
    try {
      const saltRounds = 10;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  async createUser(userData, role = 'default') {
    const { username, password, email } = userData;
    
    try {
      const prisma = require("../prisma");
      
      // Validate user data
      const validation = this.validateUserData(userData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      // Check if user already exists
      const existingUser = await prisma.users.findUnique({
        where: { username }
      });
      
      if (existingUser) {
        return { success: false, error: `User '${username}' already exists` };
      }
      
      // Hash password
      const hashedPassword = await this.hashPassword(password);
      
      // Create user
      const user = await prisma.users.create({
        data: {
          username,
          password: hashedPassword,
          role,
          ...(email && { email }),
          suspended: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      this.log(`User '${username}' created with role '${role}'`);
      
      return { 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      };
      
    } catch (error) {
      this.log(`Error creating user '${username}': ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async createAdminUser(userData) {
    this.log(`Creating admin user: ${userData.username}`);
    
    const result = await this.createUser(userData, 'admin');
    
    if (result.success) {
      // Additional admin-specific setup could go here
      this.log(`Admin user '${userData.username}' created successfully`, 'success');
    } else {
      this.log(`Failed to create admin user: ${result.error}`, 'error');
    }
    
    return result;
  }

  async createManagerUser(userData) {
    this.log(`Creating manager user: ${userData.username}`);
    
    const result = await this.createUser(userData, 'manager');
    
    if (result.success) {
      // Additional manager-specific setup could go here
      this.log(`Manager user '${userData.username}' created successfully`, 'success');
    } else {
      this.log(`Failed to create manager user: ${result.error}`, 'error');
    }
    
    return result;
  }

  async createDefaultUser(userData) {
    this.log(`Creating default user: ${userData.username}`);
    
    const result = await this.createUser(userData, 'default');
    
    if (result.success) {
      // Additional default user-specific setup could go here
      this.log(`Default user '${userData.username}' created successfully`, 'success');
    } else {
      this.log(`Failed to create default user: ${result.error}`, 'error');
    }
    
    return result;
  }

  async enableMultiUserMode() {
    try {
      const prisma = require("../prisma");
      
      await prisma.system_settings.upsert({
        where: { label: 'multi_user_mode' },
        update: { 
          value: 'true',
          updatedAt: new Date()
        },
        create: {
          label: 'multi_user_mode',
          value: 'true'
        }
      });
      
      this.log('Multi-user mode enabled', 'success');
      return { success: true };
      
    } catch (error) {
      this.log(`Error enabling multi-user mode: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async getUserCount() {
    try {
      const prisma = require("../prisma");
      return await prisma.users.count();
    } catch (error) {
      this.log(`Error getting user count: ${error.message}`, 'error');
      return 0;
    }
  }

  async listUsers() {
    try {
      const prisma = require("../prisma");
      
      const users = await prisma.users.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          email: true,
          suspended: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      return { success: true, users };
      
    } catch (error) {
      this.log(`Error listing users: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async deleteUser(username) {
    try {
      const prisma = require("../prisma");
      
      const user = await prisma.users.findUnique({
        where: { username }
      });
      
      if (!user) {
        return { success: false, error: `User '${username}' not found` };
      }
      
      await prisma.users.delete({
        where: { username }
      });
      
      this.log(`User '${username}' deleted`, 'success');
      return { success: true };
      
    } catch (error) {
      this.log(`Error deleting user '${username}': ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async updateUserRole(username, newRole) {
    const validRoles = ['admin', 'manager', 'default'];
    
    if (!validRoles.includes(newRole)) {
      return { 
        success: false, 
        error: `Invalid role '${newRole}'. Valid roles: ${validRoles.join(', ')}` 
      };
    }
    
    try {
      const prisma = require("../prisma");
      
      const user = await prisma.users.findUnique({
        where: { username }
      });
      
      if (!user) {
        return { success: false, error: `User '${username}' not found` };
      }
      
      await prisma.users.update({
        where: { username },
        data: { 
          role: newRole,
          updatedAt: new Date()
        }
      });
      
      this.log(`User '${username}' role updated to '${newRole}'`, 'success');
      return { success: true };
      
    } catch (error) {
      this.log(`Error updating user role: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async resetUserPassword(username, newPassword) {
    try {
      const validation = this.validateUserData({ username, password: newPassword });
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const prisma = require("../prisma");
      
      const user = await prisma.users.findUnique({
        where: { username }
      });
      
      if (!user) {
        return { success: false, error: `User '${username}' not found` };
      }
      
      const hashedPassword = await this.hashPassword(newPassword);
      
      await prisma.users.update({
        where: { username },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      });
      
      this.log(`Password reset for user '${username}'`, 'success');
      return { success: true };
      
    } catch (error) {
      this.log(`Error resetting password: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

module.exports = UserSetup;