#!/bin/bash

################################################################################
# Deploy Ground Station to RHEL 9 Server
# Usage: ./deploy-to-rhel9.sh <rhel9-server-ip>
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Check arguments
if [ $# -eq 0 ]; then
    print_error "Usage: $0 <rhel9-server-ip> [username]"
    print_error "Example: $0 192.168.1.100 groundstation"
    exit 1
fi

RHEL9_SERVER=$1
RHEL9_USER=${2:-groundstation}
APP_DIR="/opt/ground-station/app"
CURRENT_DIR=$(pwd)

print_status "Starting deployment to RHEL 9 server: $RHEL9_SERVER"
echo "============================================================"

# Step 1: Create tarball
print_status "Step 1: Creating application archive..."
cd /app

tar -czf /tmp/ground-station-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='venv' \
    --exclude='build' \
    backend/ \
    frontend/ \
    README.md \
    PROJECT_DOCUMENTATION.md \
    RHEL9_DEPLOYMENT_GUIDE.md \
    RHEL9_QUICK_START.md \
    Jenkinsfile \
    scripts/

print_status "Archive created: $(ls -lh /tmp/ground-station-deploy.tar.gz | awk '{print $5}')"

# Step 2: Copy to RHEL 9 server
print_status "Step 2: Copying files to RHEL 9 server..."
scp /tmp/ground-station-deploy.tar.gz ${RHEL9_USER}@${RHEL9_SERVER}:/tmp/

# Step 3: Extract on RHEL 9 server
print_status "Step 3: Extracting files on RHEL 9 server..."
ssh ${RHEL9_USER}@${RHEL9_SERVER} << 'ENDSSH'
    cd /opt/ground-station
    mkdir -p app
    cd app
    tar -xzf /tmp/ground-station-deploy.tar.gz
    echo "Files extracted successfully"
    ls -la
ENDSSH

# Step 4: Setup backend
print_status "Step 4: Setting up backend..."
ssh ${RHEL9_USER}@${RHEL9_SERVER} << 'ENDSSH'
    cd /opt/ground-station/app/backend
    
    # Activate virtual environment
    source /opt/ground-station/venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    
    # Create .env file
    cat > .env << 'EOF'
MONGO_URL=mongodb://groundstation:ChangeMe123!@localhost:27017/ground_station_db
DB_NAME=ground_station_db
CORS_ORIGINS=*
EOF
    
    echo "Backend setup complete"
ENDSSH

# Step 5: Setup frontend
print_status "Step 5: Setting up frontend..."
ssh ${RHEL9_USER}@${RHEL9_SERVER} << ENDSSH
    cd /opt/ground-station/app/frontend
    
    # Install dependencies
    yarn install
    
    # Create .env file
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://${RHEL9_SERVER}
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
EOF
    
    # Build production bundle
    yarn build
    
    echo "Frontend setup complete"
ENDSSH

# Step 6: Start services
print_status "Step 6: Starting services..."
ssh ${RHEL9_USER}@${RHEL9_SERVER} << 'ENDSSH'
    # Restart services
    sudo systemctl daemon-reload
    sudo systemctl restart ground-station-backend
    sudo systemctl restart ground-station-frontend
    
    # Wait for services to start
    sleep 10
    
    # Check status
    echo "=== Service Status ==="
    sudo systemctl status ground-station-backend --no-pager -l
    sudo systemctl status ground-station-frontend --no-pager -l
ENDSSH

# Step 7: Verify deployment
print_status "Step 7: Verifying deployment..."
sleep 5

# Test backend
if curl -f http://${RHEL9_SERVER}:8001/api/ &> /dev/null; then
    print_status "✅ Backend API is responding"
else
    print_error "❌ Backend API is not responding"
fi

# Test frontend
if curl -f http://${RHEL9_SERVER}:3000/ &> /dev/null; then
    print_status "✅ Frontend is responding"
else
    print_error "❌ Frontend is not responding"
fi

# Cleanup
rm -f /tmp/ground-station-deploy.tar.gz

echo ""
echo "============================================================"
print_status "Deployment Complete!"
echo "============================================================"
echo ""
echo "🎉 Application URLs:"
echo "   Frontend: http://${RHEL9_SERVER}/"
echo "   Backend API: http://${RHEL9_SERVER}/api/"
echo "   API Docs: http://${RHEL9_SERVER}/api/docs"
echo ""
echo "📝 Useful Commands on RHEL 9 Server:"
echo "   View backend logs: sudo journalctl -u ground-station-backend -f"
echo "   View frontend logs: sudo journalctl -u ground-station-frontend -f"
echo "   Restart backend: sudo systemctl restart ground-station-backend"
echo "   Restart frontend: sudo systemctl restart ground-station-frontend"
echo ""
print_status "Deployment script finished successfully!"
