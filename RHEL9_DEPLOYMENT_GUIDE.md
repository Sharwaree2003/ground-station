# Complete RHEL 9 Deployment Guide with Jenkins CI/CD
## Ground Station Management System

---

## 📋 Table of Contents

1. [Server Requirements](#server-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Installing Dependencies](#installing-dependencies)
4. [MongoDB Installation](#mongodb-installation)
5. [Python Environment Setup](#python-environment-setup)
6. [Node.js and Yarn Setup](#nodejs-and-yarn-setup)
7. [Nginx Installation](#nginx-installation)
8. [Jenkins Installation](#jenkins-installation)
9. [Application Deployment](#application-deployment)
10. [Systemd Service Configuration](#systemd-service-configuration)
11. [Jenkins CI/CD Pipeline](#jenkins-cicd-pipeline)
12. [SSL/TLS Configuration](#ssltls-configuration)
13. [Firewall Configuration](#firewall-configuration)
14. [Monitoring Setup](#monitoring-setup)
15. [Backup Strategy](#backup-strategy)

---

## 🖥️ Server Requirements

### Minimum Hardware Requirements
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 8 GB (16 GB recommended)
- **Disk**: 100 GB SSD
- **Network**: 100 Mbps connection

### Software Requirements
- **OS**: RHEL 9 (Red Hat Enterprise Linux 9)
- **Kernel**: 5.14+
- **SELinux**: Enforcing (recommended)

---

## 🔧 Initial Server Setup

### Step 1: Update System

```bash
# Update all packages
sudo dnf update -y

# Reboot if kernel was updated
sudo reboot

# Check RHEL version
cat /etc/redhat-release
# Output: Red Hat Enterprise Linux release 9.x
```

### Step 2: Set Hostname

```bash
# Set hostname
sudo hostnamectl set-hostname ground-station-server

# Edit hosts file
sudo vi /etc/hosts
# Add:
# 127.0.0.1   ground-station-server localhost
# <YOUR_SERVER_IP>   ground-station-server
```

### Step 3: Create Application User

```bash
# Create dedicated user for application
sudo useradd -m -s /bin/bash groundstation
sudo passwd groundstation

# Add user to wheel group for sudo access (if needed)
sudo usermod -aG wheel groundstation

# Create application directory
sudo mkdir -p /opt/ground-station
sudo chown groundstation:groundstation /opt/ground-station
```

### Step 4: Install Essential Tools

```bash
# Install development tools
sudo dnf groupinstall "Development Tools" -y

# Install essential packages
sudo dnf install -y \
    git \
    curl \
    wget \
    vim \
    htop \
    net-tools \
    policycoreutils-python-utils \
    firewalld \
    chrony \
    unzip

# Enable and start firewall
sudo systemctl enable --now firewalld

# Enable and start time synchronization
sudo systemctl enable --now chronyd
```

---

## 📦 Installing Dependencies

### Step 5: Install EPEL Repository

```bash
# Enable EPEL (Extra Packages for Enterprise Linux)
sudo dnf install -y epel-release

# Update package cache
sudo dnf update -y
```

---

## 🗄️ MongoDB Installation

### Step 6: Install MongoDB 6.0

```bash
# Create MongoDB repository file
sudo cat > /etc/yum.repos.d/mongodb-org-6.0.repo << 'EOF'
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# Install MongoDB
sudo dnf install -y mongodb-org

# Start and enable MongoDB
sudo systemctl enable --now mongod

# Check MongoDB status
sudo systemctl status mongod

# Verify MongoDB is running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

### Step 7: Configure MongoDB

```bash
# Edit MongoDB configuration
sudo vi /etc/mongod.conf

# Update the following settings:
# net:
#   port: 27017
#   bindIp: 127.0.0.1  # Change to 0.0.0.0 for remote access
#
# security:
#   authorization: enabled  # Enable authentication (recommended)

# Restart MongoDB
sudo systemctl restart mongod
```

### Step 8: Create MongoDB User (Security)

```bash
# Connect to MongoDB
mongosh

# Switch to admin database
use admin

# Create admin user
db.createUser({
  user: "admin",
  pwd: "YourStrongPassword123!",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create application database and user
use ground_station_db

db.createUser({
  user: "groundstation",
  pwd: "AppPassword123!",
  roles: [ { role: "readWrite", db: "ground_station_db" } ]
})

# Exit
exit
```

---

## 🐍 Python Environment Setup

### Step 9: Install Python 3.11

```bash
# RHEL 9 comes with Python 3.9, let's install Python 3.11
sudo dnf install -y python3.11 python3.11-pip python3.11-devel

# Verify installation
python3.11 --version
# Output: Python 3.11.x

# Install virtualenv
sudo pip3.11 install virtualenv

# Create Python virtual environment for application
sudo -u groundstation python3.11 -m venv /opt/ground-station/venv

# Activate virtual environment
sudo -u groundstation bash
source /opt/ground-station/venv/bin/activate
```

### Step 10: Install Python Dependencies

```bash
# As groundstation user with venv activated
cd /opt/ground-station

# Install wheel and setuptools first
pip install --upgrade pip wheel setuptools

# Install application dependencies
pip install \
    fastapi==0.110.1 \
    uvicorn[standard]==0.25.0 \
    motor==3.3.1 \
    pymongo==4.5.0 \
    pydantic>=2.6.4 \
    python-dotenv>=1.0.1 \
    websockets>=12.0 \
    aiofiles>=23.0.0 \
    python-multipart>=0.0.9

# Verify installation
pip list
```

---

## 📦 Node.js and Yarn Setup

### Step 11: Install Node.js 18 LTS

```bash
# Add NodeSource repository for Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs

# Verify installation
node --version
# Output: v18.x.x

npm --version
# Output: 9.x.x
```

### Step 12: Install Yarn Package Manager

```bash
# Install Yarn globally
sudo npm install -g yarn

# Verify installation
yarn --version
# Output: 1.22.x
```

---

## 🌐 Nginx Installation

### Step 13: Install Nginx

```bash
# Install Nginx
sudo dnf install -y nginx

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx
```

### Step 14: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration for Ground Station
sudo vi /etc/nginx/conf.d/ground-station.conf
```

Add the following configuration:

```nginx
# Backend API
upstream backend {
    server 127.0.0.1:8001;
}

# Frontend
upstream frontend {
    server 127.0.0.1:3000;
}

# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    server_name your-domain.com;  # Change this
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com;  # Change this
    
    # SSL Certificate (will be configured later)
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API Backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔨 Jenkins Installation

### Step 15: Install Jenkins

```bash
# Add Jenkins repository
sudo wget -O /etc/yum.repos.d/jenkins.repo \
    https://pkg.jenkins.io/redhat-stable/jenkins.repo

# Import Jenkins GPG key
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Java 11 (Jenkins requirement)
sudo dnf install -y java-11-openjdk java-11-openjdk-devel

# Install Jenkins
sudo dnf install -y jenkins

# Start and enable Jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Check Jenkins status
sudo systemctl status jenkins
```

### Step 16: Configure Jenkins

```bash
# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Open Jenkins in browser
# http://your-server-ip:8080

# Follow the setup wizard:
# 1. Enter initial admin password
# 2. Install suggested plugins
# 3. Create first admin user
# 4. Configure Jenkins URL
```

### Step 17: Install Jenkins Plugins

```bash
# Access Jenkins UI and install these plugins:
# - Git plugin
# - GitHub plugin
# - Pipeline plugin
# - NodeJS plugin
# - SSH Agent plugin
# - Publish Over SSH plugin
# - Email Extension plugin
```

### Step 18: Configure Jenkins Tools

**Configure Node.js:**
1. Go to: Manage Jenkins → Global Tool Configuration
2. Add NodeJS installation:
   - Name: NodeJS 18
   - Install automatically: Yes
   - Version: NodeJS 18.x.x

**Configure Python:**
1. Ensure Python 3.11 is available system-wide
2. Configure in pipeline as needed

---

## 📁 Application Deployment

### Step 19: Clone Application Repository

```bash
# Switch to groundstation user
sudo -u groundstation bash

# Clone repository
cd /opt/ground-station
git clone <your-repository-url> app

# Or copy files from development
# scp -r /local/path/app groundstation@server:/opt/ground-station/
```

### Step 20: Setup Backend

```bash
# As groundstation user
cd /opt/ground-station/app/backend

# Activate virtual environment
source /opt/ground-station/venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://groundstation:AppPassword123!@localhost:27017/ground_station_db
DB_NAME=ground_station_db
CORS_ORIGINS=*
EOF

# Set proper permissions
chmod 600 .env
```

### Step 21: Setup Frontend

```bash
# As groundstation user
cd /opt/ground-station/app/frontend

# Install dependencies
yarn install

# Create production .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://your-domain.com
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
EOF

# Build for production
yarn build
```

---

## ⚙️ Systemd Service Configuration

### Step 22: Create Backend Service

```bash
# Create systemd service for backend
sudo vi /etc/systemd/system/ground-station-backend.service
```

Add the following content:

```ini
[Unit]
Description=Ground Station Backend API
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=groundstation
Group=groundstation
WorkingDirectory=/opt/ground-station/app/backend
Environment="PATH=/opt/ground-station/venv/bin"
ExecStart=/opt/ground-station/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ground-station-backend

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Step 23: Create Frontend Service

```bash
# Create systemd service for frontend
sudo vi /etc/systemd/system/ground-station-frontend.service
```

Add the following content:

```ini
[Unit]
Description=Ground Station Frontend
After=network.target

[Service]
Type=simple
User=groundstation
Group=groundstation
WorkingDirectory=/opt/ground-station/app/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npx serve -s build -p 3000
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ground-station-frontend

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Step 24: Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable ground-station-backend
sudo systemctl enable ground-station-frontend

# Start services
sudo systemctl start ground-station-backend
sudo systemctl start ground-station-frontend

# Check status
sudo systemctl status ground-station-backend
sudo systemctl status ground-station-frontend

# View logs
sudo journalctl -u ground-station-backend -f
sudo journalctl -u ground-station-frontend -f
```

---

## 🔄 Jenkins CI/CD Pipeline

### Step 25: Create Jenkins Pipeline Job

1. **Create New Pipeline Job:**
   - Jenkins Dashboard → New Item
   - Name: `ground-station-pipeline`
   - Type: Pipeline
   - Click OK

2. **Configure Pipeline:**
   - Enable: "GitHub project" (if using GitHub)
   - Build Triggers: "GitHub hook trigger for GITScm polling"

### Step 26: Create Jenkinsfile

Create `Jenkinsfile` in your repository root:

```groovy
pipeline {
    agent any
    
    environment {
        APP_DIR = '/opt/ground-station/app'
        VENV_DIR = '/opt/ground-station/venv'
        DEPLOY_USER = 'groundstation'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                git branch: 'main',
                    url: 'https://github.com/your-repo/ground-station.git'
            }
        }
        
        stage('Backend Tests') {
            steps {
                echo 'Running backend tests...'
                sh '''
                    source ${VENV_DIR}/bin/activate
                    cd backend
                    pip install -r requirements.txt
                    python -m pytest tests/ || true
                '''
            }
        }
        
        stage('Frontend Build') {
            steps {
                echo 'Building frontend...'
                sh '''
                    cd frontend
                    yarn install
                    yarn build
                '''
            }
        }
        
        stage('Deploy Backend') {
            steps {
                echo 'Deploying backend...'
                sh '''
                    sudo -u ${DEPLOY_USER} cp -r backend/* ${APP_DIR}/backend/
                    sudo systemctl restart ground-station-backend
                '''
            }
        }
        
        stage('Deploy Frontend') {
            steps {
                echo 'Deploying frontend...'
                sh '''
                    sudo -u ${DEPLOY_USER} cp -r frontend/build/* ${APP_DIR}/frontend/build/
                    sudo systemctl restart ground-station-frontend
                '''
            }
        }
        
        stage('Health Check') {
            steps {
                echo 'Performing health check...'
                sh '''
                    sleep 10
                    curl -f http://localhost:8001/api/ || exit 1
                    curl -f http://localhost:3000/ || exit 1
                '''
            }
        }
    }
    
    post {
        success {
            echo 'Deployment successful!'
            // Send success notification
        }
        failure {
            echo 'Deployment failed!'
            // Send failure notification
        }
    }
}
```

### Step 27: Configure Jenkins Permissions

```bash
# Allow Jenkins to run deployment commands
sudo visudo

# Add these lines:
jenkins ALL=(groundstation) NOPASSWD: /usr/bin/cp
jenkins ALL=(root) NOPASSWD: /usr/bin/systemctl restart ground-station-backend
jenkins ALL=(root) NOPASSWD: /usr/bin/systemctl restart ground-station-frontend
jenkins ALL=(root) NOPASSWD: /usr/bin/systemctl status ground-station-backend
jenkins ALL=(root) NOPASSWD: /usr/bin/systemctl status ground-station-frontend
```

### Step 28: Setup GitHub Webhook

1. **In GitHub Repository:**
   - Settings → Webhooks → Add webhook
   - Payload URL: `http://your-jenkins-url:8080/github-webhook/`
   - Content type: application/json
   - Events: Push events
   - Active: Yes

---

## 🔒 SSL/TLS Configuration

### Step 29: Install Certbot for Let's Encrypt

```bash
# Install certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certificate auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Step 30: Update Nginx Configuration

```bash
# Certbot should have updated nginx config automatically
# Verify SSL configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔥 Firewall Configuration

### Step 31: Configure Firewalld

```bash
# Check firewall status
sudo firewall-cmd --state

# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Allow Jenkins (if accessing externally)
sudo firewall-cmd --permanent --add-port=8080/tcp

# Allow MongoDB (only if remote access needed)
# sudo firewall-cmd --permanent --add-port=27017/tcp

# Reload firewall
sudo firewall-cmd --reload

# List all allowed services
sudo firewall-cmd --list-all
```

---

## 📊 Monitoring Setup

### Step 32: Install Monitoring Tools

```bash
# Install Prometheus Node Exporter
sudo dnf install -y golang-github-prometheus-node-exporter

# Enable and start
sudo systemctl enable --now node_exporter

# Check status
sudo systemctl status node_exporter
```

### Step 33: Setup Log Rotation

```bash
# Create logrotate config
sudo vi /etc/logrotate.d/ground-station
```

Add:

```
/var/log/ground-station/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 groundstation groundstation
    sharedscripts
    postrotate
        systemctl reload ground-station-backend > /dev/null 2>&1 || true
        systemctl reload ground-station-frontend > /dev/null 2>&1 || true
    endscript
}
```

---

## 💾 Backup Strategy

### Step 34: Create Backup Script

```bash
# Create backup script
sudo vi /usr/local/bin/ground-station-backup.sh
```

Add:

```bash
#!/bin/bash

# Variables
BACKUP_DIR="/backup/ground-station"
DATE=$(date +%Y%m%d_%H%M%S)
MONGO_USER="groundstation"
MONGO_PASS="AppPassword123!"
MONGO_DB="ground_station_db"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup MongoDB
mongodump --host localhost \
          --port 27017 \
          --username ${MONGO_USER} \
          --password ${MONGO_PASS} \
          --db ${MONGO_DB} \
          --out ${BACKUP_DIR}/mongo_${DATE}

# Backup application files
tar -czf ${BACKUP_DIR}/app_${DATE}.tar.gz /opt/ground-station/app

# Keep only last 7 days of backups
find ${BACKUP_DIR} -type f -mtime +7 -delete
find ${BACKUP_DIR} -type d -mtime +7 -delete

echo "Backup completed: ${DATE}"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/ground-station-backup.sh

# Create cron job for daily backup at 2 AM
sudo crontab -e

# Add:
0 2 * * * /usr/local/bin/ground-station-backup.sh >> /var/log/ground-station-backup.log 2>&1
```

---

## ✅ Verification Checklist

### Step 35: Verify Installation

```bash
# Check all services
sudo systemctl status mongod
sudo systemctl status ground-station-backend
sudo systemctl status ground-station-frontend
sudo systemctl status nginx
sudo systemctl status jenkins

# Check listening ports
sudo netstat -tulpn | grep -E '(3000|8001|8080|27017|443|80)'

# Test backend API
curl http://localhost:8001/api/

# Test frontend
curl http://localhost:3000/

# Check logs
sudo journalctl -u ground-station-backend --since today
sudo journalctl -u ground-station-frontend --since today

# MongoDB connection test
mongosh "mongodb://groundstation:AppPassword123!@localhost:27017/ground_station_db" \
  --eval "db.runCommand({ connectionStatus: 1 })"
```

---

## 🎯 Post-Deployment Tasks

### Step 36: Security Hardening

```bash
# Update SELinux policies (if using SELinux)
sudo setsebool -P httpd_can_network_connect 1

# Secure SSH
sudo vi /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (if using SSH keys)
sudo systemctl restart sshd

# Install fail2ban
sudo dnf install -y fail2ban
sudo systemctl enable --now fail2ban
```

### Step 37: Setup Monitoring Alerts

```bash
# Install mailx for email alerts
sudo dnf install -y mailx

# Create alert script
sudo vi /usr/local/bin/service-monitor.sh
```

Add:

```bash
#!/bin/bash

SERVICES=("ground-station-backend" "ground-station-frontend" "mongod" "nginx")
EMAIL="admin@yourdomain.com"

for service in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet $service; then
        echo "Service $service is not running!" | mail -s "Service Alert: $service DOWN" $EMAIL
        sudo systemctl start $service
    fi
done
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/service-monitor.sh

# Add to cron (every 5 minutes)
sudo crontab -e
# Add: */5 * * * * /usr/local/bin/service-monitor.sh
```

---

## 📝 Maintenance Commands

### Useful Commands

```bash
# View application logs
sudo journalctl -u ground-station-backend -f
sudo journalctl -u ground-station-frontend -f

# Restart services
sudo systemctl restart ground-station-backend
sudo systemctl restart ground-station-frontend

# Check MongoDB status
sudo systemctl status mongod
mongosh --eval "db.serverStatus()"

# Update application
cd /opt/ground-station/app
sudo -u groundstation git pull
sudo systemctl restart ground-station-backend
sudo systemctl restart ground-station-frontend

# Check disk space
df -h

# Check memory usage
free -h

# Check process status
ps aux | grep -E '(uvicorn|node|mongod)'

# Network connections
sudo netstat -tulpn

# System resource usage
htop
```

---

## 🆘 Troubleshooting

### Common Issues

**Backend not starting:**
```bash
# Check logs
sudo journalctl -u ground-station-backend -n 50

# Check MongoDB connection
mongosh "mongodb://groundstation:AppPassword123!@localhost:27017/ground_station_db"

# Check port availability
sudo netstat -tulpn | grep 8001
```

**Frontend not loading:**
```bash
# Check logs
sudo journalctl -u ground-station-frontend -n 50

# Rebuild frontend
cd /opt/ground-station/app/frontend
yarn build
sudo systemctl restart ground-station-frontend
```

**MongoDB connection issues:**
```bash
# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod

# Check firewall
sudo firewall-cmd --list-all
```

**Jenkins pipeline fails:**
```bash
# Check Jenkins logs
sudo journalctl -u jenkins -f

# Check permissions
ls -la /opt/ground-station/app

# Test manual deployment
sudo -u groundstation bash
cd /opt/ground-station/app
# Run deployment steps manually
```

---

## 📚 Additional Resources

### Documentation Links
- RHEL 9 Documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9
- MongoDB Documentation: https://docs.mongodb.com/
- Nginx Documentation: https://nginx.org/en/docs/
- Jenkins Documentation: https://www.jenkins.io/doc/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- React Documentation: https://react.dev/

### Support
- Check application logs in `/var/log/`
- Review systemd journal: `sudo journalctl -xe`
- MongoDB logs: `/var/log/mongodb/`
- Nginx logs: `/var/log/nginx/`

---

## ✅ Deployment Checklist

- [ ] RHEL 9 server setup complete
- [ ] All dependencies installed
- [ ] MongoDB installed and secured
- [ ] Python 3.11 environment configured
- [ ] Node.js 18 and Yarn installed
- [ ] Nginx configured as reverse proxy
- [ ] Jenkins installed and configured
- [ ] Application deployed
- [ ] Systemd services created and running
- [ ] Jenkins pipeline configured
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring setup complete
- [ ] Backup strategy implemented
- [ ] Security hardening applied
- [ ] Documentation reviewed

---

**Deployment Complete! 🚀**

Your Ground Station Management System is now running on RHEL 9 with full CI/CD pipeline using Jenkins!

Access the application at: `https://your-domain.com`
Access Jenkins at: `http://your-server-ip:8080`
