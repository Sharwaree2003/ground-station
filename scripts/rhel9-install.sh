#!/bin/bash

################################################################################
# Ground Station Management System - RHEL 9 Automated Installation Script
# Version: 1.0
# Description: Automated installation and setup for RHEL 9
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
APP_USER="groundstation"
APP_DIR="/opt/ground-station"
MONGO_DB="ground_station_db"
MONGO_USER="groundstation"
MONGO_PASS="ChangeMe123!"  # Change this!

################################################################################
# Helper Functions
################################################################################

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Please run as root or with sudo"
        exit 1
    fi
}

################################################################################
# Installation Steps
################################################################################

step1_system_update() {
    print_status "Step 1: Updating system packages..."
    dnf update -y
    print_status "System update complete"
}

step2_install_dependencies() {
    print_status "Step 2: Installing dependencies..."
    
    # Install EPEL
    dnf install -y epel-release
    
    # Install development tools
    dnf groupinstall "Development Tools" -y
    
    # Install essential packages
    dnf install -y \
        git \
        curl \
        wget \
        vim \
        htop \
        net-tools \
        policycoreutils-python-utils \
        firewalld \
        chrony \
        unzip \
        java-11-openjdk \
        java-11-openjdk-devel
    
    print_status "Dependencies installed"
}

step3_create_app_user() {
    print_status "Step 3: Creating application user..."
    
    if id "$APP_USER" &>/dev/null; then
        print_warning "User $APP_USER already exists"
    else
        useradd -m -s /bin/bash $APP_USER
        print_status "User $APP_USER created"
    fi
    
    # Create application directory
    mkdir -p $APP_DIR
    chown $APP_USER:$APP_USER $APP_DIR
    
    print_status "Application directory created: $APP_DIR"
}

step4_install_mongodb() {
    print_status "Step 4: Installing MongoDB..."
    
    # Create MongoDB repository
    cat > /etc/yum.repos.d/mongodb-org-6.0.repo << 'EOF'
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF
    
    # Install MongoDB
    dnf install -y mongodb-org
    
    # Start and enable MongoDB
    systemctl enable mongod
    systemctl start mongod
    
    # Wait for MongoDB to start
    sleep 5
    
    # Create database and user
    mongosh <<EOF
use admin
db.createUser({
  user: "admin",
  pwd: "$MONGO_PASS",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

use $MONGO_DB
db.createUser({
  user: "$MONGO_USER",
  pwd: "$MONGO_PASS",
  roles: [ { role: "readWrite", db: "$MONGO_DB" } ]
})
EOF
    
    print_status "MongoDB installed and configured"
}

step5_install_python() {
    print_status "Step 5: Installing Python 3.11..."
    
    dnf install -y python3.11 python3.11-pip python3.11-devel
    pip3.11 install virtualenv
    
    # Create virtual environment
    sudo -u $APP_USER python3.11 -m venv $APP_DIR/venv
    
    print_status "Python 3.11 installed and virtual environment created"
}

step6_install_nodejs() {
    print_status "Step 6: Installing Node.js..."
    
    # Install Node.js 18
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    dnf install -y nodejs
    
    # Install Yarn
    npm install -g yarn
    
    print_status "Node.js 18 and Yarn installed"
}

step7_install_nginx() {
    print_status "Step 7: Installing Nginx..."
    
    dnf install -y nginx
    systemctl enable nginx
    systemctl start nginx
    
    print_status "Nginx installed"
}

step8_install_jenkins() {
    print_status "Step 8: Installing Jenkins..."
    
    # Add Jenkins repository
    wget -O /etc/yum.repos.d/jenkins.repo \
        https://pkg.jenkins.io/redhat-stable/jenkins.repo
    rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
    
    # Install Jenkins
    dnf install -y jenkins
    
    # Start and enable Jenkins
    systemctl enable jenkins
    systemctl start jenkins
    
    # Wait for Jenkins to start
    sleep 10
    
    print_status "Jenkins installed"
    print_warning "Initial admin password:"
    cat /var/lib/jenkins/secrets/initialAdminPassword
}

step9_configure_firewall() {
    print_status "Step 9: Configuring firewall..."
    
    systemctl enable firewalld
    systemctl start firewalld
    
    # Allow HTTP, HTTPS, and Jenkins
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=8080/tcp
    
    # Reload firewall
    firewall-cmd --reload
    
    print_status "Firewall configured"
}

step10_create_systemd_services() {
    print_status "Step 10: Creating systemd services..."
    
    # Backend service
    cat > /etc/systemd/system/ground-station-backend.service << EOF
[Unit]
Description=Ground Station Backend API
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/app/backend
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ground-station-backend
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
    
    # Frontend service
    cat > /etc/systemd/system/ground-station-frontend.service << EOF
[Unit]
Description=Ground Station Frontend
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/app/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npx serve -s build -p 3000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ground-station-frontend
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    
    print_status "Systemd services created"
}

step11_configure_nginx() {
    print_status "Step 11: Configuring Nginx..."
    
    cat > /etc/nginx/conf.d/ground-station.conf << 'EOF'
upstream backend {
    server 127.0.0.1:8001;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;
    
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
    }
}
EOF
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    print_status "Nginx configured"
}

step12_selinux_config() {
    print_status "Step 12: Configuring SELinux..."
    
    # Allow Nginx to connect to network
    setsebool -P httpd_can_network_connect 1
    
    print_status "SELinux configured"
}

################################################################################
# Main Installation Process
################################################################################

main() {
    print_status "Starting Ground Station Management System Installation..."
    echo "============================================================"
    
    check_root
    
    step1_system_update
    step2_install_dependencies
    step3_create_app_user
    step4_install_mongodb
    step5_install_python
    step6_install_nodejs
    step7_install_nginx
    step8_install_jenkins
    step9_configure_firewall
    step10_create_systemd_services
    step11_configure_nginx
    step12_selinux_config
    
    echo ""
    echo "============================================================"
    print_status "Installation Complete!"
    echo "============================================================"
    echo ""
    echo "Next Steps:"
    echo "1. Copy your application code to: $APP_DIR/app"
    echo "2. Install Python dependencies:"
    echo "   sudo -u $APP_USER bash"
    echo "   source $APP_DIR/venv/bin/activate"
    echo "   cd $APP_DIR/app/backend"
    echo "   pip install -r requirements.txt"
    echo ""
    echo "3. Install and build frontend:"
    echo "   cd $APP_DIR/app/frontend"
    echo "   yarn install"
    echo "   yarn build"
    echo ""
    echo "4. Start services:"
    echo "   sudo systemctl start ground-station-backend"
    echo "   sudo systemctl start ground-station-frontend"
    echo ""
    echo "5. Access Jenkins at: http://$(hostname -I | awk '{print $1}'):8080"
    echo "   Initial admin password:"
    cat /var/lib/jenkins/secrets/initialAdminPassword
    echo ""
    echo "6. Access application at: http://$(hostname -I | awk '{print $1}')"
    echo ""
    print_warning "IMPORTANT: Change MongoDB password in:"
    echo "   - This script variable MONGO_PASS"
    echo "   - $APP_DIR/app/backend/.env"
    echo ""
}

# Run main installation
main "$@"
