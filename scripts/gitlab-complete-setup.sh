#!/bin/bash

################################################################################
# Complete GitLab Deployment - All in One Script
# This script performs complete setup and first deployment
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_header() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Ground Station Management - GitLab Deployment          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Collect information
read -p "Enter your GitLab repository URL: " GITLAB_REPO
read -p "Enter your GitLab username: " GITLAB_USER
read -sp "Enter your GitLab Personal Access Token: " GITLAB_TOKEN
echo ""
read -p "Enter RHEL 9 server IP address: " SERVER_IP
read -p "Enter MongoDB password for groundstation user: " MONGO_PASS

echo ""
print_status "Configuration collected. Starting deployment..."
echo "============================================================"

# =============================================================================
# PART 1: Push Code to GitLab
# =============================================================================

print_header "PART 1: Pushing code to GitLab"

cd /app

# Create .gitignore
print_status "Creating .gitignore..."
cat > .gitignore << 'EOF'
__pycache__/
*.py[cod]
venv/
env/
.env
node_modules/
build/
dist/
*.log
.DS_Store
.vscode/
.idea/
EOF

# Initialize git
if [ ! -d ".git" ]; then
    print_status "Initializing git repository..."
    git init
    git config user.name "$GITLAB_USER"
    git config user.email "$GITLAB_USER@gitlab.com"
fi

# Add files
print_status "Adding files to git..."
git add .

# Commit
if ! git diff --cached --quiet; then
    print_status "Creating commit..."
    git commit -m "Initial commit: Ground Station Management System with GitLab CI/CD"
fi

# Add remote with token
print_status "Adding GitLab remote..."
if git remote | grep -q '^origin$'; then
    git remote remove origin
fi

REPO_WITH_TOKEN=$(echo $GITLAB_REPO | sed "s|https://|https://oauth2:${GITLAB_TOKEN}@|")
git remote add origin $REPO_WITH_TOKEN

# Push to GitLab
print_status "Pushing to GitLab..."
git branch -M main
git push -u origin main

print_status "✅ Code pushed to GitLab successfully!"

# =============================================================================
# PART 2: Setup RHEL 9 Server
# =============================================================================

print_header "PART 2: Setting up RHEL 9 server"

print_status "Copying installation script to server..."
scp scripts/rhel9-install.sh root@${SERVER_IP}:/tmp/

print_status "Running installation on server..."
ssh root@${SERVER_IP} "bash /tmp/rhel9-install.sh"

print_status "✅ Server setup complete!"

# =============================================================================
# PART 3: Deploy Application
# =============================================================================

print_header "PART 3: Deploying application"

print_status "Cloning repository on server..."
ssh groundstation@${SERVER_IP} << ENDSSH
cd /opt/ground-station
git clone $REPO_WITH_TOKEN app
cd app
ENDSSH

print_status "Setting up backend..."
ssh groundstation@${SERVER_IP} << ENDSSH
cd /opt/ground-station/app/backend
source /opt/ground-station/venv/bin/activate
pip install -r requirements.txt

cat > .env << EOF
MONGO_URL=mongodb://groundstation:${MONGO_PASS}@localhost:27017/ground_station_db
DB_NAME=ground_station_db
CORS_ORIGINS=*
EOF
ENDSSH

print_status "Setting up frontend..."
ssh groundstation@${SERVER_IP} << ENDSSH
cd /opt/ground-station/app/frontend
yarn install

cat > .env << EOF
REACT_APP_BACKEND_URL=http://${SERVER_IP}
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
EOF

yarn build
ENDSSH

print_status "Starting services..."
ssh root@${SERVER_IP} << 'ENDSSH'
systemctl daemon-reload
systemctl start ground-station-backend
systemctl start ground-station-frontend
sleep 5
systemctl status ground-station-backend --no-pager
systemctl status ground-station-frontend --no-pager
ENDSSH

print_status "✅ Application deployed!"

# =============================================================================
# PART 4: Setup GitLab Runner
# =============================================================================

print_header "PART 4: Setting up GitLab Runner"

print_status "Installing GitLab Runner on server..."
scp scripts/gitlab-setup.sh root@${SERVER_IP}:/tmp/
ssh root@${SERVER_IP} "bash /tmp/gitlab-setup.sh"

echo ""
print_warning "Manual step required:"
print_warning "You need to register the GitLab Runner manually"
echo ""
print_status "Steps:"
echo "1. SSH into your server: ssh root@${SERVER_IP}"
echo "2. Run: sudo gitlab-runner register"
echo "3. Enter these values:"
echo "   - GitLab URL: https://gitlab.com/"
echo "   - Registration token: (Get from GitLab: Settings → CI/CD → Runners)"
echo "   - Description: RHEL9-Ground-Station-Runner"
echo "   - Tags: rhel9,ground-station"
echo "   - Executor: shell"
echo "4. Run: sudo gitlab-runner start"
echo ""

# =============================================================================
# FINAL SUMMARY
# =============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           ✅ DEPLOYMENT COMPLETE!                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
print_status "Your Ground Station Management System is now deployed!"
echo ""
echo "🔗 Application URLs:"
echo "   • Frontend: http://${SERVER_IP}/"
echo "   • Backend API: http://${SERVER_IP}/api/"
echo "   • GitLab: ${GITLAB_REPO}"
echo ""
echo "📝 What's been completed:"
echo "   ✓ Code pushed to GitLab"
echo "   ✓ RHEL 9 server configured"
echo "   ✓ MongoDB installed and secured"
echo "   ✓ Application deployed"
echo "   ✓ Services running"
echo "   ✓ GitLab Runner installed"
echo ""
echo "⚠️  Next steps:"
echo "   1. Register GitLab Runner (see instructions above)"
echo "   2. Configure CI/CD variables in GitLab:"
echo "      Project → Settings → CI/CD → Variables"
echo "      Add: MONGO_PASSWORD = ${MONGO_PASS}"
echo "   3. Push any changes to trigger CI/CD pipeline"
echo ""
echo "📚 Documentation:"
echo "   • GITLAB_DEPLOYMENT_GUIDE.md"
echo "   • RHEL9_DEPLOYMENT_GUIDE.md"
echo "   • README.md"
echo ""
print_status "Happy deploying! 🚀"
echo ""
