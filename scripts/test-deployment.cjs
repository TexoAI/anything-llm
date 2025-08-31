#!/usr/bin/env node

/**
 * Test script for deployment automation modules
 * Verifies that all modules can be loaded and basic functions work
 */

const path = require('path');

// Mock environment for testing
process.env.DEPLOY_MODE = 'auto';
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'TestPassword123!';
process.env.MANAGER_USERNAME = 'testmanager';
process.env.MANAGER_PASSWORD = 'ManagerPassword123!';
process.env.DEFAULT_USERNAME = 'testuser';
process.env.DEFAULT_PASSWORD = 'UserPassword123!';

// Mock bcrypt module for testing
const mockBcrypt = {
  hashSync: (password, salt) => `hashed_${password}_${salt}`,
  compareSync: (password, hash) => hash === `hashed_${password}_10`,
  genSaltSync: (rounds) => rounds || 10
};

// Mock prisma module for testing
const mockPrisma = {
  users: {
    count: async () => 0,
    create: async (data) => ({ id: 1, ...data.data }),
    findUnique: async () => null,
    findMany: async () => []
  },
  system_settings: {
    count: async () => 0,
    create: async (data) => ({ id: 1, ...data.data }),
    upsert: async (data) => ({ id: 1, ...data.create || data.update }),
    findMany: async () => []
  },
  api_keys: {
    create: async (data) => ({ id: 1, ...data.data })
  }
};

// Override require for bcrypt and prisma
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'bcrypt') {
    return mockBcrypt;
  }
  if (id === '../prisma' || id === '../utils/prisma' || id.includes('/prisma')) {
    return mockPrisma;
  }
  return originalRequire.apply(this, arguments);
};

console.log('🧪 Testing Deployment Automation Modules...\n');

async function testModules() {
  let allPassed = true;
  
  // Test 1: Load all modules
  console.log('1. Testing module loading...');
  try {
    const UserSetup = require('../server/utils/setup/user-setup.js');
    const ApiKeySetup = require('../server/utils/setup/api-key-setup.js');
    const LLMConfig = require('../server/utils/setup/llm-config.js');
    const EmbeddingConfig = require('../server/utils/setup/embedding-config.js');
    const SystemConfig = require('../server/utils/setup/system-config.js');
    const InitialDeployment = require('../server/utils/setup/initial-deployment.js');
    
    console.log('   ✅ All modules loaded successfully');
  } catch (error) {
    console.log(`   ❌ Module loading failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 2: Test UserSetup validation
  console.log('\n2. Testing UserSetup validation...');
  try {
    const UserSetup = require('../server/utils/setup/user-setup.js');
    const userSetup = new UserSetup();
    
    const validUser = userSetup.validateUserData({
      username: 'testuser',
      password: 'TestPass123!',
      email: 'test@dimatic.com.au'
    });
    
    if (validUser.valid) {
      console.log('   ✅ User validation passed');
    } else {
      console.log(`   ❌ User validation failed: ${validUser.error}`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ UserSetup test failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 3: Test API Key generation
  console.log('\n3. Testing API Key generation...');
  try {
    const ApiKeySetup = require('../server/utils/setup/api-key-setup.js');
    const apiKeySetup = new ApiKeySetup();
    
    const apiKey = apiKeySetup.generateApiKey('codex');
    
    if (apiKey && apiKey.startsWith('codex-') && apiKey.length > 20) {
      console.log('   ✅ API key generation passed');
    } else {
      console.log('   ❌ API key generation failed');
      allPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ API key test failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 4: Test LLM Config validation
  console.log('\n4. Testing LLM Config validation...');
  try {
    const LLMConfig = require('../server/utils/setup/llm-config.js');
    const llmConfig = new LLMConfig();
    
    const validConfig = llmConfig.validateProviderConfig('openai', 'gpt-5-nano', 'sk-test');
    
    if (validConfig.valid) {
      console.log('   ✅ LLM config validation passed');
    } else {
      console.log(`   ❌ LLM config validation failed: ${validConfig.error}`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ LLM config test failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 5: Test Embedding Config validation
  console.log('\n5. Testing Embedding Config validation...');
  try {
    const EmbeddingConfig = require('../server/utils/setup/embedding-config.js');
    const embeddingConfig = new EmbeddingConfig();
    
    const validConfig = embeddingConfig.validateEngineConfig('openai', 'text-embedding-ada-002', 'sk-test');
    
    if (validConfig.valid) {
      console.log('   ✅ Embedding config validation passed');
    } else {
      console.log(`   ❌ Embedding config validation failed: ${validConfig.error}`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Embedding config test failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 6: Test System Config
  console.log('\n6. Testing System Config...');
  try {
    const SystemConfig = require('../server/utils/setup/system-config.js');
    const systemConfig = new SystemConfig();
    
    // Test vector DB validation
    const supportedDbs = systemConfig.supportedVectorDbs;
    
    if (supportedDbs.includes('lancedb') && supportedDbs.includes('pinecone')) {
      console.log('   ✅ System config test passed');
    } else {
      console.log('   ❌ System config test failed');
      allPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ System config test failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 7: Test Initial Deployment setup
  console.log('\n7. Testing Initial Deployment setup...');
  try {
    const InitialDeployment = require('../server/utils/setup/initial-deployment.js');
    const deployment = new InitialDeployment();
    
    const envCheck = await deployment.checkEnvironmentVariables();
    
    if (envCheck) {
      console.log('   ✅ Initial deployment environment check passed');
    } else {
      console.log('   ❌ Initial deployment environment check failed');
      allPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Initial deployment test failed: ${error.message}`);
    allPassed = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All deployment automation tests PASSED!');
    console.log('\n✅ The deployment automation is ready for use.');
    console.log('\n📝 To use the auto-deployment:');
    console.log('   1. Set DEPLOY_MODE=auto in your .env file');
    console.log('   2. Configure user credentials in environment variables');
    console.log('   3. Set LLM and embedding provider settings');
    console.log('   4. Deploy with Docker or run the server normally');
    
    return true;
  } else {
    console.log('❌ Some deployment automation tests FAILED!');
    console.log('\n⚠️  Please review the errors above before deploying.');
    return false;
  }
}

// Run tests
testModules().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});