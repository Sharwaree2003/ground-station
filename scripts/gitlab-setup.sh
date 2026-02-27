#!/bin/bash

################################################################################
# GitLab Setup Script for RHEL 9
# Installs and configures GitLab Runner
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    exit 1
fi

print_status "Starting GitLab Runner setup for RHEL 9..."
echo "============================================================"

# Step 1: Install GitLab Runner
print_status "Step 1: Installing GitLab Runner..."
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh" | bash
dnf install gitlab-runner -y

print_status "GitLab Runner installed successfully"
gitlab-runner --version

# Step 2: Configure permissions
print_status "Step 2: Configuring permissions..."
usermod -aG wheel gitlab-runner
usermod -aG groundstation gitlab-runner

print_status "Adding sudo permissions..."
cat >> /etc/sudoers.d/gitlab-runner << 'EOF'
# GitLab Runner permissions
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
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl is-active ground-station-backend
gitlab-runner ALL=(root) NOPASSWD: /usr/bin/systemctl is-active ground-station-frontend
EOF

chmod 0440 /etc/sudoers.d/gitlab-runner

print_status "Permissions configured"

# Step 3: Test runner
print_status "Step 3: Testing GitLab Runner..."
gitlab-runner verify || print_warning "Runner not registered yet"

echo ""
echo "============================================================"
print_status "GitLab Runner Setup Complete!"
echo "============================================================"
echo ""
print_status "Next Steps:"
echo "1. Get registration token from GitLab:"
echo "   Project → Settings → CI/CD → Runners → Expand"
echo ""
echo "2. Register the runner:"
echo "   sudo gitlab-runner register"
echo ""
echo "   You'll need:"
echo "   • GitLab instance URL: https://gitlab.com/"
echo "   • Registration token: (from GitLab)"
echo "   • Runner description: RHEL9-Ground-Station-Runner"
echo "   • Runner tags: rhel9,ground-station"
echo "   • Executor: shell"
echo ""
echo "3. Start the runner:"
echo "   sudo gitlab-runner start"
echo ""
echo "4. Verify runner status:"
echo "   sudo gitlab-runner status"
echo ""
print_status "Setup complete!"
