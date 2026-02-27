# GitLab Quick Reference Guide
## Ground Station Management System

---

## 🚀 Quick Start - 3 Easy Steps

### Step 1: Push Code to GitLab (5 minutes)

```bash
# Run the automated push script
cd /app
bash scripts/gitlab-push.sh https://gitlab.com/YOUR_USERNAME/ground-station-management.git

# When prompted, enter:
# Username: your-gitlab-username
# Password: your-personal-access-token
```

**Get Personal Access Token:**
1. GitLab → Settings → Access Tokens
2. Name: "Deployment Token"
3. Scopes: ✓ api, ✓ read_repository, ✓ write_repository
4. Click "Create"
5. Copy token (you won't see it again!)

---

### Step 2: Setup RHEL 9 Server (20 minutes)

```bash
# Option A: Full automated setup
bash scripts/gitlab-complete-setup.sh

# Option B: Step by step
# 1. Install base system
scp scripts/rhel9-install.sh root@YOUR_SERVER:/tmp/
ssh root@YOUR_SERVER
bash /tmp/rhel9-install.sh

# 2. Setup GitLab Runner
bash /tmp/gitlab-setup.sh
```

---

### Step 3: Register GitLab Runner (2 minutes)

```bash
# On your RHEL 9 server
ssh root@YOUR_SERVER

# Register runner
sudo gitlab-runner register

# Enter these values:
# GitLab URL: https://gitlab.com/
# Token: (from GitLab: Settings → CI/CD → Runners)
# Description: RHEL9-Ground-Station-Runner
# Tags: rhel9,ground-station
# Executor: shell

# Start runner
sudo gitlab-runner start
sudo gitlab-runner status
```

---

## 📂 Required Files Checklist

Make sure these files are in your repository:

```
✅ .gitlab-ci.yml                 # CI/CD pipeline
✅ backend/server.py              # Backend code
✅ backend/requirements.txt       # Python dependencies
✅ backend/.env.example          # Environment template
✅ frontend/src/                 # Frontend code
✅ frontend/package.json         # Node dependencies
✅ frontend/.env.example         # Environment template
✅ scripts/gitlab-setup.sh       # Runner setup
✅ scripts/gitlab-deploy-manual.sh  # Manual deploy
✅ README.md                      # Documentation
✅ GITLAB_DEPLOYMENT_GUIDE.md    # Full guide
```

---

## ⚙️ GitLab CI/CD Variables

Configure in GitLab: **Settings → CI/CD → Variables**

| Variable | Value | Description |
|----------|-------|-------------|
| `MONGO_PASSWORD` | YourPassword123! | MongoDB password |
| `NOTIFICATION_EMAIL` | you@domain.com | Alert email |
| `APP_DIR` | /opt/ground-station/app | App directory (optional) |
| `DEPLOY_USER` | groundstation | Deploy user (optional) |

---

## 🔄 CI/CD Pipeline Overview

```
┌─────────────┐
│  PREFLIGHT  │ → Check services & resources
└──────┬──────┘
       │
┌──────▼──────┐
│    BUILD    │ → Backend & Frontend build
└──────┬──────┘
       │
┌──────▼──────┐
│    TEST     │ → Lint & unit tests
└──────┬──────┘
       │
┌──────▼──────┐
│  SECURITY   │ → Dependency scan
└──────┬──────┘
       │
┌──────▼──────┐
│   DEPLOY    │ → Backup → Deploy → Start
└──────┬──────┘
       │
┌──────▼──────┐
│   VERIFY    │ → Health checks & smoke tests
└──────┬──────┘
       │
┌──────▼──────┐
│   NOTIFY    │ → Success/Failure notification
└─────────────┘
```

**Pipeline runs automatically on:**
- Push to `main` branch
- Merge requests
- Manual trigger

---

## 📝 Common Commands

### View Pipeline Status
```bash
# In GitLab UI
Project → CI/CD → Pipelines

# Latest pipeline
https://gitlab.com/YOUR_USERNAME/ground-station-management/-/pipelines
```

### Manual Deployment (Without CI/CD)
```bash
# On RHEL 9 server
cd /opt/ground-station/app
sudo bash scripts/gitlab-deploy-manual.sh
```

### View Application Logs
```bash
# Backend logs
sudo journalctl -u ground-station-backend -f

# Frontend logs
sudo journalctl -u ground-station-frontend -f

# GitLab Runner logs
sudo gitlab-runner --debug run
```

### Restart Services
```bash
sudo systemctl restart ground-station-backend
sudo systemctl restart ground-station-frontend

# Check status
sudo systemctl status ground-station-backend
sudo systemctl status ground-station-frontend
```

### Update Code
```bash
# On development machine
cd /app
git add .
git commit -m "Update feature"
git push origin main

# Pipeline runs automatically!
```

---

## 🔧 Troubleshooting

### Pipeline Not Running

```bash
# Check runner status
sudo gitlab-runner status

# Verify runner registration
sudo gitlab-runner verify

# Check runner logs
sudo journalctl -u gitlab-runner -f
```

### Runner Can't Access Server

```bash
# Check permissions
sudo -u gitlab-runner -i

# Test commands
sudo -u gitlab-runner systemctl status ground-station-backend
```

### Deployment Fails

```bash
# View detailed logs in GitLab
Project → CI/CD → Pipelines → Click job → View full log

# Check services on server
ssh root@YOUR_SERVER
systemctl status ground-station-backend
systemctl status ground-station-frontend

# Manual rollback
cd /backup/ground-station
ls -lt backup_*.tar.gz | head -1
tar -xzf backup_XXXXXX.tar.gz -C /
systemctl restart ground-station-backend
systemctl restart ground-station-frontend
```

---

## 🎯 Deployment Workflow

```mermaid
Developer → Git Push → GitLab → Runner → RHEL 9 Server
                                   ↓
                            Application Running
```

**Step by step:**
1. Developer commits code
2. GitLab receives push
3. Pipeline triggers automatically
4. GitLab Runner executes jobs
5. Application deployed to RHEL 9
6. Health checks verify deployment
7. Notification sent

---

## 🔒 Security Checklist

- [ ] GitLab Personal Access Token created
- [ ] GitLab CI/CD variables configured
- [ ] MongoDB password changed from default
- [ ] `.env` files NOT committed to git
- [ ] GitLab repository set to Private
- [ ] Runner using shell executor with sudo permissions
- [ ] Firewall configured on RHEL 9
- [ ] SSL/TLS certificates configured (optional)

---

## 📊 Monitoring

### Check Pipeline History
```
GitLab → Project → CI/CD → Pipelines
```

### View Deployment Logs
```bash
# On RHEL 9 server
cat /var/log/ground-station/deployments/deploy_*.txt
```

### Check Application Health
```bash
# Backend API
curl http://YOUR_SERVER_IP/api/

# Frontend
curl http://YOUR_SERVER_IP/

# Dashboard stats
curl http://YOUR_SERVER_IP/api/dashboard/stats
```

---

## 🆘 Getting Help

### Documentation
- **Full Guide**: `GITLAB_DEPLOYMENT_GUIDE.md`
- **RHEL Setup**: `RHEL9_DEPLOYMENT_GUIDE.md`
- **Quick Start**: `RHEL9_QUICK_START.md`
- **README**: `README.md`

### Logs to Check
```bash
# Application logs
sudo journalctl -u ground-station-backend -n 100
sudo journalctl -u ground-station-frontend -n 100

# Runner logs
sudo journalctl -u gitlab-runner -n 100

# MongoDB logs
sudo tail -100 /var/log/mongodb/mongod.log

# Nginx logs
sudo tail -100 /var/log/nginx/error.log
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Code pushed to GitLab
- [ ] GitLab Runner registered and active
- [ ] Pipeline runs successfully
- [ ] Backend API accessible: `http://YOUR_SERVER_IP/api/`
- [ ] Frontend accessible: `http://YOUR_SERVER_IP/`
- [ ] Dashboard shows live data
- [ ] Telemetry updating in real-time
- [ ] Commands can be sent
- [ ] Ansible playbooks execute
- [ ] Alerts are generated
- [ ] All services running

---

## 🚀 Next Steps

1. **Configure Domain Name** (Optional)
   - Point domain to server IP
   - Update `.env` files
   - Configure SSL/TLS

2. **Setup Monitoring**
   - Prometheus + Grafana
   - Email alerts
   - Slack notifications

3. **Scheduled Backups**
   - Daily MongoDB backups
   - Application backups
   - Configuration backups

4. **Performance Tuning**
   - Optimize database queries
   - Frontend build optimization
   - Caching strategies

---

**Quick Reference Complete!** 📚

For detailed instructions, see `GITLAB_DEPLOYMENT_GUIDE.md`
