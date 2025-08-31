/**
 * System Configuration Module
 * Handles automatic configuration of system settings for deployment
 */

class SystemConfig {
  constructor() {
    this.name = "SystemConfig";
    this.supportedVectorDbs = [
      'lancedb',
      'chroma', 
      'pinecone',
      'qdrant',
      'weaviate',
      'milvus',
      'pgvector',
      'astra'
    ];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${this.name}] [${timestamp}] ${message}`);
  }

  async updateSystemSetting(label, value) {
    try {
      const prisma = require("../prisma");
      
      await prisma.system_settings.upsert({
        where: { label },
        update: { 
          value: value.toString(),
          updatedAt: new Date()
        },
        create: {
          label,
          value: value.toString()
        }
      });
      
      this.log(`System setting updated: ${label} = ${value}`);
      return { success: true };
      
    } catch (error) {
      this.log(`Error updating system setting ${label}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async getSystemSetting(label) {
    try {
      const prisma = require("../prisma");
      
      const setting = await prisma.system_settings.findUnique({
        where: { label }
      });
      
      return { success: true, value: setting?.value || null };
      
    } catch (error) {
      this.log(`Error getting system setting ${label}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async setMultiUserMode(enabled) {
    this.log(`Setting multi-user mode: ${enabled ? 'enabled' : 'disabled'}`);
    return await this.updateSystemSetting('multi_user_mode', enabled ? 'true' : 'false');
  }

  async setAppName(appName) {
    if (!appName || typeof appName !== 'string') {
      return { success: false, error: 'Invalid app name' };
    }
    
    this.log(`Setting custom app name: ${appName}`);
    return await this.updateSystemSetting('custom_app_name', appName);
  }

  async setLogoFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return { success: false, error: 'Invalid logo filename' };
    }
    
    this.log(`Setting logo filename: ${filename}`);
    return await this.updateSystemSetting('logo_filename', filename);
  }

  async setVectorDatabase(vectorDb) {
    if (!this.supportedVectorDbs.includes(vectorDb)) {
      return { 
        success: false, 
        error: `Unsupported vector database: ${vectorDb}. Supported: ${this.supportedVectorDbs.join(', ')}` 
      };
    }
    
    this.log(`Setting vector database: ${vectorDb}`);
    
    try {
      const { updateENV } = require("../helpers/updateENV");
      await updateENV('VECTOR_DB', vectorDb);
      
      return { success: true };
    } catch (error) {
      this.log(`Error setting vector database: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async setTextSplitterSettings(chunkSize = 1000, chunkOverlap = 20) {
    try {
      const chunkSizeNum = parseInt(chunkSize);
      const chunkOverlapNum = parseInt(chunkOverlap);
      
      if (isNaN(chunkSizeNum) || chunkSizeNum <= 0) {
        return { success: false, error: 'Chunk size must be a positive number' };
      }
      
      if (isNaN(chunkOverlapNum) || chunkOverlapNum < 0) {
        return { success: false, error: 'Chunk overlap must be a non-negative number' };
      }
      
      this.log(`Setting text splitter: chunk_size=${chunkSizeNum}, overlap=${chunkOverlapNum}`);
      
      const sizeResult = await this.updateSystemSetting('text_splitter_chunk_size', chunkSizeNum);
      const overlapResult = await this.updateSystemSetting('text_splitter_chunk_overlap', chunkOverlapNum);
      
      if (sizeResult.success && overlapResult.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Failed to set text splitter settings: ${sizeResult.error || overlapResult.error}` 
        };
      }
    } catch (error) {
      this.log(`Error setting text splitter settings: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async setSupportEmail(email) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }
    
    this.log(`Setting support email: ${email || 'none'}`);
    return await this.updateSystemSetting('support_email', email || '');
  }

  async setFooterData(footerLinks = []) {
    try {
      // Validate footer links format
      if (!Array.isArray(footerLinks)) {
        return { success: false, error: 'Footer data must be an array' };
      }
      
      const validatedLinks = footerLinks.filter(link => {
        return link && 
               typeof link === 'object' && 
               typeof link.text === 'string' && 
               typeof link.url === 'string' &&
               link.url.match(/^https?:\/\/.+/);
      }).slice(0, 3); // Max 3 links
      
      this.log(`Setting footer data: ${validatedLinks.length} links`);
      return await this.updateSystemSetting('footer_data', JSON.stringify(validatedLinks));
      
    } catch (error) {
      this.log(`Error setting footer data: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async setMetaPageSettings(title, faviconUrl) {
    const results = [];
    
    if (title && typeof title === 'string') {
      this.log(`Setting meta page title: ${title}`);
      const titleResult = await this.updateSystemSetting('meta_page_title', title);
      results.push(titleResult);
    }
    
    if (faviconUrl && typeof faviconUrl === 'string') {
      try {
        new URL(faviconUrl); // Validate URL
        this.log(`Setting meta page favicon: ${faviconUrl}`);
        const faviconResult = await this.updateSystemSetting('meta_page_favicon', faviconUrl);
        results.push(faviconResult);
      } catch {
        return { success: false, error: 'Invalid favicon URL' };
      }
    }
    
    const allSuccessful = results.length === 0 || results.every(r => r.success);
    return { 
      success: allSuccessful, 
      error: allSuccessful ? null : 'Some meta settings failed to update'
    };
  }

  async enableExperimentalFeatures(features = []) {
    try {
      if (!Array.isArray(features)) {
        return { success: false, error: 'Features must be an array' };
      }
      
      // Enable live file sync if requested
      if (features.includes('live_file_sync')) {
        this.log('Enabling experimental live file sync');
        const result = await this.updateSystemSetting('experimental_live_file_sync', 'enabled');
        if (!result.success) {
          return result;
        }
      }
      
      return { success: true };
    } catch (error) {
      this.log(`Error enabling experimental features: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async configureDefaults(config) {
    const {
      multiUserMode = true,
      appName = 'Codex',
      logoFilename = 'codex-logo.png',
      vectorDb = 'lancedb',
      chunkSize = 1000,
      chunkOverlap = 20,
      supportEmail = '',
      footerLinks = [],
      metaTitle = 'Codex | Your personal LLM trained on anything',
      faviconUrl = '',
      experimentalFeatures = []
    } = config;
    
    this.log('Configuring system defaults...');
    
    const operations = [
      { name: 'Multi-user mode', operation: () => this.setMultiUserMode(multiUserMode) },
      { name: 'App name', operation: () => this.setAppName(appName) },
      { name: 'Logo filename', operation: () => this.setLogoFilename(logoFilename) },
      { name: 'Vector database', operation: () => this.setVectorDatabase(vectorDb) },
      { name: 'Text splitter', operation: () => this.setTextSplitterSettings(chunkSize, chunkOverlap) },
      { name: 'Support email', operation: () => this.setSupportEmail(supportEmail) },
      { name: 'Footer data', operation: () => this.setFooterData(footerLinks) },
      { name: 'Meta settings', operation: () => this.setMetaPageSettings(metaTitle, faviconUrl) },
      { name: 'Experimental features', operation: () => this.enableExperimentalFeatures(experimentalFeatures) }
    ];
    
    const results = [];
    
    for (const { name, operation } of operations) {
      try {
        this.log(`Configuring: ${name}`);
        const result = await operation();
        
        if (result.success) {
          this.log(`✅ ${name} configured successfully`, 'success');
        } else {
          this.log(`❌ ${name} failed: ${result.error}`, 'error');
        }
        
        results.push({ name, ...result });
      } catch (error) {
        this.log(`❌ ${name} failed with exception: ${error.message}`, 'error');
        results.push({ name, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      this.log(`All system defaults configured successfully (${successCount}/${totalCount})`, 'success');
      return { success: true, results };
    } else {
      this.log(`System defaults partially configured (${successCount}/${totalCount})`, 'warn');
      return { 
        success: false, 
        error: `${totalCount - successCount} configuration(s) failed`, 
        results 
      };
    }
  }

  async getCurrentSystemSettings() {
    try {
      const prisma = require("../prisma");
      
      const settings = await prisma.system_settings.findMany({
        orderBy: { label: 'asc' }
      });
      
      const settingsMap = {};
      settings.forEach(setting => {
        settingsMap[setting.label] = setting.value;
      });
      
      return { success: true, settings: settingsMap };
      
    } catch (error) {
      this.log(`Error getting current system settings: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async resetToDefaults() {
    this.log('Resetting system settings to defaults...');
    
    try {
      const defaultConfig = {
        multiUserMode: false,
        appName: 'Codex',
        logoFilename: 'codex-logo.png',
        vectorDb: 'lancedb',
        chunkSize: 1000,
        chunkOverlap: 20,
        supportEmail: '',
        footerLinks: [],
        metaTitle: 'Codex | Your personal LLM trained on anything',
        faviconUrl: '',
        experimentalFeatures: []
      };
      
      return await this.configureDefaults(defaultConfig);
      
    } catch (error) {
      this.log(`Error resetting to defaults: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async validateConfiguration() {
    try {
      this.log('Validating system configuration...');
      
      const currentSettings = await this.getCurrentSystemSettings();
      if (!currentSettings.success) {
        return currentSettings;
      }
      
      const { settings } = currentSettings;
      const issues = [];
      
      // Validate multi-user mode
      if (!['true', 'false'].includes(settings.multi_user_mode)) {
        issues.push('Invalid multi_user_mode value');
      }
      
      // Validate logo filename
      if (!settings.logo_filename) {
        issues.push('Logo filename is not set');
      }
      
      // Validate chunk size
      const chunkSize = parseInt(settings.text_splitter_chunk_size);
      if (isNaN(chunkSize) || chunkSize <= 0) {
        issues.push('Invalid text_splitter_chunk_size');
      }
      
      // Validate chunk overlap
      const chunkOverlap = parseInt(settings.text_splitter_chunk_overlap);
      if (isNaN(chunkOverlap) || chunkOverlap < 0) {
        issues.push('Invalid text_splitter_chunk_overlap');
      }
      
      if (issues.length > 0) {
        return { 
          success: false, 
          error: `Configuration validation failed: ${issues.join(', ')}`,
          issues
        };
      }
      
      this.log('System configuration validation passed', 'success');
      return { success: true, settings };
      
    } catch (error) {
      this.log(`Error validating configuration: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async exportConfiguration() {
    try {
      const currentSettings = await this.getCurrentSystemSettings();
      if (!currentSettings.success) {
        return currentSettings;
      }
      
      const exportData = {
        timestamp: new Date().toISOString(),
        application: 'Codex',
        version: '1.0.0',
        settings: currentSettings.settings
      };
      
      return { success: true, data: exportData };
      
    } catch (error) {
      this.log(`Error exporting configuration: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async importConfiguration(configData) {
    try {
      if (!configData || !configData.settings) {
        return { success: false, error: 'Invalid configuration data' };
      }
      
      this.log('Importing system configuration...');
      
      const { settings } = configData;
      const results = [];
      
      for (const [label, value] of Object.entries(settings)) {
        const result = await this.updateSystemSetting(label, value);
        results.push({ label, ...result });
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        this.log(`Configuration imported successfully (${successCount}/${totalCount})`, 'success');
        return { success: true, results };
      } else {
        this.log(`Configuration partially imported (${successCount}/${totalCount})`, 'warn');
        return { 
          success: false, 
          error: `${totalCount - successCount} setting(s) failed to import`,
          results 
        };
      }
      
    } catch (error) {
      this.log(`Error importing configuration: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

module.exports = SystemConfig;