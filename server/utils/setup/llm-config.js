/**
 * LLM Configuration Module
 * Handles automatic configuration of LLM providers and models for deployment
 */

class LLMConfig {
  constructor() {
    this.name = "LLMConfig";
    this.supportedProviders = {
      'openai': {
        requiredEnvVars: ['OPEN_AI_KEY'],
        defaultModel: 'gpt-5-nano',
        envPrefix: 'OPEN'
      },
      'anthropic': {
        requiredEnvVars: ['ANTHROPIC_API_KEY'],
        defaultModel: 'claude-3-sonnet-20240229',
        envPrefix: 'ANTHROPIC'
      },
      'azure': {
        requiredEnvVars: ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_KEY'],
        defaultModel: 'gpt-4o',
        envPrefix: 'AZURE'
      },
      'ollama': {
        requiredEnvVars: ['OLLAMA_BASE_PATH'],
        defaultModel: 'llama2',
        envPrefix: 'OLLAMA'
      },
      'lmstudio': {
        requiredEnvVars: ['LMSTUDIO_BASE_PATH'],
        defaultModel: 'model-identifier',
        envPrefix: 'LMSTUDIO'
      },
      'localai': {
        requiredEnvVars: ['LOCAL_AI_BASE_PATH'],
        defaultModel: 'gpt-3.5-turbo',
        envPrefix: 'LOCAL_AI'
      },
      'groq': {
        requiredEnvVars: ['GROQ_API_KEY'],
        defaultModel: 'llama3-8b-8192',
        envPrefix: 'GROQ'
      },
      'togetherai': {
        requiredEnvVars: ['TOGETHER_AI_API_KEY'],
        defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        envPrefix: 'TOGETHER_AI'
      },
      'gemini': {
        requiredEnvVars: ['GEMINI_API_KEY'],
        defaultModel: 'gemini-2.0-flash-lite',
        envPrefix: 'GEMINI'
      },
      'bedrock': {
        requiredEnvVars: ['AWS_BEDROCK_LLM_ACCESS_KEY_ID', 'AWS_BEDROCK_LLM_ACCESS_KEY'],
        defaultModel: 'meta.llama3-1-8b-instruct-v1:0',
        envPrefix: 'AWS_BEDROCK_LLM'
      }
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${this.name}] [${timestamp}] ${message}`);
  }

  validateProviderConfig(provider, model, apiKey) {
    if (!this.supportedProviders[provider]) {
      return { 
        valid: false, 
        error: `Unsupported LLM provider: ${provider}. Supported: ${Object.keys(this.supportedProviders).join(', ')}` 
      };
    }

    const providerConfig = this.supportedProviders[provider];

    // For providers that require API keys
    if (providerConfig.requiredEnvVars.some(envVar => envVar.includes('API_KEY') || envVar.includes('KEY'))) {
      if (!apiKey && !process.env[providerConfig.requiredEnvVars.find(v => v.includes('KEY'))]) {
        return { 
          valid: false, 
          error: `API key required for provider ${provider}` 
        };
      }
    }

    // Validate model is provided
    if (!model) {
      return { 
        valid: false, 
        error: `Model must be specified for provider ${provider}` 
      };
    }

    return { valid: true };
  }

  async setEnvironmentVariables(provider, model, apiKey, additionalConfig = {}) {
    try {
      const { updateENV } = require("../helpers/updateENV");
      
      const updates = {
        LLM_PROVIDER: provider,
        [`${this.supportedProviders[provider].envPrefix}_MODEL_PREF`]: model
      };

      // Set API key if provided
      if (apiKey) {
        const keyVar = this.supportedProviders[provider].requiredEnvVars.find(v => 
          v.includes('API_KEY') || v.includes('KEY')
        );
        if (keyVar) {
          updates[keyVar] = apiKey;
        }
      }

      // Add any additional configuration
      Object.assign(updates, additionalConfig);

      // Update environment variables
      for (const [key, value] of Object.entries(updates)) {
        await updateENV(key, value);
      }

      this.log(`Environment variables updated for ${provider}`, 'success');
      return { success: true };

    } catch (error) {
      this.log(`Error setting environment variables: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testLLMConnection(provider, model) {
    try {
      this.log(`Testing LLM connection: ${provider}/${model}`);
      
      // Try to load the appropriate LLM provider
      let LLMProvider;
      
      switch (provider) {
        case 'openai':
          LLMProvider = require("../AiProviders/openAi");
          break;
        case 'anthropic':
          LLMProvider = require("../AiProviders/anthropic");
          break;
        case 'azure':
          LLMProvider = require("../AiProviders/azureOpenAi");
          break;
        case 'ollama':
          LLMProvider = require("../AiProviders/ollama");
          break;
        case 'gemini':
          LLMProvider = require("../AiProviders/gemini");
          break;
        case 'groq':
          LLMProvider = require("../AiProviders/groq");
          break;
        default:
          this.log(`Connection test not implemented for provider: ${provider}`, 'warn');
          return { success: true, tested: false };
      }

      // Try a simple test completion
      const testPrompt = [{ role: 'user', content: 'Hello, respond with "OK" if you can read this.' }];
      
      const response = await LLMProvider.getChatCompletion(testPrompt, {
        temperature: 0,
        maxTokens: 10
      });

      if (response) {
        this.log(`LLM connection test successful: ${provider}/${model}`, 'success');
        return { success: true, tested: true, response };
      } else {
        return { success: false, tested: true, error: 'No response from LLM' };
      }

    } catch (error) {
      this.log(`LLM connection test failed: ${error.message}`, 'error');
      return { success: false, tested: true, error: error.message };
    }
  }

  async configureDefault(config) {
    const { provider, model, apiKey, testConnection = true } = config;
    
    this.log(`Configuring default LLM: ${provider}/${model}`);

    // Validate configuration
    const validation = this.validateProviderConfig(provider, model, apiKey);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Set environment variables
      const envResult = await this.setEnvironmentVariables(provider, model, apiKey);
      if (!envResult.success) {
        return envResult;
      }

      // Test connection if requested and supported
      if (testConnection) {
        const testResult = await this.testLLMConnection(provider, model);
        if (testResult.tested && !testResult.success) {
          this.log(`LLM test failed but continuing with setup: ${testResult.error}`, 'warn');
        }
      }

      this.log(`LLM configured successfully: ${provider}/${model}`, 'success');
      return { success: true };

    } catch (error) {
      this.log(`Error configuring LLM: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async getCurrentConfig() {
    try {
      const provider = process.env.LLM_PROVIDER;
      
      if (!provider) {
        return { success: true, config: null };
      }

      const providerConfig = this.supportedProviders[provider];
      if (!providerConfig) {
        return { success: false, error: `Unknown provider: ${provider}` };
      }

      const modelVar = `${providerConfig.envPrefix}_MODEL_PREF`;
      const model = process.env[modelVar];

      const config = {
        provider,
        model,
        hasApiKey: !!providerConfig.requiredEnvVars.some(envVar => 
          process.env[envVar] && envVar.includes('KEY')
        )
      };

      return { success: true, config };

    } catch (error) {
      this.log(`Error getting current config: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async listSupportedProviders() {
    return {
      success: true,
      providers: Object.keys(this.supportedProviders).map(key => ({
        name: key,
        defaultModel: this.supportedProviders[key].defaultModel,
        requiredEnvVars: this.supportedProviders[key].requiredEnvVars
      }))
    };
  }

  async resetConfiguration() {
    try {
      const { updateENV } = require("../helpers/updateENV");
      
      // Clear LLM-related environment variables
      await updateENV('LLM_PROVIDER', '');
      
      // Clear provider-specific variables
      for (const [provider, config] of Object.entries(this.supportedProviders)) {
        const modelVar = `${config.envPrefix}_MODEL_PREF`;
        await updateENV(modelVar, '');
        
        // Clear API keys
        for (const envVar of config.requiredEnvVars) {
          if (envVar.includes('KEY')) {
            await updateENV(envVar, '');
          }
        }
      }

      this.log('LLM configuration reset', 'success');
      return { success: true };

    } catch (error) {
      this.log(`Error resetting configuration: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async updateModel(newModel) {
    try {
      const currentConfig = await this.getCurrentConfig();
      
      if (!currentConfig.success || !currentConfig.config) {
        return { success: false, error: 'No LLM provider configured' };
      }

      const { provider } = currentConfig.config;
      const { updateENV } = require("../helpers/updateENV");
      
      const providerConfig = this.supportedProviders[provider];
      const modelVar = `${providerConfig.envPrefix}_MODEL_PREF`;
      
      await updateENV(modelVar, newModel);
      
      this.log(`Model updated to: ${newModel}`, 'success');
      return { success: true };

    } catch (error) {
      this.log(`Error updating model: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async validateConfiguration() {
    try {
      const currentConfig = await this.getCurrentConfig();
      
      if (!currentConfig.success) {
        return currentConfig;
      }

      if (!currentConfig.config) {
        return { success: false, error: 'No LLM provider configured' };
      }

      const { provider, model } = currentConfig.config;
      
      // Validate current configuration
      const validation = this.validateProviderConfig(provider, model);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      this.log(`Configuration validation passed: ${provider}/${model}`, 'success');
      return { success: true, config: currentConfig.config };

    } catch (error) {
      this.log(`Error validating configuration: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

module.exports = LLMConfig;