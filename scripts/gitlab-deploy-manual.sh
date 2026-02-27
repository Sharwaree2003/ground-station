#!/bin/bash

################################################################################
# Manual Deployment Script (Without GitLab CI/CD)
# Use this if you want to deploy without running full pipeline
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

APP_DIR="/opt/ground-station/app"
VENV_DIR="/opt/ground-station/venv"
BACKUP_DIR="/backup/ground-station"

print_status "Starting manual deployment..."
echo "============================================================"

# Step 1: Create backup
print_status "Step 1: Creating backup..."
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf $BACKUP_DIR/backup_${TIMESTAMP}.tar.gz \
    $APP_DIR/backend \
    $APP_DIR/frontend 2>/dev/null || true
print_status "Backup created: backup_${TIMESTAMP}.tar.gz"

# Step 2: Pull latest code
print_status "Step 2: Pulling latest code from GitLab..."
cd $APP_DIR
sudo -u groundstation git pull origin main

# Step 3: Deploy backend
print_status "Step 3: Deploying backend..."
print_status "Stopping backend service..."
sudo systemctl stop ground-station-backend

cd $APP_DIR/backend
print_status "Installing Python dependencies..."
source $VENV_DIR/bin/activate
pip install -r requirements.txt

print_status "Starting backend service..."
sudo systemctl start ground-station-backend
sleep 5

if sudo systemctl is-active --quiet ground-station-backend; then
    print_status "✅ Backend deployed successfully"
else
    print_error "❌ Backend failed to start"
    print_status "Rolling back..."
    tar -xzf $BACKUP_DIR/backup_${TIMESTAMP}.tar.gz -C /
    sudo systemctl start ground-station-backend
    exit 1
fi

# Step 4: Deploy frontend
print_status "Step 4: Deploying frontend..."
print_status "Stopping frontend service..."
sudo systemctl stop ground-station-frontend

cd $APP_DIR/frontend
print_status "Installing dependencies and building..."
yarn install
yarn build

print_status "Starting frontend service..."
sudo systemctl start ground-station-frontend
sleep 5

if sudo systemctl is-active --quiet ground-station-frontend; then
    print_status "✅ Frontend deployed successfully"
else
    print_error "❌ Frontend failed to start"
    print_status "Rolling back..."
    tar -xzf $BACKUP_DIR/backup_${TIMESTAMP}.tar.gz -C /
    sudo systemctl start ground-station-frontend
    exit 1
fi

# Step 5: Health check
print_status "Step 5: Performing health check..."
sleep 5

if curl -f http://localhost:8001/api/ &> /dev/null; then
    print_status "✅ Backend API is responding"
else
    print_error "❌ Backend API health check failed"
fi

if curl -f http://localhost:3000/ &> /dev/null; then
    print_status "✅ Frontend is responding"
else
    print_error "❌ Frontend health check failed"
fi

# Step 6: Show status
print_status "Step 6: Service status..."
echo ""
echo "Backend:"
sudo systemctl status ground-station-backend --no-pager -l | head -5
echo ""
echo "Frontend:"
sudo systemctl status ground-station-frontend --no-pager -l | head -5

echo ""
echo "============================================================"
print_status "Manual deployment complete!"
echo "============================================================"
echo ""
echo "Application URLs:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}')/ "
echo "  Backend API: http://$(hostname -I | awk '{print $1}')/api/"
echo ""
echo "View logs:"
echo "  Backend: sudo journalctl -u ground-station-backend -f"
echo "  Frontend: sudo journalctl -u ground-station-frontend -f"
echo ""
