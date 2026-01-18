# RHEL 9 Quick Start Guide
## Ground Station Management System

---

## 🚀 Quick Installation (5 Steps)

### Option 1: Automated Installation Script

```bash
# 1. Download the installation script
wget https://raw.githubusercontent.com/your-repo/ground-station/main/scripts/rhel9-install.sh

# 2. Make it executable
chmod +x rhel9-install.sh

# 3. Run as root
sudo ./rhel9-install.sh

# 4. Wait for installation to complete (15-20 minutes)

# 5. Deploy your application code
sudo -u groundstation bash
cd /opt/ground-station
git clone <your-repo-url> app

# 6. Setup backend
cd app/backend
source /opt/ground-station/venv/bin/activate
pip install -r requirements.txt
cat > .env << 'EOF'
MONGO_URL=mongodb://groundstation:ChangeMe123!@localhost:27017/ground_station_db
DB_NAME=ground_station_db
CORS_ORIGINS=*
EOF

# 7. Setup frontend
cd ../frontend
yarn install
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://your-server-ip
EOF
yarn build

# 8. Start services
exit  # Exit groundstation user
sudo systemctl start ground-station-backend
sudo systemctl start ground-station-frontend

# 9. Access application
# Open browser: http://your-server-ip
```

---

### Option 2: Manual Installation

```bash
# 1. Update system
sudo dnf update -y

# 2. Install all dependencies
sudo dnf install -y epel-release
sudo dnf groupinstall "Development Tools" -y
sudo dnf install -y git curl wget vim htop

# 3. Install MongoDB
sudo cat > /etc/yum.repos.d/mongodb-org-6.0.repo << 'EOF'
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

sudo dnf install -y mongodb-org
sudo systemctl enable --now mongod

# 4. Install Python 3.11
sudo dnf install -y python3.11 python3.11-pip python3.11-devel

# 5. Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs
sudo npm install -g yarn

# 6. Install Nginx
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# 7. Install Jenkins
sudo wget -O /etc/yum.repos.d/jenkins.repo \
    https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
sudo dnf install -y java-11-openjdk jenkins
sudo systemctl enable --now jenkins

# 8. Configure firewall
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service={http,https}
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# 9. Follow deployment steps from main guide
```

---

## 📦 Required Packages List

### System Packages
```bash
# Core
- git
- curl
- wget
- vim
- htop
- net-tools
- unzip

# Development
- Development Tools group
- python3.11
- python3.11-pip
- python3.11-devel
- java-11-openjdk
- java-11-openjdk-devel

# Database
- mongodb-org (from MongoDB repo)

# Web Server
- nginx

# CI/CD
- jenkins (from Jenkins repo)

# Security & Networking
- firewalld
- policycoreutils-python-utils
- chrony
```

### Python Packages (via pip)
```bash
fastapi==0.110.1
uvicorn[standard]==0.25.0
motor==3.3.1
pymongo==4.5.0
pydantic>=2.6.4
python-dotenv>=1.0.1
websockets>=12.0
aiofiles>=23.0.0
python-multipart>=0.0.9
```

### Node.js Packages (global)
```bash
yarn (via npm)
serve (via npm - for frontend)
```

### Frontend Dependencies (via yarn)
```bash
# Listed in package.json
react, react-dom, react-router-dom
axios
recharts
lucide-react
sonner
tailwindcss
# ... and others in package.json
```

---

## 🔧 Essential Commands

### Service Management
```bash
# Check all services
sudo systemctl status mongod
sudo systemctl status ground-station-backend
sudo systemctl status ground-station-frontend
sudo systemctl status nginx
sudo systemctl status jenkins

# Restart services
sudo systemctl restart ground-station-backend
sudo systemctl restart ground-station-frontend

# View logs
sudo journalctl -u ground-station-backend -f
sudo journalctl -u ground-station-frontend -f
```

### MongoDB Commands
```bash
# Connect to MongoDB
mongosh "mongodb://groundstation:ChangeMe123!@localhost:27017/ground_station_db"

# Check database status
mongosh --eval "db.serverStatus()"

# List databases
mongosh --eval "show dbs"
```

### Jenkins Commands
```bash
# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Restart Jenkins
sudo systemctl restart jenkins

# View Jenkins logs
sudo journalctl -u jenkins -f
```

### Application Commands
```bash
# Update application
cd /opt/ground-station/app
sudo -u groundstation git pull
sudo systemctl restart ground-station-backend
sudo systemctl restart ground-station-frontend

# View application logs
sudo journalctl -u ground-station-backend -n 100
sudo journalctl -u ground-station-frontend -n 100

# Check application status
curl http://localhost:8001/api/
curl http://localhost:3000/
```

---

## 🔍 Verification Checklist

After installation, verify everything is working:

```bash
# 1. Check services are running
sudo systemctl is-active mongod && echo "✅ MongoDB OK" || echo "❌ MongoDB FAILED"
sudo systemctl is-active nginx && echo "✅ Nginx OK" || echo "❌ Nginx FAILED"
sudo systemctl is-active jenkins && echo "✅ Jenkins OK" || echo "❌ Jenkins FAILED"

# 2. Check ports are listening
sudo netstat -tulpn | grep -E '(27017|8001|3000|80|443|8080)'

# 3. Test MongoDB connection
mongosh --eval "db.adminCommand('ping')" && echo "✅ MongoDB accessible" || echo "❌ MongoDB not accessible"

# 4. Check firewall rules
sudo firewall-cmd --list-all

# 5. Check disk space
df -h

# 6. Check memory
free -h

# 7. Test application (after deployment)
curl http://localhost:8001/api/
curl http://localhost:3000/

# 8. Check SELinux status
sestatus
```

---

## 🆘 Troubleshooting Quick Fixes

### Service not starting
```bash
# Check detailed error
sudo journalctl -u <service-name> -n 50 --no-pager

# Check if port is already in use
sudo netstat -tulpn | grep <port>

# Restart service with detailed output
sudo systemctl restart <service-name>
sudo systemctl status <service-name> -l
```

### MongoDB connection failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod

# Test connection
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

### Frontend build fails
```bash
# Clear cache and rebuild
cd /opt/ground-station/app/frontend
rm -rf node_modules
rm -rf build
yarn cache clean
yarn install
yarn build
```

### Firewall blocking connections
```bash
# Check firewall status
sudo firewall-cmd --state

# Allow ports temporarily
sudo firewall-cmd --add-port=8001/tcp
sudo firewall-cmd --add-port=3000/tcp

# Make permanent
sudo firewall-cmd --permanent --add-port=8001/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### SELinux blocking services
```bash
# Check SELinux denials
sudo ausearch -m avc -ts recent

# Temporarily set to permissive (not recommended for production)
sudo setenforce 0

# Allow specific SELinux booleans
sudo setsebool -P httpd_can_network_connect 1
```

---

## 📊 Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| HTTP | 80 | Public web access |
| HTTPS | 443 | Secure web access |
| Backend API | 8001 | FastAPI application (internal) |
| Frontend | 3000 | React app (internal) |
| Jenkins | 8080 | CI/CD interface |
| MongoDB | 27017 | Database (internal only) |

---

## 🔒 Security Checklist

After installation:

- [ ] Change MongoDB default passwords
- [ ] Enable MongoDB authentication
- [ ] Configure SSL/TLS for Nginx
- [ ] Setup Jenkins authentication
- [ ] Configure firewall rules
- [ ] Enable SELinux (enforcing mode)
- [ ] Setup regular backups
- [ ] Configure log rotation
- [ ] Setup monitoring alerts
- [ ] Disable root SSH login
- [ ] Use SSH keys instead of passwords

---

## 📚 Additional Resources

- **Full Documentation**: `/opt/ground-station/app/RHEL9_DEPLOYMENT_GUIDE.md`
- **README**: `/opt/ground-station/app/README.md`
- **Project Documentation**: `/opt/ground-station/app/PROJECT_DOCUMENTATION.md`
- **Jenkinsfile**: `/opt/ground-station/app/Jenkinsfile`

---

## 💡 Quick Tips

1. **Always use the groundstation user for application tasks**
   ```bash
   sudo -u groundstation bash
   ```

2. **Activate Python virtual environment before pip commands**
   ```bash
   source /opt/ground-station/venv/bin/activate
   ```

3. **Use systemctl for service management, not manual processes**
   ```bash
   sudo systemctl restart ground-station-backend
   # Don't run: uvicorn server:app manually
   ```

4. **Check logs when debugging**
   ```bash
   sudo journalctl -u ground-station-backend -f
   ```

5. **Test locally before deploying**
   ```bash
   curl http://localhost:8001/api/
   ```

---

## 🎯 Next Steps

After successful installation:

1. ✅ Configure Jenkins pipeline
2. ✅ Setup SSL/TLS certificates
3. ✅ Configure domain name
4. ✅ Setup monitoring (Prometheus/Grafana)
5. ✅ Configure automated backups
6. ✅ Setup email alerts
7. ✅ Configure log aggregation
8. ✅ Performance tuning
9. ✅ Security hardening
10. ✅ Documentation update

---

**Happy Deploying! 🚀**
