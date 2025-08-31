#!/bin/bash

# Check if STORAGE_DIR is set
if [ -z "$STORAGE_DIR" ]; then
    echo "================================================================"
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo ""
    echo "Not setting this will result in data loss on container restart since"
    echo "the application will not have a persistent storage location."
    echo "It can also result in weird errors in various parts of the application."
    echo ""
    echo "Please run the container with the official docker command at"
    echo "https://docs.codex.dimatic.com.au/installation-docker/quickstart"
    echo ""
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo "================================================================"
fi

# Function to check if database is ready
wait_for_database() {
    echo "🔄 Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        cd /app/server/
        if npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma >/dev/null 2>&1; then
            echo "✅ Database is ready!"
            return 0
        fi
        
        echo "⏳ Database not ready yet (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Database failed to become ready after $max_attempts attempts"
    return 1
}

# Auto-deployment configuration
if [ "$DEPLOY_MODE" = "auto" ]; then
    echo "================================================================"
    echo "🚀 CODEX AUTO-DEPLOYMENT MODE DETECTED"
    echo "================================================================"
    echo "Running automatic deployment configuration..."
    echo ""
    
    # Wait for database to be ready
    if ! wait_for_database; then
        echo "❌ Auto-deployment failed: Database not ready"
        exit 1
    fi
    
    cd /app/server/
    
    # Generate Prisma client and run migrations
    echo "🔧 Setting up database..."
    npx prisma generate --schema=./prisma/schema.prisma
    npx prisma migrate deploy --schema=./prisma/schema.prisma
    
    # Run initial deployment script
    echo "🎯 Running initial deployment configuration..."
    if node /app/server/utils/setup/initial-deployment.js; then
        echo ""
        echo "================================================================"
        echo "🎉 CODEX AUTO-DEPLOYMENT COMPLETED SUCCESSFULLY!"
        echo "================================================================"
        echo "System Information:"
        echo "  • Application: Codex by Dimatic"
        echo "  • Admin User: ${ADMIN_USERNAME:-admin}"
        echo "  • Manager User: ${MANAGER_USERNAME:-manager}"
        echo "  • Default User: ${DEFAULT_USERNAME:-default}"
        echo "  • LLM Provider: ${DEFAULT_LLM_PROVIDER:-Not configured}"
        echo "  • Embedding Engine: ${DEFAULT_EMBEDDING_ENGINE:-Not configured}"
        echo "  • Multi-user Mode: ${DEFAULT_MULTI_USER_MODE:-true}"
        echo "================================================================"
        echo ""
    else
        echo ""
        echo "================================================================"
        echo "❌ CODEX AUTO-DEPLOYMENT FAILED"
        echo "================================================================"
        echo "Please check the logs above for specific error details."
        echo "You may need to configure the system manually."
        echo "================================================================"
        echo ""
        # Continue with normal startup even if auto-deployment fails
    fi
else
    echo "🔧 Standard deployment mode - setting up database..."
    cd /app/server/
    npx prisma generate --schema=./prisma/schema.prisma
    npx prisma migrate deploy --schema=./prisma/schema.prisma
fi

# Start the application services
echo "🚀 Starting Codex services..."
{
  cd /app/server/ &&
    node /app/server/index.js
} &
{ 
  cd /app/collector/ &&
    node /app/collector/index.js; 
} &

# Wait for any service to exit
wait -n
exit_code=$?

echo "🛑 Service exited with code $exit_code"
exit $exit_code