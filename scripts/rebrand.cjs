#!/usr/bin/env node

/**
 * Automated Rebranding Script
 * Converts Dimatic/Codex to Dimatic/Codex
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Brand replacement mappings
const BRAND_REPLACEMENTS = [
  // Company name replacements (case sensitive)
  { from: 'Mintplex', to: 'Dimatic', caseSensitive: true },
  { from: 'mintplex', to: 'dimatic', caseSensitive: true },
  { from: 'MINTPLEX', to: 'DIMATIC', caseSensitive: true },
  { from: 'Mintplex-Labs', to: 'Dimatic-Labs', caseSensitive: true },
  { from: 'mintplex-labs', to: 'dimatic-labs', caseSensitive: true },
  { from: 'mintplexlabs', to: 'dimatic', caseSensitive: true },
  
  // Product name replacements
  { from: 'AnythingLLM', to: 'Codex', caseSensitive: true },
  { from: 'anythingllm', to: 'codex', caseSensitive: true },
  { from: 'anything-llm', to: 'codex', caseSensitive: true },
  { from: 'ANYTHINGLLM', to: 'CODEX', caseSensitive: true },
  
  // URL replacements
  { from: 'https://anythingllm.com', to: 'https://codex.dimatic.com.au', caseSensitive: false },
  { from: 'https://docs.anythingllm.com', to: 'https://docs.codex.dimatic.com.au', caseSensitive: false },
  { from: 'http://anythingllm.com', to: 'http://codex.dimatic.com.au', caseSensitive: false },
  { from: 'anythingllm.com', to: 'codex.dimatic.com.au', caseSensitive: false },
  { from: 'docs.anythingllm.com', to: 'docs.codex.dimatic.com.au', caseSensitive: false },
  { from: 'my.mintplexlabs.com', to: 'my.dimatic.com.au', caseSensitive: false },
  
  // Docker and package references
  { from: 'mintplexlabs/anythingllm', to: 'dimatic/codex', caseSensitive: false },
  { from: '@mintplex-labs/', to: '@dimatic/', caseSensitive: false },
  
  // Email domains (if any)
  { from: '@mintplexlabs.com', to: '@dimatic.com.au', caseSensitive: false },
  { from: '@anythingllm.com', to: '@dimatic.com.au', caseSensitive: false },
];

// Files to exclude from processing
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '*.log',
  '*.lock',
  '.cache/**',
  'coverage/**',
  '.nyc_output/**',
  'scripts/rebrand.js', // Don't modify this script itself
  'REBRANDING_AND_DEPLOYMENT_PLAN.md' // Don't modify the plan
];

// Binary file extensions to skip
const BINARY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.pdf', '.zip', '.tar', '.gz'];

class RebrandingTool {
  constructor() {
    this.processedFiles = 0;
    this.modifiedFiles = 0;
    this.errors = [];
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
    this.baseDir = path.resolve(__dirname, '..');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async isTextFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (BINARY_EXTENSIONS.includes(ext)) return false;
      
      // Read first 1024 bytes to check for binary content
      const buffer = await fs.readFile(filePath, { encoding: null });
      const sample = buffer.slice(0, Math.min(1024, buffer.length));
      
      // Check for null bytes (common in binary files)
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  shouldExcludeFile(filePath) {
    const relativePath = path.relative(this.baseDir, filePath);
    
    return EXCLUDE_PATTERNS.some(pattern => {
      // Convert glob pattern to regex (simple implementation)
      const regex = new RegExp(
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '[^/]')
      );
      return regex.test(relativePath);
    });
  }

  async getAllFiles(dir = this.baseDir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (this.shouldExcludeFile(fullPath)) {
          if (this.verbose) {
            this.log(`Skipping excluded: ${path.relative(this.baseDir, fullPath)}`);
          }
          continue;
        }
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.log(`Error reading directory ${dir}: ${error.message}`, 'error');
      this.errors.push({ file: dir, error: error.message });
    }
    
    return files;
  }

  applyReplacements(content) {
    let modifiedContent = content;
    let hasChanges = false;
    
    for (const replacement of BRAND_REPLACEMENTS) {
      const flags = replacement.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(replacement.from.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), flags);
      
      const originalLength = modifiedContent.length;
      modifiedContent = modifiedContent.replace(regex, replacement.to);
      
      if (modifiedContent.length !== originalLength || !modifiedContent.includes(replacement.from)) {
        hasChanges = true;
        if (this.verbose) {
          console.log(`  - Replaced "${replacement.from}" with "${replacement.to}"`);
        }
      }
    }
    
    return { content: modifiedContent, hasChanges };
  }

  async processFile(filePath) {
    try {
      this.processedFiles++;
      const relativePath = path.relative(this.baseDir, filePath);
      
      if (this.verbose) {
        this.log(`Processing: ${relativePath}`);
      }
      
      // Check if it's a text file
      if (!(await this.isTextFile(filePath))) {
        if (this.verbose) {
          this.log(`Skipping binary file: ${relativePath}`);
        }
        return;
      }
      
      // Read file content
      const originalContent = await fs.readFile(filePath, 'utf8');
      
      // Apply replacements
      const { content: modifiedContent, hasChanges } = this.applyReplacements(originalContent);
      
      if (hasChanges) {
        this.modifiedFiles++;
        this.log(`Modified: ${relativePath}`, 'success');
        
        if (!this.dryRun) {
          await fs.writeFile(filePath, modifiedContent, 'utf8');
        }
      }
      
    } catch (error) {
      this.log(`Error processing ${filePath}: ${error.message}`, 'error');
      this.errors.push({ file: filePath, error: error.message });
    }
  }

  async renameFiles() {
    this.log('Checking for files and directories to rename...');
    
    try {
      // Find files with old branding in names
      const { stdout } = await execAsync('find . -name "*anythingllm*" -o -name "*mintplex*" -o -name "*anything-llm*"', {
        cwd: this.baseDir,
        maxBuffer: 1024 * 1024
      });
      
      const filesToRename = stdout.trim().split('\n').filter(f => f && !f.includes('node_modules'));
      
      for (const oldPath of filesToRename) {
        let newPath = oldPath
          .replace(/anythingllm/g, 'codex')
          .replace(/mintplex/g, 'dimatic')
          .replace(/AnythingLLM/g, 'Codex')
          .replace(/Mintplex/g, 'Dimatic');
        
        if (newPath !== oldPath) {
          this.log(`Renaming: ${oldPath} → ${newPath}`);
          
          if (!this.dryRun) {
            const fullOldPath = path.resolve(this.baseDir, oldPath);
            const fullNewPath = path.resolve(this.baseDir, newPath);
            
            // Ensure destination directory exists
            await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
            await fs.rename(fullOldPath, fullNewPath);
          }
        }
      }
    } catch (error) {
      if (error.code !== 1) { // find returns 1 when no files found, which is ok
        this.log(`Error finding files to rename: ${error.message}`, 'error');
      }
    }
  }

  async run() {
    const startTime = Date.now();
    
    this.log('🚀 Starting rebranding process...');
    if (this.dryRun) {
      this.log('🧪 DRY RUN MODE - No files will be modified');
    }
    
    // Get all files to process
    this.log('📁 Scanning files...');
    const files = await this.getAllFiles();
    this.log(`Found ${files.length} files to process`);
    
    // Process all files
    this.log('🔄 Processing files...');
    for (const file of files) {
      await this.processFile(file);
    }
    
    // Rename files with old branding in names
    await this.renameFiles();
    
    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    this.log('📊 Rebranding Summary:');
    this.log(`   • Files processed: ${this.processedFiles}`);
    this.log(`   • Files modified: ${this.modifiedFiles}`);
    this.log(`   • Errors: ${this.errors.length}`);
    this.log(`   • Duration: ${duration}s`);
    
    if (this.errors.length > 0) {
      this.log('❌ Errors encountered:', 'error');
      this.errors.forEach(({ file, error }) => {
        this.log(`   • ${file}: ${error}`, 'error');
      });
    }
    
    if (this.dryRun) {
      this.log('🧪 This was a dry run. Run without --dry-run to apply changes.');
    } else {
      this.log('✅ Rebranding complete!', 'success');
    }
    
    return this.errors.length === 0;
  }
}

// Run the tool
if (require.main === module) {
  const tool = new RebrandingTool();
  
  tool.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = RebrandingTool;