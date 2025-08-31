# Codex Dokploy Deployment Guide

This guide provides instructions for deploying Codex using Dokploy with 1-click deployment on port 3030.

**Note**: This configuration runs Codex on internal port 3030 (instead of default 3001) to avoid port conflicts.

## Prerequisites

- Dokploy installed and running on your server
- Docker and Docker Compose installed
- At least 4GB RAM and 10GB storage available
- Port 3030 available on your server

## Quick Start (1-Click Deployment)

### Step 1: Prepare the Environment

1. Clone or upload this repository to your Dokploy server
2. Navigate to the project directory
3. Create the data directory structure:

```bash
mkdir -p data/storage data/hotdir data/outputs data/lancedb
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.dokploy data/.env
```

2. **IMPORTANT**: Edit `data/.env` and generate secure random strings for:
   - `JWT_SECRET` (32+ characters)
   - `SIG_KEY` (32+ characters)
   - `SIG_SALT` (32+ characters)

Generate secure strings using:
```bash
openssl rand -hex 32
```

3. Configure your preferred LLM provider in `data/.env` (default is Ollama)

### Step 3: Deploy with Dokploy

#### Option A: Through Dokploy UI

1. Open Dokploy dashboard
2. Click "Create New Application"
3. Select "Docker Compose"
4. Upload or paste the `dokploy-compose.yml` file
5. Set the application name to "codex"
6. Click "Deploy"
7. Access Codex at `http://your-server:3030`

#### Option B: Using Dokploy CLI

```bash
# Deploy the application
dokploy deploy --compose dokploy-compose.yml --name codex

# Check deployment status
dokploy status codex
```

## Configuration Options

### LLM Providers

The default configuration uses Ollama for local LLM inference. To use other providers:

1. **OpenAI**: 
   - Set `LLM_PROVIDER=openai`
   - Add your `OPEN_AI_KEY`
   - Choose model with `OPEN_MODEL_PREF`

2. **Anthropic Claude**:
   - Set `LLM_PROVIDER=anthropic`
   - Add your `ANTHROPIC_API_KEY`
   - Choose model with `ANTHROPIC_MODEL_PREF`

3. **Google Gemini**:
   - Set `LLM_PROVIDER=gemini`
   - Add your `GEMINI_API_KEY`
   - Choose model with `GEMINI_LLM_MODEL_PREF`

### Running with Local Ollama

To run Ollama alongside Codex:

1. Uncomment the Ollama service in `dokploy-compose.yml`
2. Deploy both services together
3. Pull your preferred models:

```bash
docker exec -it codex-ollama ollama pull llama3.2
docker exec -it codex-ollama ollama pull nomic-embed-text
```

### Vector Database Options

Default is LanceDB (local, no configuration needed). For other options:

- **Pinecone**: Cloud-based, requires API key
- **Qdrant**: Self-hosted or cloud
- **ChromaDB**: Self-hosted
- **PostgreSQL + pgvector**: Requires PostgreSQL with pgvector extension

Configure in `data/.env` by setting `VECTOR_DB` and related variables.

## Data Persistence

All data is persisted in the `./data` directory:

- `data/storage/` - SQLite database and application data
- `data/hotdir/` - Document upload directory
- `data/outputs/` - Processed documents
- `data/lancedb/` - Vector database storage
- `data/.env` - Environment configuration

**Important**: Back up the `data` directory regularly to prevent data loss.

## Security Considerations

1. **Generate Strong Keys**: Always use cryptographically secure random strings for:
   - JWT_SECRET
   - SIG_KEY
   - SIG_SALT

2. **Set AUTH_TOKEN**: For production, set an `AUTH_TOKEN` to password-protect your instance:
   ```bash
   AUTH_TOKEN="your-secure-password"
   ```

3. **Use HTTPS**: Configure a reverse proxy (nginx/Caddy) with SSL certificates

4. **Firewall Rules**: Restrict access to port 3030 to trusted IPs only

5. **Regular Updates**: Keep the Docker image updated:
   ```bash
   docker pull dimatic/codex:latest
   dokploy redeploy codex
   ```

## Monitoring & Maintenance

### Health Checks

The application includes automatic health checks. Monitor status:

```bash
# Check container health
docker inspect codex-app --format='{{.State.Health.Status}}'

# View logs
docker logs -f codex-app

# Check resource usage
docker stats codex-app
```

### Backup & Restore

#### Backup
```bash
# Stop the container
docker stop codex-app

# Backup data directory
tar -czf codex-backup-$(date +%Y%m%d).tar.gz data/

# Restart container
docker start codex-app
```

#### Restore
```bash
# Stop the container
docker stop codex-app

# Restore from backup
tar -xzf codex-backup-20240118.tar.gz

# Restart container
docker start codex-app
```

## Troubleshooting

### Container won't start
- Check logs: `docker logs codex-app`
- Verify port 3030 is available: `netstat -tulpn | grep 3030`
- Ensure data directory permissions: `chown -R 1000:1000 data/`

### Can't connect to Ollama
- Verify Ollama is running: `docker ps | grep ollama`
- Check network connectivity: `docker exec codex-app curl http://host.docker.internal:11434`
- Ensure Ollama has models: `docker exec codex-ollama ollama list`

### Database errors
- Check file permissions: `ls -la data/storage/`
- Verify disk space: `df -h`
- Review migration logs: `docker logs codex-app | grep prisma`

### Memory issues
- Increase memory limits in `dokploy-compose.yml`
- Monitor usage: `docker stats codex-app`
- Consider using smaller embedding models

## Support

- Documentation: https://docs.codex.com
- GitHub Issues: https://github.com/Dimatic-Labs/codex/issues
- Discord Community: https://discord.gg/codex

## Version Information

- Codex Version: 1.8.5
- External Port: 3030
- Internal Port: 3030 (modified from default 3001)
- Requires: Docker 20.10+, Docker Compose 2.0+