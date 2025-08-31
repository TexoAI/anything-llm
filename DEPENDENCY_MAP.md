# Codex Dependency Map & Architectural Overview

## Executive Summary
This document provides a comprehensive dependency analysis and architectural overview of Codex to prevent unintended issues during code changes. The application consists of three main components (Frontend, Server, Collector) with complex interdependencies and multiple external service integrations.

## 1. Package Dependency Analysis

### 1.1 Root Package Dependencies
- **concurrently** (^9.1.2) - Manages multi-process development
- **jest** (^29.7.0) - Testing framework
- **Node.js** (>=18) - Runtime requirement

### 1.2 Server Dependencies (server/package.json)

#### Critical Production Dependencies
| Package | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| @prisma/client | 5.3.1 | ORM for database | **CRITICAL** - All data operations |
| express | ^4.18.2 | Web framework | **CRITICAL** - Core server |
| jsonwebtoken | ^9.0.0 | Authentication | **HIGH** - Security sensitive |
| bcrypt | ^5.1.0 | Password hashing | **HIGH** - Security sensitive |
| openai | 4.95.1 | OpenAI integration | **MEDIUM** - Provider specific |
| langchain | 0.1.36 | LLM orchestration | **HIGH** - Core functionality |

#### LLM Provider Dependencies (25+ providers)
- @anthropic-ai/sdk (^0.39.0)
- @aws-sdk/client-bedrock-runtime (^3.775.0)
- cohere-ai (^7.9.5)
- ollama (^0.5.10)
- Multiple other provider-specific SDKs

#### Vector Database Dependencies (10+ providers)
- @lancedb/lancedb (0.15.0) - Default vector DB
- @pinecone-database/pinecone (^2.0.1)
- @qdrant/js-client-rest (^1.9.0)
- chromadb (^2.0.1)
- weaviate-ts-client (^1.4.0)
- @zilliz/milvus2-sdk-node (^2.3.5)

#### Potential Version Conflicts
- **langchain** (0.1.36) with **@langchain/community** (0.0.53) - Version mismatch
- Multiple AWS SDK versions may conflict
- **openai** package locked at specific version (4.95.1)

### 1.3 Frontend Dependencies (frontend/package.json)

#### Critical UI Dependencies
| Package | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| react | ^18.2.0 | UI framework | **CRITICAL** |
| react-router-dom | ^6.3.0 | Routing | **HIGH** |
| vite | ^4.3.0 | Build tool | **HIGH** - Build process |
| tailwindcss | ^3.3.1 | Styling | **MEDIUM** |
| i18next | ^23.11.3 | Internationalization | **MEDIUM** |
| dompurify | ^3.0.8 | XSS protection | **HIGH** - Security |

#### Deprecated/Outdated Packages
- **react-beautiful-dnd** (13.1.1) - No longer maintained, consider alternatives
- **katex** (^0.6.0) - Very outdated (current: 0.16.x)

### 1.4 Collector Dependencies (collector/package.json)

#### Document Processing Dependencies
| Package | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| puppeteer | ~21.5.2 | Web scraping | **HIGH** - Resource intensive |
| pdf-parse | ^1.1.1 | PDF processing | **MEDIUM** |
| tesseract.js | ^6.0.0 | OCR processing | **HIGH** - CPU intensive |
| sharp | ^0.33.5 | Image processing | **MEDIUM** |
| youtubei.js | ^9.1.0 | YouTube content | **LOW** - External API |

## 2. Internal Code Dependencies

### 2.1 Module Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ src/models/* (API Clients)                  │    │
│  │   ├── workspace.js                          │    │
│  │   ├── system.js                             │    │
│  │   └── admin.js                              │    │
│  └──────────────┬──────────────────────────────┘    │
└─────────────────┼────────────────────────────────────┘
                  ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────┐
│                     Server                           │
│  ┌─────────────────────────────────────────────┐    │
│  │ endpoints/* (API Routes)                    │    │
│  │   ├── workspace.js ←──────┐                 │    │
│  │   ├── chat.js ←───────────┤                 │    │
│  │   └── system.js ←─────────┤                 │    │
│  └──────────────────────────┬┘                 │    │
│                             ↓                   │    │
│  ┌─────────────────────────────────────────────┐    │
│  │ utils/chats/* (Chat Logic)                  │    │
│  │   ├── stream.js (Main chat flow)            │    │
│  │   ├── agents.js (Agent system)              │    │
│  │   └── embed.js (Embedded chat)              │    │
│  └──────────┬──────────────────────────────────┘    │
│             ↓                                        │
│  ┌─────────────────────────────────────────────┐    │
│  │ utils/AiProviders/* (LLM Providers)         │    │
│  │ utils/vectorDbProviders/* (Vector DBs)      │    │
│  │ utils/agents/* (Agent System)               │    │
│  └──────────┬──────────────────────────────────┘    │
│             ↓                                        │
│  ┌─────────────────────────────────────────────┐    │
│  │ models/* (Prisma Models)                    │    │
│  │   Database Operations                       │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────┼────────────────────────────────────┘
                  ↓ HTTP API
┌─────────────────────────────────────────────────────┐
│                   Collector                          │
│  Document Processing & Chunking                      │
└───────────────────────────────────────────────────────┘
```

### 2.2 Circular Dependencies Identified

1. **Models ↔ Utils Circular Reference**
   - Location: server/models/* ↔ server/utils/*
   - Impact: Initialization order issues
   - Files: Multiple model files require utils, utils require models

2. **Chat System Internal Coupling**
   - Location: server/utils/chats/*
   - stream.js → agents.js → stream.js (indirect)
   - Risk: Modification propagation

### 2.3 Shared Utilities and Cross-Component Usage

#### High-Use Utilities (server/utils/)
- **helpers/index.js** - Used by 50+ files
  - `getLLMProvider()` - Critical for all chat operations
  - `getVectorDbClass()` - Critical for all RAG operations
  - `userFromSession()` - Authentication throughout
  
- **logger/index.js** - Used by 30+ files
  - Centralized logging, modification affects all logging

- **middleware/validatedRequest.js** - All API endpoints
  - Authentication and validation gateway

## 3. Critical Integration Points

### 3.1 External Service Dependencies

#### Required External Services
1. **Database** (SQLite/PostgreSQL)
   - Connection: server/prisma/index.js
   - Schema: server/prisma/schema.prisma
   - Critical for ALL operations

2. **LLM Providers** (25+ options)
   - Configuration: Environment variables (LLM_PROVIDER, API keys)
   - Integration: server/utils/AiProviders/*
   - Fallback: None - service fails if misconfigured

3. **Vector Databases** (10+ options)
   - Configuration: Environment variables (VECTOR_DB, connection strings)
   - Integration: server/utils/vectorDbProviders/*
   - Default: LanceDB (local, no external dependency)

4. **Document Collector Service**
   - Internal service at port 8888
   - API: server/utils/collectorApi/index.js
   - Critical for: Document upload/processing

#### Optional External Services
- Agent search engines (Google, Bing, Serper, etc.)
- TTS/STT providers (OpenAI, ElevenLabs)
- Authentication services (SSO passthrough)

### 3.2 Configuration Dependencies

#### Critical Configuration Files
- **server/.env.development** - All server configuration
- **docker/.env** - Docker deployment
- **server/storage/codex.db** - SQLite database

#### Environment Variable Groups
1. **Security Critical**
   - JWT_SECRET - Authentication
   - SIG_KEY/SIG_SALT - Encryption
   - AUTH_TOKEN - Remote access

2. **Service Configuration**
   - LLM_PROVIDER + provider-specific keys
   - VECTOR_DB + connection strings
   - EMBEDDING_ENGINE + API keys

## 4. Risk Assessment

### 4.1 High-Risk Components (Modification Danger)

#### CRITICAL - System Failure Risk
1. **server/index.js** - Server initialization
   - 100% of server functionality depends on this
   - Modification risk: Total system failure

2. **server/utils/helpers/index.js**
   - Provider factory functions
   - Used by ALL chat and vector operations
   - Modification risk: All AI features break

3. **server/prisma/schema.prisma**
   - Database schema
   - Migration required for changes
   - Modification risk: Data loss/corruption

#### HIGH - Feature Failure Risk
1. **server/utils/chats/stream.js**
   - Main chat orchestration (line 20-500)
   - Complex state management
   - Modification risk: Chat functionality breaks

2. **server/models/workspace.js**
   - Central workspace management
   - 20+ methods, complex queries
   - Modification risk: Workspace operations fail

3. **frontend/src/utils/chat/**
   - Chat UI state management
   - WebSocket and streaming logic
   - Modification risk: UI chat breaks

### 4.2 Components with High Fan-In

These components have many dependents - changes affect multiple areas:

1. **server/models/workspace.js** - 30+ files depend on this
2. **server/models/user.js** - 25+ files depend on this
3. **server/utils/middleware/validatedRequest.js** - All endpoints
4. **server/utils/logger/index.js** - Universal logging
5. **frontend/src/utils/request.js** - All API calls

### 4.3 Single Points of Failure

1. **Database Connection** (server/prisma/index.js)
   - No fallback mechanism
   - Failure = Complete system failure

2. **Express Server** (server/index.js)
   - Single process (unless clustered)
   - Failure = API unavailable

3. **Collector Service** (collector/index.js)
   - Document processing bottleneck
   - Failure = No document uploads

### 4.4 Brittle/Fragile Areas

1. **Agent System** (server/utils/agents/*)
   - Complex WebSocket state management
   - MCP integration experimental
   - Plugin system error-prone

2. **Streaming Chat** (server/utils/chats/stream.js)
   - Complex async flow
   - Error handling gaps
   - Memory leak potential with long sessions

3. **Vector Search** (server/utils/vectorDbProviders/*)
   - Provider-specific implementations
   - Inconsistent error handling
   - Migration between providers risky

## 5. Change Impact Analysis

### 5.1 Workspace Component Changes

**File**: server/models/workspace.js
**Impact of Changes**:
- ✅ Safe: Adding new methods
- ⚠️ Risky: Modifying existing methods
- ❌ Dangerous: Changing database queries

**Affected Components**:
- server/endpoints/workspace.js - All workspace endpoints
- server/utils/chats/* - Chat operations
- server/models/workspaceChats.js - Chat history
- frontend/src/models/workspace.js - UI operations
- 20+ other files

### 5.2 Authentication System Changes

**Files**: server/utils/middleware/validatedRequest.js, server/models/user.js
**Impact of Changes**:
- ❌ ANY change affects ALL authenticated endpoints
- ❌ JWT changes break existing sessions

**Affected Components**:
- Every API endpoint (50+ files)
- Frontend auth flow
- Mobile app connections
- API key validation

### 5.3 Chat System Changes

**File**: server/utils/chats/stream.js
**Impact of Changes**:
- Lines 20-100: Initialization - CRITICAL
- Lines 200-400: Message handling - HIGH RISK
- Lines 500+: Response formatting - MEDIUM RISK

**Affected Components**:
- All chat endpoints
- Agent system
- Embed widget
- WebSocket connections

### 5.4 LLM Provider Changes

**Files**: server/utils/AiProviders/*
**Impact of Changes**:
- ✅ Safe: Adding new providers
- ⚠️ Risky: Modifying provider interfaces
- ❌ Dangerous: Changing base classes

**Affected Components**:
- Chat functionality
- Embedding generation
- Agent capabilities
- Token counting

## 6. Test Coverage Gaps

### 6.1 Current Test Coverage
- **Total test files**: 8 (minimal coverage)
- **Tested areas**:
  - YouTube transcript parsing
  - JSON stringify safety
  - OpenAI helpers
  - Text splitting
  - SQL connection parsing

### 6.2 Critical Untested Areas
1. **Authentication flow** - No tests
2. **Workspace operations** - No tests
3. **Chat streaming** - No tests
4. **Vector operations** - No tests
5. **Agent system** - Minimal tests
6. **API endpoints** - No integration tests
7. **Frontend components** - No tests

### 6.3 Testing Recommendations Priority
1. **URGENT**: Authentication and authorization
2. **HIGH**: Core chat flow
3. **HIGH**: Workspace CRUD operations
4. **MEDIUM**: Provider integrations
5. **MEDIUM**: Document processing

## 7. Recommendations

### 7.1 Immediate Actions (Security & Stability)

1. **Update Critical Dependencies**
   ```bash
   # Security updates needed
   - katex: 0.6.0 → 0.16.x (frontend)
   - Check all dependencies with: npm audit
   ```

2. **Add Error Boundaries**
   - Location: server/utils/chats/stream.js
   - Wrap streaming operations in try-catch
   - Add circuit breakers for external services

3. **Implement Connection Pooling**
   - Database connections (Prisma)
   - Vector DB connections
   - Prevent connection exhaustion

### 7.2 Refactoring Recommendations

#### Break Circular Dependencies
1. **Models ↔ Utils**
   - Create interface layer between models and utils
   - Use dependency injection pattern
   - Location: server/models/*, server/utils/*

2. **Extract Chat Orchestration**
   - Current: Monolithic stream.js (500+ lines)
   - Proposed: Separate concerns into modules
   - Benefits: Easier testing, maintenance

#### Decouple High-Risk Components
1. **Provider Abstraction Layer**
   ```javascript
   // Create provider interface
   // server/utils/providers/interface.js
   class ProviderInterface {
     async chat() { throw new Error('Not implemented') }
     async embed() { throw new Error('Not implemented') }
   }
   ```

2. **Workspace Service Layer**
   - Extract business logic from models
   - Create service classes
   - Improve testability

### 7.3 Architecture Improvements

#### Implement Repository Pattern
```javascript
// server/repositories/workspace.repository.js
class WorkspaceRepository {
  async findById(id) { /* Prisma logic */ }
  async create(data) { /* Prisma logic */ }
  // Centralize data access
}
```

#### Add Caching Layer
- Redis/Memory cache for:
  - User sessions
  - Workspace metadata
  - Vector search results
- Reduce database load

#### Implement Event-Driven Architecture
- Decouple components with events
- Use EventEmitter or message queue
- Benefits: Loose coupling, scalability

### 7.4 Testing Strategy

#### Phase 1: Critical Path Testing
```javascript
// server/__tests__/auth/authentication.test.js
// Test JWT validation, user authentication
```

#### Phase 2: Integration Testing
```javascript
// server/__tests__/integration/chat-flow.test.js
// Test complete chat flow with mocked providers
```

#### Phase 3: E2E Testing
- Playwright/Cypress for frontend
- Test critical user journeys

### 7.5 Dependency Update Strategy

#### Safe Update Path
1. **Development Environment First**
   ```bash
   # Create update branch
   git checkout -b dependency-updates
   
   # Update non-critical first
   npm update [package] --save
   
   # Test thoroughly
   npm test
   npm run dev:all
   ```

2. **Staged Rollout**
   - Update dev dependencies first
   - Update utility packages
   - Update framework packages last
   - Critical packages individually

3. **Rollback Plan**
   - Keep package-lock.json backups
   - Document working versions
   - Test in isolated environment

### 7.6 Monitoring Recommendations

1. **Add Health Checks**
   ```javascript
   // server/endpoints/health.js
   app.get('/health', (req, res) => {
     // Check database connection
     // Check vector DB connection
     // Check collector service
   });
   ```

2. **Implement Logging Strategy**
   - Structured logging (JSON)
   - Log aggregation service
   - Error tracking (Sentry/Rollbar)

3. **Performance Monitoring**
   - APM tool integration
   - Database query monitoring
   - API response time tracking

## 8. Quick Reference - Before Making Changes

### 8.1 Pre-Change Checklist
- [ ] Check this document for component impact
- [ ] Review affected files list
- [ ] Run existing tests
- [ ] Check for circular dependencies
- [ ] Review environment variables needed
- [ ] Backup database if schema changes

### 8.2 High-Risk File Modifications
**DO NOT MODIFY** without extensive testing:
- server/index.js
- server/utils/helpers/index.js
- server/prisma/schema.prisma
- server/utils/middleware/validatedRequest.js

**CAREFUL MODIFICATION** required:
- server/utils/chats/stream.js
- server/models/workspace.js
- server/models/user.js
- Any provider base classes

### 8.3 Safe Modification Areas
- Adding new API endpoints (follow existing patterns)
- Adding new LLM providers (implement interface)
- Adding new vector DB providers (implement interface)
- Frontend UI components (isolated changes)
- Documentation updates

## 9. Appendix - Detailed Dependency Lists

### 9.1 Complete NPM Dependencies
[Full dependency tree available via `npm list --all`]

### 9.2 Environment Variables Reference
See server/.env.example for complete list

### 9.3 Database Schema Reference
See server/prisma/schema.prisma for complete schema

---

**Document Version**: 1.0.0
**Last Updated**: 2025-08-18
**Codex Version**: 1.8.5

**Note**: This document should be updated whenever major architectural changes are made to the codebase.