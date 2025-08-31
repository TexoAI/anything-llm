# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Codex is a full-stack application that enables document-based conversations with any LLM. It consists of three main components:
- **Frontend**: Vite + React application for the UI
- **Server**: NodeJS Express server handling LLM interactions, vector DB management, and API endpoints
- **Collector**: NodeJS service for document processing and parsing

## Development Commands

### Initial Setup
```bash
yarn setup          # Install all dependencies and setup env files
yarn prisma:setup   # Generate Prisma client, run migrations, and seed DB
```

### Development
```bash
yarn dev:server     # Start server (port 3001)
yarn dev:frontend   # Start frontend (port 5173) 
yarn dev:collector  # Start document collector (port 8888)
yarn dev:all        # Run all services concurrently
```

### Production Build
```bash
yarn prod:frontend  # Build frontend for production
yarn prod:server    # Start server in production mode
```

### Database Operations
```bash
yarn prisma:generate  # Generate Prisma client
yarn prisma:migrate   # Run database migrations
yarn prisma:seed      # Seed the database
yarn prisma:reset     # Reset database and re-run migrations
```

### Code Quality
```bash
yarn lint           # Lint all workspaces (server, frontend, collector)
yarn test           # Run tests
```

### Docker
```bash
docker pull dimatic/codex
docker-compose up -d  # Run with docker-compose
```

## Architecture

### Key Technologies
- **Frontend**: React, Vite, TailwindCSS, i18n, DOMPurify
- **Backend**: Node.js, Express, Prisma ORM, SQLite
- **Vector DBs**: LanceDB (default), Pinecone, Chroma, Qdrant, Weaviate, Milvus, PGVector, Astra DB
- **LLM Providers**: OpenAI, Anthropic, Ollama, LocalAI, Azure OpenAI, AWS Bedrock, Google Gemini, and 20+ others
- **Authentication**: JWT-based with multi-user support

### Project Structure
```
/frontend         - React UI application
  /src/pages      - Main application pages
  /src/components - Reusable React components
  /src/models     - API client models
  /src/utils      - Utility functions

/server           - Express backend
  /endpoints      - API route handlers
  /models         - Database models (Prisma)
  /utils          - Core utilities
    /AiProviders  - LLM provider integrations
    /agents       - AI agent system
    /vectorDbProviders - Vector database integrations
  /prisma         - Database schema and migrations

/collector        - Document processing service
  /processLink    - URL/link processing
  /processSingleFile - File upload processing
  /utils          - Document parsing utilities
```

### Database Schema
The application uses SQLite with Prisma ORM. Key models include:
- `workspaces`: Chat workspaces/threads
- `workspace_chats`: Chat messages
- `workspace_documents`: Documents in workspaces
- `users`: User accounts (multi-user mode)
- `system_settings`: Global configuration
- `embed_configs`: Embedded chat widget settings

### API Structure
- `/api/v1/*` - Public API endpoints with API key authentication
- `/api/admin/*` - Admin management endpoints
- `/api/workspace/*` - Workspace management
- `/api/system/*` - System configuration
- `/api/embed/*` - Embedded chat widget endpoints

### Environment Variables
Critical environment variables are managed in:
- `server/.env.development` - Server configuration
- `frontend/.env` - Frontend configuration  
- `collector/.env` - Collector configuration
- `docker/.env` - Docker deployment configuration

### Agent System
Codex includes an AI agent system (`/server/utils/agents/`) that supports:
- Web browsing and scraping
- Chart/graph generation
- SQL database queries
- File creation and saving
- RAG memory
- Custom imported plugins

### MCP Compatibility
Full Model Context Protocol (MCP) support for connecting to external tools and services via the MCP hypervisor system.

## Important Patterns

### LLM Provider Integration
All LLM providers follow a consistent interface pattern in `/server/utils/AiProviders/`:
- `getChatCompletion()` - Get chat response
- `streamChat()` - Stream chat response
- `embedTextInput()` - Generate embeddings (if supported)
- `compressMessages()` - Handle context window management

### Vector Database Integration
Vector databases implement a common interface in `/server/utils/vectorDbProviders/`:
- `connect()` - Establish connection
- `addDocumentToNamespace()` - Add document vectors
- `similarityResponse()` - Query similar documents
- `deleteDocumentFromNamespace()` - Remove documents

### Workspace Context
Workspaces are the core organizational unit - they contain documents, settings, and chat history isolated from other workspaces.

### Document Processing Flow
1. Documents uploaded/linked via collector
2. Collector chunks and processes text
3. Server generates embeddings
4. Vectors stored in configured vector database
5. Retrieved during chat for context

## Testing Approach
- Jest for unit tests
- Test files located in `__tests__` directories
- Run specific tests: `cd server && npx jest path/to/test`