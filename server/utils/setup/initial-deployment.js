/**
 * Initial Deployment Automation Module
 * Orchestrates automatic setup of Codex on first deployment
 */

const UserSetup = require('./user-setup');
const ApiKeySetup = require('./api-key-setup');
const LLMConfig = require('./llm-config');
const EmbeddingConfig = require('./embedding-config');
const SystemConfig = require('./system-config');

class InitialDeployment {
  constructor() {
    this.name = "InitialDeployment";
    this.deployMode = process.env.DEPLOY_MODE;
    this.isAutoDeployment = this.deployMode === 'auto';
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${this.name}] [${timestamp}] ${message}`);
  }

  async checkEnvironmentVariables() {
    const requiredVars = [
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'MANAGER_USERNAME', 
      'MANAGER_PASSWORD',
      'DEFAULT_USERNAME',
      'DEFAULT_PASSWORD'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.log(`Missing required environment variables: ${missingVars.join(', ')}`, 'error');
      return false;
    }

    return true;
  }

  async isFirstRun() {
    try {
      const prisma = require("../prisma");
      
      // Check if any users exist
      const userCount = await prisma.users.count();
      
      // Check if system settings exist
      const settingsCount = await prisma.system_settings.count();
      
      return userCount === 0 && settingsCount === 0;
    } catch (error) {
      this.log(`Error checking first run status: ${error.message}`, 'error');
      return false;
    }
  }

  async setupUsers() {
    this.log('Setting up user accounts...');
    
    const userSetup = new UserSetup();
    
    try {
      // Create admin user
      const adminResult = await userSetup.createAdminUser({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        email: process.env.ADMIN_EMAIL
      });
      
      if (adminResult.success) {
        this.log(`Admin user '${process.env.ADMIN_USERNAME}' created successfully`, 'success');
      } else {
        this.log(`Failed to create admin user: ${adminResult.error}`, 'error');
        return false;
      }

      // Create manager user
      const managerResult = await userSetup.createManagerUser({
        username: process.env.MANAGER_USERNAME,
        password: process.env.MANAGER_PASSWORD,
        email: process.env.MANAGER_EMAIL
      });
      
      if (managerResult.success) {
        this.log(`Manager user '${process.env.MANAGER_USERNAME}' created successfully`, 'success');
      } else {
        this.log(`Failed to create manager user: ${managerResult.error}`, 'error');
        return false;
      }

      // Create default user
      const defaultResult = await userSetup.createDefaultUser({
        username: process.env.DEFAULT_USERNAME,
        password: process.env.DEFAULT_PASSWORD,
        email: process.env.DEFAULT_EMAIL
      });
      
      if (defaultResult.success) {
        this.log(`Default user '${process.env.DEFAULT_USERNAME}' created successfully`, 'success');
      } else {
        this.log(`Failed to create default user: ${defaultResult.error}`, 'error');
        return false;
      }

      return true;
    } catch (error) {
      this.log(`Error setting up users: ${error.message}`, 'error');
      return false;
    }
  }

  async setupApiKeys() {
    this.log('Setting up API keys...');
    
    const apiKeySetup = new ApiKeySetup();
    
    try {
      const results = await apiKeySetup.createDefaultApiKeys({
        adminKey: process.env.API_KEY_ADMIN,
        managerKey: process.env.API_KEY_MANAGER,
        defaultKey: process.env.API_KEY_DEFAULT
      });
      
      if (results.success) {
        this.log('API keys created successfully', 'success');
        return true;
      } else {
        this.log(`Failed to create API keys: ${results.error}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Error setting up API keys: ${error.message}`, 'error');
      return false;
    }
  }

  async setupLLMConfiguration() {
    if (!process.env.DEFAULT_LLM_PROVIDER) {
      this.log('No LLM configuration provided, skipping...', 'warn');
      return true;
    }

    this.log('Configuring LLM settings...');
    
    const llmConfig = new LLMConfig();
    
    try {
      const result = await llmConfig.configureDefault({
        provider: process.env.DEFAULT_LLM_PROVIDER,
        model: process.env.DEFAULT_LLM_MODEL,
        apiKey: process.env.DEFAULT_LLM_API_KEY
      });
      
      if (result.success) {
        this.log(`LLM configured: ${process.env.DEFAULT_LLM_PROVIDER}/${process.env.DEFAULT_LLM_MODEL}`, 'success');
        return true;
      } else {
        this.log(`Failed to configure LLM: ${result.error}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Error configuring LLM: ${error.message}`, 'error');
      return false;
    }
  }

  async setupEmbeddingConfiguration() {
    if (!process.env.DEFAULT_EMBEDDING_ENGINE) {
      this.log('No embedding configuration provided, skipping...', 'warn');
      return true;
    }

    this.log('Configuring embedding settings...');
    
    const embeddingConfig = new EmbeddingConfig();
    
    try {
      const result = await embeddingConfig.configureDefault({
        engine: process.env.DEFAULT_EMBEDDING_ENGINE,
        model: process.env.DEFAULT_EMBEDDING_MODEL,
        apiKey: process.env.DEFAULT_EMBEDDING_API_KEY
      });
      
      if (result.success) {
        this.log(`Embedding configured: ${process.env.DEFAULT_EMBEDDING_ENGINE}/${process.env.DEFAULT_EMBEDDING_MODEL}`, 'success');
        return true;
      } else {
        this.log(`Failed to configure embedding: ${result.error}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Error configuring embedding: ${error.message}`, 'error');
      return false;
    }
  }

  async setupSystemConfiguration() {
    this.log('Configuring system settings...');
    
    const systemConfig = new SystemConfig();
    
    try {
      const result = await systemConfig.configureDefaults({
        multiUserMode: process.env.DEFAULT_MULTI_USER_MODE === 'true',
        appName: process.env.DEFAULT_APP_NAME || 'Codex',
        logoFilename: process.env.DEFAULT_LOGO_FILENAME || 'codex-logo.png',
        vectorDb: process.env.DEFAULT_VECTOR_DB || 'lancedb'
      });
      
      if (result.success) {
        this.log('System configuration completed', 'success');
        return true;
      } else {
        this.log(`Failed to configure system: ${result.error}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Error configuring system: ${error.message}`, 'error');
      return false;
    }
  }

  async createDeploymentMarker() {
    try {
      const prisma = require("../prisma");
      
      await prisma.system_settings.upsert({
        where: { label: 'deployment_completed' },
        update: { 
          value: new Date().toISOString(),
          updatedAt: new Date()
        },
        create: {
          label: 'deployment_completed',
          value: new Date().toISOString()
        }
      });
      
      this.log('Deployment marker created', 'success');
    } catch (error) {
      this.log(`Error creating deployment marker: ${error.message}`, 'error');
    }
  }

  async run() {
    this.log('🚀 Starting initial deployment automation...');
    
    if (!this.isAutoDeployment) {
      this.log('DEPLOY_MODE is not set to "auto", skipping automatic deployment');
      return true;
    }

    // Check if this is the first run
    const isFirstRun = await this.isFirstRun();
    if (!isFirstRun) {
      this.log('System appears to be already configured, skipping automatic deployment');
      return true;
    }

    // Check environment variables
    if (!(await this.checkEnvironmentVariables())) {
      return false;
    }

    let success = true;

    // Run setup steps
    const steps = [
      { name: 'User Setup', method: this.setupUsers.bind(this) },
      { name: 'API Key Setup', method: this.setupApiKeys.bind(this) },
      { name: 'LLM Configuration', method: this.setupLLMConfiguration.bind(this) },
      { name: 'Embedding Configuration', method: this.setupEmbeddingConfiguration.bind(this) },
      { name: 'System Configuration', method: this.setupSystemConfiguration.bind(this) }
    ];

    for (const step of steps) {
      this.log(`Running: ${step.name}`);
      const stepResult = await step.method();
      
      if (!stepResult) {
        this.log(`❌ ${step.name} failed`, 'error');
        success = false;
        break;
      }
    }

    if (success) {
      await this.createDeploymentMarker();
      this.log('🎉 Initial deployment completed successfully!', 'success');
      
      this.log('System Information:', 'info');
      this.log(`  • Admin: ${process.env.ADMIN_USERNAME}`, 'info');
      this.log(`  • Manager: ${process.env.MANAGER_USERNAME}`, 'info');
      this.log(`  • User: ${process.env.DEFAULT_USERNAME}`, 'info');
      this.log(`  • LLM: ${process.env.DEFAULT_LLM_PROVIDER || 'Not configured'}`, 'info');
      this.log(`  • Embedding: ${process.env.DEFAULT_EMBEDDING_ENGINE || 'Not configured'}`, 'info');
      this.log(`  • Multi-user: ${process.env.DEFAULT_MULTI_USER_MODE === 'true' ? 'Enabled' : 'Disabled'}`, 'info');
    } else {
      this.log('❌ Initial deployment failed', 'error');
    }

    return success;
  }
}

// Export for use as module
module.exports = InitialDeployment;

// Run if called directly
if (require.main === module) {
  const deployment = new InitialDeployment();
  deployment.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal error during deployment:', error);
    process.exit(1);
  });
}