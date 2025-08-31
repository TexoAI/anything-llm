/**
 * Embedding Configuration Module
 * Handles automatic configuration of embedding providers and models for deployment
 */

class EmbeddingConfig {
  constructor() {
    this.name = "EmbeddingConfig";
    this.supportedEngines = {
      'native': {
        requiredEnvVars: [],
        defaultModel: 'Xenova/all-MiniLM-L6-v2',
        envPrefix: 'EMBEDDING',
        requiresApiKey: false
      },
      'openai': {
        requiredEnvVars: ['OPEN_AI_KEY'],
        defaultModel: 'text-embedding-ada-002',
        envPrefix: 'EMBEDDING',
        requiresApiKey: true
      },
      'azure': {
        requiredEnvVars: ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_KEY'],
        defaultModel: 'text-embedding-ada-002',
        envPrefix: 'EMBEDDING',
        requiresApiKey: true
      },
      'ollama': {
        requiredEnvVars: ['EMBEDDING_BASE_PATH'],
        defaultModel: 'nomic-embed-text:latest',
        envPrefix: 'EMBEDDING',
        requiresApiKey: false
      },
      'localai': {
        requiredEnvVars: ['EMBEDDING_BASE_PATH'],
        defaultModel: 'text-embedding-ada-002',
        envPrefix: 'EMBEDDING',
        requiresApiKey: false
      },
      'cohere': {
        requiredEnvVars: ['COHERE_API_KEY'],
        defaultModel: 'embed-english-v3.0',
        envPrefix: 'EMBEDDING',
        requiresApiKey: true
      },
      'voyageai': {
        requiredEnvVars: ['VOYAGEAI_API_KEY'],
        defaultModel: 'voyage-large-2-instruct',
        envPrefix: 'EMBEDDING',
        requiresApiKey: true
      },
      'gemini': {
        requiredEnvVars: ['GEMINI_EMBEDDING_API_KEY'],
        defaultModel: 'text-embedding-004',
        envPrefix: 'EMBEDDING',
        requiresApiKey: true
      },
      'lmstudio': {
        requiredEnvVars: ['EMBEDDING_BASE_PATH'],
        defaultModel: 'nomic-ai/nomic-embed-text-v1.5-GGUF/nomic-embed-text-v1.5.Q4_0.gguf',
        envPrefix: 'EMBEDDING',
        requiresApiKey: false
      },
      'litellm': {
        requiredEnvVars: ['LITE_LLM_BASE_PATH', 'LITE_LLM_API_KEY'],
        defaultModel: 'text-embedding-ada-002',
        envPrefix: 'EMBEDDING',
        requiresApiKey: true
      },
      'generic-openai': {
        requiredEnvVars: ['EMBEDDING_BASE_PATH', 'GENERIC_OPEN_AI_EMBEDDING_API_KEY'],
        defaultModel: 'text-embedding-ada-002',
        envPrefix: 'EMBEDDING',
        requiresApiKey: true
      }
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${this.name}] [${timestamp}] ${message}`);
  }

  validateEngineConfig(engine, model, apiKey) {
    if (!this.supportedEngines[engine]) {
      return { 
        valid: false, 
        error: `Unsupported embedding engine: ${engine}. Supported: ${Object.keys(this.supportedEngines).join(', ')}` 
      };
    }

    const engineConfig = this.supportedEngines[engine];

    // For engines that require API keys
    if (engineConfig.requiresApiKey && !apiKey) {
      const keyVar = engineConfig.requiredEnvVars.find(v => v.includes('API_KEY') || v.includes('KEY'));
      if (!process.env[keyVar]) {
        return { 
          valid: false, 
          error: `API key required for embedding engine ${engine}` 
        };
      }
    }

    // Validate model is provided
    if (!model) {
      return { 
        valid: false, 
        error: `Model must be specified for embedding engine ${engine}` 
      };
    }

    return { valid: true };
  }

  async setEnvironmentVariables(engine, model, apiKey, additionalConfig = {}) {
    try {
      const { updateENV } = require("../helpers/updateENV");
      
      const updates = {
        EMBEDDING_ENGINE: engine,
        EMBEDDING_MODEL_PREF: model
      };

      const engineConfig = this.supportedEngines[engine];

      // Set API key if provided and required
      if (apiKey && engineConfig.requiresApiKey) {
        const keyVar = engineConfig.requiredEnvVars.find(v => 
          v.includes('API_KEY') || v.includes('KEY')
        );
        if (keyVar) {
          updates[keyVar] = apiKey;
        }
      }

      // Set default chunk size and other parameters
      if (engine === 'native') {
        updates['EMBEDDING_MODEL_MAX_CHUNK_LENGTH'] = additionalConfig.maxChunkLength || '1000';
      } else if (engine === 'ollama') {
        updates['EMBEDDING_BASE_PATH'] = additionalConfig.basePath || 'http://127.0.0.1:11434';
        updates['EMBEDDING_MODEL_MAX_CHUNK_LENGTH'] = additionalConfig.maxChunkLength || '8192';
      } else if (engine === 'localai') {
        updates['EMBEDDING_BASE_PATH'] = additionalConfig.basePath || 'http://localhost:8080/v1';
        updates['EMBEDDING_MODEL_MAX_CHUNK_LENGTH'] = additionalConfig.maxChunkLength || '1000';
      } else if (engine === 'lmstudio') {
        updates['EMBEDDING_BASE_PATH'] = additionalConfig.basePath || 'https://localhost:1234/v1';
        updates['EMBEDDING_MODEL_MAX_CHUNK_LENGTH'] = additionalConfig.maxChunkLength || '8192';
      } else if (engine === 'litellm' || engine === 'generic-openai') {
        updates['EMBEDDING_MODEL_MAX_CHUNK_LENGTH'] = additionalConfig.maxChunkLength || '8192';
        updates['EMBEDDING_BASE_PATH'] = additionalConfig.basePath || 'http://127.0.0.1:4000';
      }

      // Add any additional configuration
      Object.assign(updates, additionalConfig);

      // Update environment variables
      for (const [key, value] of Object.entries(updates)) {
        await updateENV(key, value);
      }

      this.log(`Environment variables updated for embedding engine ${engine}`, 'success');
      return { success: true };

    } catch (error) {
      this.log(`Error setting environment variables: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testEmbeddingConnection(engine, model) {
    try {
      this.log(`Testing embedding connection: ${engine}/${model}`);
      
      // Try to load the appropriate embedding provider
      let EmbeddingProvider;
      
      switch (engine) {
        case 'native':
          EmbeddingProvider = require("../EmbeddingEngines/native");
          break;
        case 'openai':
          EmbeddingProvider = require("../EmbeddingEngines/openAi");
          break;
        case 'azure':
          EmbeddingProvider = require("../EmbeddingEngines/azureOpenAi");
          break;
        case 'ollama':
          EmbeddingProvider = require("../EmbeddingEngines/ollama");
          break;
        case 'cohere':
          EmbeddingProvider = require("../EmbeddingEngines/cohere");
          break;
        default:
          this.log(`Connection test not implemented for engine: ${engine}`, 'warn');
          return { success: true, tested: false };
      }

      // Try a simple test embedding
      const testText = "This is a test for embedding generation.";
      
      const embedder = new EmbeddingProvider();
      const embedding = await embedder.embedTextInput(testText);

      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        this.log(`Embedding connection test successful: ${engine}/${model} (${embedding.length} dimensions)`, 'success');
        return { success: true, tested: true, dimensions: embedding.length };
      } else {
        return { success: false, tested: true, error: 'No embedding generated' };
      }

    } catch (error) {
      this.log(`Embedding connection test failed: ${error.message}`, 'error');
      return { success: false, tested: true, error: error.message };
    }
  }

  async configureDefault(config) {
    const { engine, model, apiKey, testConnection = true, ...additionalConfig } = config;
    
    this.log(`Configuring default embedding: ${engine}/${model}`);

    // Validate configuration
    const validation = this.validateEngineConfig(engine, model, apiKey);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Set environment variables
      const envResult = await this.setEnvironmentVariables(engine, model, apiKey, additionalConfig);
      if (!envResult.success) {
        return envResult;
      }

      // Test connection if requested and supported
      if (testConnection) {
        const testResult = await this.testEmbeddingConnection(engine, model);
        if (testResult.tested && !testResult.success) {
          this.log(`Embedding test failed but continuing with setup: ${testResult.error}`, 'warn');
        }
      }

      this.log(`Embedding configured successfully: ${engine}/${model}`, 'success');
      return { success: true };

    } catch (error) {
      this.log(`Error configuring embedding: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async getCurrentConfig() {
    try {
      const engine = process.env.EMBEDDING_ENGINE;
      
      if (!engine) {
        return { success: true, config: null };
      }

      const engineConfig = this.supportedEngines[engine];
      if (!engineConfig) {
        return { success: false, error: `Unknown embedding engine: ${engine}` };
      }

      const model = process.env.EMBEDDING_MODEL_PREF;
      const maxChunkLength = process.env.EMBEDDING_MODEL_MAX_CHUNK_LENGTH;
      const basePath = process.env.EMBEDDING_BASE_PATH;

      const config = {
        engine,
        model,
        maxChunkLength,
        basePath,
        hasApiKey: engineConfig.requiresApiKey && engineConfig.requiredEnvVars.some(envVar => 
          process.env[envVar] && envVar.includes('KEY')
        )
      };

      return { success: true, config };

    } catch (error) {
      this.log(`Error getting current config: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async listSupportedEngines() {
    return {
      success: true,
      engines: Object.keys(this.supportedEngines).map(key => ({
        name: key,
        defaultModel: this.supportedEngines[key].defaultModel,
        requiresApiKey: this.supportedEngines[key].requiresApiKey,
        requiredEnvVars: this.supportedEngines[key].requiredEnvVars
      }))
    };
  }

  async resetConfiguration() {
    try {
      const { updateENV } = require("../helpers/updateENV");
      
      // Clear embedding-related environment variables
      await updateENV('EMBEDDING_ENGINE', '');
      await updateENV('EMBEDDING_MODEL_PREF', '');
      await updateENV('EMBEDDING_MODEL_MAX_CHUNK_LENGTH', '');
      await updateENV('EMBEDDING_BASE_PATH', '');
      
      // Clear engine-specific variables
      for (const [engine, config] of Object.entries(this.supportedEngines)) {
        // Clear API keys
        for (const envVar of config.requiredEnvVars) {
          if (envVar.includes('KEY')) {
            await updateENV(envVar, '');
          }
        }
      }

      this.log('Embedding configuration reset', 'success');
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
        return { success: false, error: 'No embedding engine configured' };
      }

      const { updateENV } = require("../helpers/updateENV");
      
      await updateENV('EMBEDDING_MODEL_PREF', newModel);
      
      this.log(`Embedding model updated to: ${newModel}`, 'success');
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
        return { success: false, error: 'No embedding engine configured' };
      }

      const { engine, model } = currentConfig.config;
      
      // Validate current configuration
      const validation = this.validateEngineConfig(engine, model);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      this.log(`Configuration validation passed: ${engine}/${model}`, 'success');
      return { success: true, config: currentConfig.config };

    } catch (error) {
      this.log(`Error validating configuration: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async updateChunkSize(newSize) {
    try {
      const { updateENV } = require("../helpers/updateENV");
      
      const chunkSize = parseInt(newSize);
      if (isNaN(chunkSize) || chunkSize < 100) {
        return { success: false, error: 'Chunk size must be a number >= 100' };
      }
      
      await updateENV('EMBEDDING_MODEL_MAX_CHUNK_LENGTH', chunkSize.toString());
      
      this.log(`Embedding chunk size updated to: ${chunkSize}`, 'success');
      return { success: true };

    } catch (error) {
      this.log(`Error updating chunk size: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async getEmbeddingStats() {
    try {
      const currentConfig = await this.getCurrentConfig();
      
      if (!currentConfig.success || !currentConfig.config) {
        return { success: false, error: 'No embedding configuration found' };
      }

      const { engine, model, maxChunkLength } = currentConfig.config;
      
      // Get some basic stats about embeddings if possible
      const stats = {
        engine,
        model,
        maxChunkLength: parseInt(maxChunkLength) || 1000,
        configured: true
      };

      return { success: true, stats };

    } catch (error) {
      this.log(`Error getting embedding stats: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmbeddingConfig;