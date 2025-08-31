# Rebranding and Deployment Automation Plan

## Overview
This plan outlines the steps to rebrand AnythingLLM from "Mintplex/AnythingLLM" to "Dimatic/Codex" and implement automatic deployment configuration with pre-configured admin, manager, and default users, API keys, and LLM/embedding settings.

## Phase 1: Rebranding Strategy

### 1.1 Brand Name Replacements
- **Primary Brand Changes:**
  - `Mintplex` → `Dimatic` (81 files)
  - `mintplex` → `dimatic` (case-insensitive)
  - `AnythingLLM` → `Codex` (183 files)
  - `anythingllm` → `codex` (case-insensitive)
  - `anything-llm` → `codex`

### 1.2 Critical Files for Rebranding

#### Frontend Files (High Priority)
- `/frontend/index.html` - Page title and meta tags
- `/frontend/src/utils/constants.js` - Application constants
- `/frontend/src/utils/paths.js` - URL paths and endpoints
- `/frontend/src/components/DefaultChat/index.jsx` - Default chat UI
- `/frontend/src/components/SettingsSidebar/index.jsx` - Settings sidebar
- `/frontend/src/pages/OnboardingFlow/Steps/Home/index.jsx` - Onboarding
- `/frontend/src/LogoContext.jsx` - Logo management
- `/frontend/src/locales/*/common.js` - All language files (22 files)
- `/frontend/public/embed/anythingllm-chat-widget.min.js` - Embedded widget

#### Server Files (High Priority)
- `/server/utils/boot/MetaGenerator.js` - Meta tags generation
- `/server/utils/telemetry/index.js` - Telemetry endpoints
- `/server/swagger/openapi.json` - API documentation
- `/server/endpoints/utils.js` - Utility endpoints
- `/server/prisma/seed.js` - Database seeding
- `/server/package.json` - Package metadata

#### Package Files
- `/package.json` - Root package
- `/frontend/package.json` - Frontend package
- `/server/package.json` - Server package
- `/collector/package.json` - Collector package

#### Docker & Deployment Files
- `/docker/Dockerfile` - Docker image configuration
- `/docker/docker-compose.yml` - Docker compose setup
- `/docker/HOW_TO_USE_DOCKER.md` - Documentation
- `/cloud-deployments/*/` - All cloud deployment templates
- `/.github/workflows/*.yaml` - GitHub Actions workflows

#### Documentation Files
- `/README.md` - Main repository readme
- `/CONTRIBUTING.md` - Contribution guidelines
- `/SECURITY.md` - Security policy
- `/LICENSE` - License file
- All `/locales/README.*.md` files

### 1.3 URLs and Domains to Update
- `https://anythingllm.com` → `https://codex.dimatic.com.au` (or your domain)
- `https://docs.anythingllm.com` → `https://docs.codex.dimatic.com.au`
- `https://my.mintplexlabs.com` → `https://my.dimatic.com.au`
- GitHub repository references
- Docker Hub references: `mintplexlabs/anythingllm` → `dimatic/codex`

### 1.4 NPM Package Dependencies
- `@mintplex-labs/express-ws` - May need forking or replacement

## Phase 2: Deployment Automation Strategy

### 2.1 Environment Configuration Enhancement

Create a new initialization script `/server/utils/setup/initial-deployment.js`:
```javascript
// This script will run on first deployment to configure:
// 1. Admin account creation
// 2. Manager and default user accounts
// 3. API key generation
// 4. LLM provider settings
// 5. Embedding provider settings
// 6. System settings
```

### 2.2 Enhanced Environment Variables

Add to `.env.example`:
```bash
# Auto-deployment Configuration
DEPLOY_MODE=auto # Set to 'auto' for automatic setup

# Admin Account (created on first run)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SecurePassword123!
ADMIN_EMAIL=admin@dimatic.com

# Manager Account (created on first run)
MANAGER_USERNAME=manager
MANAGER_PASSWORD=ManagerPass123!
MANAGER_EMAIL=manager@dimatic.com

# Default User Account (created on first run)
DEFAULT_USERNAME=default
DEFAULT_PASSWORD=UserPass123!
DEFAULT_EMAIL=user@dimatic.com

# Pre-configured API Keys
API_KEY_ADMIN=codex-admin-key-xxxxx
API_KEY_MANAGER=codex-manager-key-xxxxx
API_KEY_DEFAULT=codex-user-key-xxxxx

# Default LLM Configuration
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-5-nano
DEFAULT_LLM_API_KEY=sk-xxxxx

# Default Embedding Configuration  
DEFAULT_EMBEDDING_ENGINE=openai
DEFAULT_EMBEDDING_MODEL=text-embedding-ada-002
DEFAULT_EMBEDDING_API_KEY=sk-xxxxx

# Default Vector Database
DEFAULT_VECTOR_DB=lancedb

# System Settings
DEFAULT_MULTI_USER_MODE=true
DEFAULT_APP_NAME=Codex
DEFAULT_LOGO_FILENAME=anything-llm-logo.png
```

### 2.3 Database Initialization Script

Enhance `/server/prisma/seed.js` to:
1. Check for `DEPLOY_MODE=auto`
2. Create admin, manager, and default users with specified credentials
3. Generate and store API keys
4. Configure LLM and embedding settings
5. Set system defaults

### 2.4 Docker Entrypoint Enhancement

Update `/docker/docker-entrypoint.sh`:
```bash
#!/bin/bash

# ... existing checks ...

# Auto-deployment configuration
if [ "$DEPLOY_MODE" = "auto" ]; then
    echo "Running automatic deployment configuration..."
    
    # Wait for database to be ready
    npx prisma migrate deploy --schema=./prisma/schema.prisma
    
    # Run initial setup script
    node /app/server/utils/setup/initial-deployment.js
    
    echo "Automatic deployment configuration complete!"
fi

# ... rest of script ...
```

### 2.5 New Setup Module Structure

Create `/server/utils/setup/` directory:
```
/server/utils/setup/
├── initial-deployment.js    # Main setup orchestrator
├── user-setup.js            # User account creation
├── api-key-setup.js         # API key generation
├── llm-config.js           # LLM provider configuration
├── embedding-config.js      # Embedding configuration
└── system-config.js        # System settings configuration
```

## Phase 3: Implementation Steps

### Step 1: Create Rebranding Script
Create `/scripts/rebrand.js`:
```javascript
// Automated script to handle all text replacements
// Will process all files and update branding
```

### Step 2: Update Logo and Assets
1. Replace `/server/storage/logos/anything-llm.png` with new Codex logo
2. Update `/frontend/public/favicon.png`
3. Update any other image assets

### Step 3: Test Deployment Automation
1. Create test environment with clean database
2. Set environment variables for auto-deployment
3. Run deployment and verify:
   - Users are created correctly
   - API keys are functional
   - LLM/embedding settings are configured
   - System can process documents

### Step 4: Update CI/CD Pipelines
1. Modify GitHub Actions workflows for new branding
2. Update Docker build processes
3. Configure new Docker Hub repository

### Step 5: Documentation Updates
1. Update all documentation with new branding
2. Create deployment guide for automated setup
3. Update API documentation

## Phase 4: Testing Checklist

### Pre-deployment Testing
- [ ] All branding updated correctly
- [ ] No references to old brand names remain
- [ ] Logo and assets display correctly
- [ ] Application builds successfully

### Deployment Automation Testing
- [ ] Admin account created with correct credentials
- [ ] Manager account created with correct credentials
- [ ] Default user account created with correct credentials
- [ ] API keys generated and functional
- [ ] LLM provider configured and responsive
- [ ] Embedding provider configured and functional
- [ ] Documents can be uploaded and processed
- [ ] Chat functionality works with configured LLM
- [ ] Multi-user mode enabled correctly

### Integration Testing
- [ ] Docker deployment works with automation
- [ ] Kubernetes deployment works with automation
- [ ] Cloud deployments (AWS, GCP, Azure) work correctly
- [ ] API endpoints respond correctly
- [ ] Embedded widget functions properly

## Phase 5: Rollout Strategy

### 5.1 Gradual Rollout
1. **Development Environment** - Test all changes thoroughly
2. **Staging Environment** - Deploy with automated configuration
3. **Production Environment** - Final deployment with monitoring

### 5.2 Rollback Plan
1. Keep backup of original codebase
2. Maintain database backups before deployment
3. Document all configuration changes
4. Prepare rollback scripts if needed

## Security Considerations

### 5.1 Credential Management
- Use environment variables for all sensitive data
- Implement secret management for production
- Rotate API keys regularly
- Use strong password policies

### 5.2 Access Control
- Implement proper RBAC (Role-Based Access Control)
- Audit user permissions regularly
- Log all administrative actions
- Monitor for unauthorized access attempts

## Maintenance and Updates

### 6.1 Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Update LLM/embedding models as needed
- Review and update documentation

### 6.2 Monitoring
- Implement health checks
- Monitor API usage
- Track user activity
- Set up alerting for issues

## Additional Considerations

### 7.1 Legal and Compliance
- Update Terms of Service
- Update Privacy Policy
- Ensure GDPR compliance if applicable
- Review and update license if needed

### 7.2 Community and Support
- Update support channels
- Migrate or create new community forums
- Update contact information
- Create migration guide for existing users

## Estimated Timeline

- **Phase 1 (Rebranding)**: 2-3 days
- **Phase 2 (Deployment Automation)**: 3-4 days
- **Phase 3 (Implementation)**: 5-7 days
- **Phase 4 (Testing)**: 2-3 days
- **Phase 5 (Rollout)**: 1-2 days

**Total Estimated Time**: 13-19 days

## Risk Mitigation

1. **Brand Confusion**: Clear communication about rebranding
2. **Deployment Failures**: Thorough testing in staging environment
3. **Security Issues**: Security audit before production deployment
4. **Data Loss**: Comprehensive backup strategy
5. **User Disruption**: Gradual rollout with monitoring

## Success Metrics

- Zero downtime during migration
- All automated deployments succeed on first run
- No security vulnerabilities introduced
- User satisfaction maintained or improved
- Documentation completeness: 100%

## Next Steps

1. Review and approve this plan
2. Set up development environment for testing
3. Begin Phase 1 implementation
4. Schedule regular progress reviews
5. Prepare communication plan for users

---

**Note**: This plan should be reviewed and adjusted based on specific business requirements and technical constraints. Always test thoroughly in a non-production environment before deploying to production.