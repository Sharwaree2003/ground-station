#!/bin/bash

################################################################################
# Push Ground Station code to GitLab
# Usage: ./gitlab-push.sh <gitlab-repo-url>
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

if [ $# -eq 0 ]; then
    print_error "Usage: $0 <gitlab-repo-url>"
    print_error "Example: $0 https://gitlab.com/username/ground-station-management.git"
    exit 1
fi

GITLAB_REPO=$1

print_status "Pushing Ground Station code to GitLab..."
echo "Repository: $GITLAB_REPO"
echo "============================================================"

# Step 1: Check if we're in the right directory
if [ ! -f "README.md" ]; then
    print_error "README.md not found. Please run this script from /app directory"
    exit 1
fi

print_status "Step 1: Creating .gitignore..."
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.env
*.log

# Node
node_modules/
build/
dist/
.DS_Store
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
*.bak

# Backups
*.backup
backup/

# Environment
.env
.env.local
.env.production

# Logs
logs/
*.log

# Test
coverage/
.nyc_output
EOF

print_status "Step 2: Initializing git repository..."
if [ ! -d ".git" ]; then
    git init
    print_status "Git repository initialized"
else
    print_warning "Git repository already exists"
fi

print_status "Step 3: Adding files..."
git add .

print_status "Step 4: Creating commit..."
if git diff --cached --quiet; then
    print_warning "No changes to commit"
else
    git commit -m "Initial commit: Ground Station Management System

- Complete backend with FastAPI
- React frontend with Tailwind CSS
- MongoDB integration
- Real-time WebSocket support
- GitLab CI/CD pipeline
- RHEL 9 deployment scripts
- Comprehensive documentation"
    print_status "Commit created"
fi

print_status "Step 5: Adding GitLab remote..."
if git remote | grep -q '^origin$'; then
    print_warning "Remote 'origin' already exists, removing..."
    git remote remove origin
fi

git remote add origin $GITLAB_REPO
print_status "Remote added: $GITLAB_REPO"

print_status "Step 6: Pushing to GitLab..."
echo ""
print_warning "You may be prompted for GitLab credentials"
print_warning "Use your GitLab username and Personal Access Token"
echo ""

git branch -M main
git push -u origin main

echo ""
echo "============================================================"
print_status "Code pushed to GitLab successfully!"
echo "============================================================"
echo ""
print_status "Next Steps:"
echo "1. View your repository on GitLab"
echo "2. Configure CI/CD variables:"
echo "   Project → Settings → CI/CD → Variables"
echo "   Add: MONGO_PASSWORD, NOTIFICATION_EMAIL"
echo ""
echo "3. Ensure GitLab Runner is registered:"
echo "   sudo gitlab-runner status"
echo ""
echo "4. Push changes to trigger pipeline:"
echo "   git add ."
echo "   git commit -m 'Update'"
echo "   git push"
echo ""
print_status "Done!"
