# Complete GitLab Deployment Guide
## Ground Station Management System

---

## 📋 Table of Contents

1. [GitLab Setup](#gitlab-setup)
2. [Push Code to GitLab](#push-code-to-gitlab)
3. [GitLab Runner Installation](#gitlab-runner-installation)
4. [GitLab CI/CD Pipeline](#gitlab-cicd-pipeline)
5. [Environment Variables](#environment-variables)
6. [Deployment Process](#deployment-process)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## 🚀 GitLab Setup

### Step 1: Create GitLab Account and Repository

```bash
# Option A: Use GitLab.com (Cloud)
# 1. Go to https://gitlab.com
# 2. Sign up for free account
# 3. Create new project

# Option B: Self-hosted GitLab
# Follow GitLab installation guide for RHEL 9
# https://about.gitlab.com/install/
```

### Step 2: Create New Project on GitLab

```
1. Click "New Project"
2. Choose "Create blank project"
3. Project name: ground-station-management
4. Visibility: Private (recommended)
5. Initialize repository with a README: No
6. Click "Create project"
```

---

## 📤 Push Code to GitLab

### Method 1: Push from Current Working Server

```bash
# On your current server where code is working
cd /app

# Initialize git if not already done
git init

# Create .gitignore
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
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# IDE
.vscode/
.idea/
*.swp
*.swo
*.sublime-workspace
*.sublime-project

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
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
EOF

# Add all files
git add .

# Commit
git commit -m "Initial commit: Ground Station Management System"

# Add GitLab remote
# Replace with your actual GitLab repository URL
git remote add origin https://gitlab.com/your-username/ground-station-management.git

# Or if using SSH
# git remote add origin git@gitlab.com:your-username/ground-station-management.git

# Push to GitLab
git branch -M main
git push -u origin main

# If prompted for username/password, use:
# Username: your-gitlab-username
# Password: your-gitlab-personal-access-token (not your login password)
```

### Method 2: Create GitLab Personal Access Token

```bash
# To create a Personal Access Token:
# 1. Go to GitLab → Settings → Access Tokens
# 2. Token name: "Deployment Token"
# 3. Expiration date: (set as needed)
# 4. Select scopes:
#    ✓ api
#    ✓ read_repository
#    ✓ write_repository
# 5. Click "Create personal access token"
# 6. Copy the token (you won't see it again!)

# Use token for authentication
git remote set-url origin https://oauth2:YOUR_TOKEN@gitlab.com/your-username/ground-station-management.git
git push -u origin main
```

---

## 🏃 GitLab Runner Installation on RHEL 9

### Step 1: Install GitLab Runner

```bash
# On your RHEL 9 server

# Add GitLab Runner repository
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh" | sudo bash

# Install GitLab Runner
sudo dnf install gitlab-runner -y

# Verify installation
gitlab-runner --version
```

### Step 2: Register GitLab Runner

```bash
# Get registration token from GitLab:
# GitLab Project → Settings → CI/CD → Runners → Expand

# Register runner
sudo gitlab-runner register

# You'll be prompted for:
# 1. GitLab instance URL: https://gitlab.com/ (or your self-hosted URL)
# 2. Registration token: (paste from GitLab)
# 3. Description: RHEL9-Ground-Station-Runner
# 4. Tags: rhel9,ground-station,deployment
# 5. Executor: shell

# Verify runner registration
sudo gitlab-runner verify

# Start runner
sudo gitlab-runner start

# Check status
sudo gitlab-runner status
```

### Step 3: Configure Runner Permissions

```bash
# Add gitlab-runner user to necessary groups
sudo usermod -aG wheel gitlab-runner
sudo usermod -aG groundstation gitlab-runner

# Configure sudo permissions for gitlab-runner
sudo visudo

# Add these lines:
gitlab-runner ALL=(groundstation) NOPASSWD: ALL
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl restart ground-station-backend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl restart ground-station-frontend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl stop ground-station-backend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl stop ground-station-frontend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl start ground-station-backend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl start ground-station-frontend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl status ground-station-backend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl status ground-station-frontend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl daemon-reload
```

---

## 🔄 GitLab CI/CD Pipeline

### CI/CD Variables Setup

```bash
# In GitLab, go to:
# Project → Settings → CI/CD → Variables

# Add these variables:
DEPLOY_USER = groundstation
APP_DIR = /opt/ground-station/app
VENV_DIR = /opt/ground-station/venv
MONGO_PASSWORD = ChangeMe123!
NOTIFICATION_EMAIL = your-email@domain.com
```

---

## 📝 Project Structure for GitLab

Your repository should have this structure:

```
ground-station-management/
├── .gitlab-ci.yml              # CI/CD pipeline configuration
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
├── scripts/
│   ├── deploy-backend.sh
│   ├── deploy-frontend.sh
│   ├── health-check.sh
│   └── rollback.sh
├── tests/
│   ├── test_backend.py
│   └── test_frontend.js
├── README.md
├── RHEL9_DEPLOYMENT_GUIDE.md
└── PROJECT_DOCUMENTATION.md
```

---

## 🔐 Security Best Practices

1. **Never commit sensitive data**:
   - Use `.env.example` files as templates
   - Store actual credentials in GitLab CI/CD Variables

2. **Protected branches**:
   - Settings → Repository → Protected Branches
   - Protect `main` branch
   - Require approvals before merge

3. **Deploy keys**:
   - Settings → Repository → Deploy Keys
   - Add SSH key for deployments

---

## 📊 Monitoring Deployments

### View Pipeline Status

```
GitLab Project → CI/CD → Pipelines
```

### View Job Logs

```
Click on pipeline → Click on job → View logs
```

### Pipeline Badges

```markdown
# Add to README.md
[![pipeline status](https://gitlab.com/your-username/ground-station-management/badges/main/pipeline.svg)](https://gitlab.com/your-username/ground-station-management/-/commits/main)
```

---

## 🔧 Manual Deployment Commands

If you need to deploy manually without CI/CD:

```bash
# On RHEL 9 server
cd /opt/ground-station/app

# Pull latest code
sudo -u groundstation git pull origin main

# Deploy backend
cd backend
source /opt/ground-station/venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ground-station-backend

# Deploy frontend
cd ../frontend
yarn install
yarn build
sudo systemctl restart ground-station-frontend

# Check status
sudo systemctl status ground-station-backend
sudo systemctl status ground-station-frontend
```

---

## 📧 Notifications Setup

### Email Notifications

```yaml
# In .gitlab-ci.yml, add email notifications
after_script:
  - |
    if [ "$CI_JOB_STATUS" == "success" ]; then
      echo "Deployment successful" | mail -s "✅ Deployment Success" $NOTIFICATION_EMAIL
    else
      echo "Deployment failed" | mail -s "❌ Deployment Failed" $NOTIFICATION_EMAIL
    fi
```

### Slack Notifications

```bash
# In GitLab:
# Settings → Integrations → Slack notifications
# Add webhook URL and configure events
```

---

## 🆘 Troubleshooting

### Runner Not Picking Up Jobs

```bash
# Check runner status
sudo gitlab-runner status

# Restart runner
sudo gitlab-runner restart

# View runner logs
sudo gitlab-runner --debug run
```

### Permission Denied Errors

```bash
# Check gitlab-runner user permissions
sudo -u gitlab-runner -i

# Test commands manually
sudo -u gitlab-runner systemctl restart ground-station-backend
```

### Pipeline Failing on Dependencies

```bash
# Ensure runner has access to:
# - Python 3.11
# - Node.js 18
# - Yarn

# Test on runner:
python3.11 --version
node --version
yarn --version
```

---

## 📚 Additional Resources

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [GitLab Runner Documentation](https://docs.gitlab.com/runner/)
- [GitLab CI/CD Variables](https://docs.gitlab.com/ee/ci/variables/)

---

## ✅ Deployment Checklist

- [ ] GitLab repository created
- [ ] Code pushed to GitLab
- [ ] GitLab Runner installed on RHEL 9
- [ ] Runner registered and active
- [ ] CI/CD variables configured
- [ ] .gitlab-ci.yml added to repository
- [ ] Deployment scripts in place
- [ ] Services configured on RHEL 9
- [ ] First pipeline run successful
- [ ] Application accessible
- [ ] Monitoring configured

---

**GitLab deployment is production-ready!** 🚀
