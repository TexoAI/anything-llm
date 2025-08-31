/**
 * API Key Setup Module
 * Handles automatic creation and management of API keys for deployment
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class ApiKeySetup {
  constructor() {
    this.name = "ApiKeySetup";
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${this.name}] [${timestamp}] ${message}`);
  }

  generateApiKey(prefix = 'codex') {
    // Generate a secure API key with the format: codex-{role}-{random}
    const randomPart = crypto.randomBytes(16).toString('hex');
    return `${prefix}-${randomPart}`;
  }

  async getUserByUsername(username) {
    try {
      const prisma = require("../prisma");
      
      const user = await prisma.users.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          role: true
        }
      });
      
      return user;
    } catch (error) {
      this.log(`Error finding user '${username}': ${error.message}`, 'error');
      return null;
    }
  }

  async createApiKey(userId, keyName = null, providedKey = null) {
    try {
      const prisma = require("../prisma");
      
      // Use provided key or generate new one
      const apiKey = providedKey || this.generateApiKey();
      
      // Create API key record
      const createdKey = await prisma.api_keys.create({
        data: {
          secret: apiKey,
          name: keyName || `Auto-generated key for user ${userId}`,
          userId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      this.log(`API key created for user ID ${userId}: ${keyName || 'Unnamed key'}`);
      
      return { 
        success: true, 
        apiKey: {
          id: createdKey.id,
          secret: createdKey.secret,
          name: createdKey.name,
          userId: createdKey.userId
        }
      };
      
    } catch (error) {
      this.log(`Error creating API key: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async createApiKeyForUser(username, keyName = null, providedKey = null) {
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      return { success: false, error: `User '${username}' not found` };
    }
    
    return await this.createApiKey(user.id, keyName || `${user.role} API Key`, providedKey);
  }

  async createDefaultApiKeys(keyConfig = {}) {
    this.log('Creating default API keys for deployment...');
    
    const results = {
      success: true,
      keys: {},
      errors: []
    };
    
    try {
      // Create API key for admin user
      if (process.env.ADMIN_USERNAME) {
        const adminResult = await this.createApiKeyForUser(
          process.env.ADMIN_USERNAME,
          'Admin API Key',
          keyConfig.adminKey
        );
        
        if (adminResult.success) {
          results.keys.admin = adminResult.apiKey;
          this.log(`Admin API key created: ${adminResult.apiKey.secret}`, 'success');
        } else {
          results.errors.push(`Admin API key: ${adminResult.error}`);
        }
      }
      
      // Create API key for manager user
      if (process.env.MANAGER_USERNAME) {
        const managerResult = await this.createApiKeyForUser(
          process.env.MANAGER_USERNAME,
          'Manager API Key',
          keyConfig.managerKey
        );
        
        if (managerResult.success) {
          results.keys.manager = managerResult.apiKey;
          this.log(`Manager API key created: ${managerResult.apiKey.secret}`, 'success');
        } else {
          results.errors.push(`Manager API key: ${managerResult.error}`);
        }
      }
      
      // Create API key for default user
      if (process.env.DEFAULT_USERNAME) {
        const defaultResult = await this.createApiKeyForUser(
          process.env.DEFAULT_USERNAME,
          'Default User API Key',
          keyConfig.defaultKey
        );
        
        if (defaultResult.success) {
          results.keys.default = defaultResult.apiKey;
          this.log(`Default user API key created: ${defaultResult.apiKey.secret}`, 'success');
        } else {
          results.errors.push(`Default API key: ${defaultResult.error}`);
        }
      }
      
      if (results.errors.length > 0) {
        results.success = false;
        results.error = `Some API keys failed to create: ${results.errors.join(', ')}`;
      }
      
    } catch (error) {
      this.log(`Error creating default API keys: ${error.message}`, 'error');
      results.success = false;
      results.error = error.message;
    }
    
    return results;
  }

  async listApiKeys() {
    try {
      const prisma = require("../prisma");
      
      const keys = await prisma.api_keys.findMany({
        include: {
          user: {
            select: {
              username: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return { 
        success: true, 
        keys: keys.map(key => ({
          id: key.id,
          name: key.name,
          secret: key.secret.substring(0, 8) + '...' + key.secret.slice(-4), // Partial for security
          fullSecret: key.secret, // Full secret for internal use
          userId: key.userId,
          username: key.user?.username,
          userRole: key.user?.role,
          createdAt: key.createdAt
        }))
      };
      
    } catch (error) {
      this.log(`Error listing API keys: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async deleteApiKey(keyId) {
    try {
      const prisma = require("../prisma");
      
      const key = await prisma.api_keys.findUnique({
        where: { id: keyId },
        include: {
          user: {
            select: { username: true }
          }
        }
      });
      
      if (!key) {
        return { success: false, error: `API key with ID ${keyId} not found` };
      }
      
      await prisma.api_keys.delete({
        where: { id: keyId }
      });
      
      this.log(`API key deleted: ${key.name} (User: ${key.user?.username})`, 'success');
      return { success: true };
      
    } catch (error) {
      this.log(`Error deleting API key: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async deleteApiKeyBySecret(secret) {
    try {
      const prisma = require("../prisma");
      
      const key = await prisma.api_keys.findUnique({
        where: { secret },
        include: {
          user: {
            select: { username: true }
          }
        }
      });
      
      if (!key) {
        return { success: false, error: `API key not found` };
      }
      
      await prisma.api_keys.delete({
        where: { secret }
      });
      
      this.log(`API key deleted: ${key.name} (User: ${key.user?.username})`, 'success');
      return { success: true };
      
    } catch (error) {
      this.log(`Error deleting API key: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async validateApiKey(secret) {
    try {
      const prisma = require("../prisma");
      
      const key = await prisma.api_keys.findUnique({
        where: { secret },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              suspended: true
            }
          }
        }
      });
      
      if (!key) {
        return { valid: false, error: 'Invalid API key' };
      }
      
      if (key.user?.suspended) {
        return { valid: false, error: 'User account is suspended' };
      }
      
      return { 
        valid: true, 
        key: {
          id: key.id,
          name: key.name,
          userId: key.userId,
          user: key.user
        }
      };
      
    } catch (error) {
      this.log(`Error validating API key: ${error.message}`, 'error');
      return { valid: false, error: error.message };
    }
  }

  async regenerateApiKey(keyId) {
    try {
      const prisma = require("../prisma");
      
      const existingKey = await prisma.api_keys.findUnique({
        where: { id: keyId },
        include: {
          user: {
            select: { username: true }
          }
        }
      });
      
      if (!existingKey) {
        return { success: false, error: `API key with ID ${keyId} not found` };
      }
      
      const newSecret = this.generateApiKey();
      
      const updatedKey = await prisma.api_keys.update({
        where: { id: keyId },
        data: {
          secret: newSecret,
          updatedAt: new Date()
        }
      });
      
      this.log(`API key regenerated: ${existingKey.name} (User: ${existingKey.user?.username})`, 'success');
      
      return { 
        success: true, 
        apiKey: {
          id: updatedKey.id,
          secret: updatedKey.secret,
          name: updatedKey.name,
          userId: updatedKey.userId
        }
      };
      
    } catch (error) {
      this.log(`Error regenerating API key: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async getApiKeyStats() {
    try {
      const prisma = require("../prisma");
      
      const totalKeys = await prisma.api_keys.count();
      
      const keysByRole = await prisma.api_keys.groupBy({
        by: ['userId'],
        _count: {
          id: true
        },
        include: {
          user: {
            select: { role: true }
          }
        }
      });
      
      return {
        success: true,
        stats: {
          total: totalKeys,
          byRole: keysByRole
        }
      };
      
    } catch (error) {
      this.log(`Error getting API key stats: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

module.exports = ApiKeySetup;