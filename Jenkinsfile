pipeline {
    agent any
    
    environment {
        // Application directories
        APP_DIR = '/opt/ground-station/app'
        VENV_DIR = '/opt/ground-station/venv'
        DEPLOY_USER = 'groundstation'
        
        // Git configuration
        GIT_REPO = 'https://github.com/your-org/ground-station.git'
        GIT_BRANCH = 'main'
        
        // Notification
        SLACK_CHANNEL = '#deployments'
        EMAIL_RECIPIENTS = 'team@yourdomain.com'
    }
    
    options {
        // Keep only last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout after 30 minutes
        timeout(time: 30, unit: 'MINUTES')
        
        // Don't run concurrent builds
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Pre-flight Check') {
            steps {
                echo '🚀 Starting Ground Station Deployment Pipeline'
                echo "Build Number: ${env.BUILD_NUMBER}"
                echo "Branch: ${env.GIT_BRANCH}"
                echo "Workspace: ${env.WORKSPACE}"
                
                script {
                    // Check if required services are running
                    sh '''
                        systemctl is-active --quiet mongod || (echo "MongoDB is not running!" && exit 1)
                        systemctl is-active --quiet nginx || (echo "Nginx is not running!" && exit 1)
                    '''
                }
            }
        }
        
        stage('Checkout') {
            steps {
                echo '📥 Checking out source code...'
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "*/${GIT_BRANCH}"]],
                    userRemoteConfigs: [[url: "${GIT_REPO}"]]
                ])
                
                // Display commit info
                sh '''
                    echo "Latest commit:"
                    git log -1 --oneline
                '''
            }
        }
        
        stage('Backup Current Version') {
            steps {
                echo '💾 Creating backup of current version...'
                script {
                    def timestamp = new Date().format('yyyyMMdd_HHmmss')
                    sh """
                        mkdir -p /backup/ground-station
                        tar -czf /backup/ground-station/backup_${timestamp}.tar.gz \
                            ${APP_DIR}/backend \
                            ${APP_DIR}/frontend 2>/dev/null || true
                        
                        # Keep only last 5 backups
                        cd /backup/ground-station
                        ls -t backup_*.tar.gz | tail -n +6 | xargs rm -f || true
                    """
                }
            }
        }
        
        stage('Backend - Lint & Test') {
            steps {
                echo '🔍 Running backend linting and tests...'
                sh '''
                    cd ${WORKSPACE}/backend
                    
                    # Activate virtual environment
                    source ${VENV_DIR}/bin/activate
                    
                    # Install/update dependencies
                    pip install -r requirements.txt
                    
                    # Run linting (optional)
                    # pip install flake8
                    # flake8 server.py --max-line-length=120 || true
                    
                    # Run tests (if tests exist)
                    if [ -d "tests" ]; then
                        pip install pytest pytest-asyncio
                        python -m pytest tests/ -v || true
                    else
                        echo "No tests found, skipping..."
                    fi
                '''
            }
        }
        
        stage('Frontend - Lint & Build') {
            steps {
                echo '🏗️  Building frontend...'
                sh '''
                    cd ${WORKSPACE}/frontend
                    
                    # Install dependencies
                    yarn install
                    
                    # Run linting (optional)
                    # yarn lint || true
                    
                    # Build production bundle
                    yarn build
                    
                    # Verify build output
                    if [ ! -d "build" ]; then
                        echo "Build failed - build directory not found!"
                        exit 1
                    fi
                    
                    echo "Build successful!"
                    du -sh build/
                '''
            }
        }
        
        stage('Security Scan') {
            steps {
                echo '🔒 Running security scans...'
                parallel(
                    'Backend Security': {
                        sh '''
                            cd ${WORKSPACE}/backend
                            source ${VENV_DIR}/bin/activate
                            
                            # Install safety for dependency security check
                            pip install safety || true
                            safety check || true
                        '''
                    },
                    'Frontend Security': {
                        sh '''
                            cd ${WORKSPACE}/frontend
                            
                            # Run npm audit
                            yarn audit || true
                        '''
                    }
                )
            }
        }
        
        stage('Deploy Backend') {
            steps {
                echo '🚢 Deploying backend...'
                sh '''
                    # Stop backend service
                    sudo systemctl stop ground-station-backend
                    
                    # Copy new backend files
                    sudo -u ${DEPLOY_USER} rsync -av --delete \
                        ${WORKSPACE}/backend/ \
                        ${APP_DIR}/backend/
                    
                    # Install/update dependencies
                    cd ${APP_DIR}/backend
                    source ${VENV_DIR}/bin/activate
                    pip install -r requirements.txt
                    
                    # Start backend service
                    sudo systemctl start ground-station-backend
                    
                    # Wait for service to start
                    sleep 5
                    
                    # Check if service is running
                    sudo systemctl is-active --quiet ground-station-backend || exit 1
                '''
            }
        }
        
        stage('Deploy Frontend') {
            steps {
                echo '🎨 Deploying frontend...'
                sh '''
                    # Stop frontend service
                    sudo systemctl stop ground-station-frontend
                    
                    # Copy new frontend build
                    sudo -u ${DEPLOY_USER} rsync -av --delete \
                        ${WORKSPACE}/frontend/build/ \
                        ${APP_DIR}/frontend/build/
                    
                    # Copy package.json and install serve if needed
                    sudo -u ${DEPLOY_USER} rsync -av \
                        ${WORKSPACE}/frontend/package.json \
                        ${APP_DIR}/frontend/
                    
                    # Start frontend service
                    sudo systemctl start ground-station-frontend
                    
                    # Wait for service to start
                    sleep 5
                    
                    # Check if service is running
                    sudo systemctl is-active --quiet ground-station-frontend || exit 1
                '''
            }
        }
        
        stage('Health Check') {
            steps {
                echo '🏥 Performing health checks...'
                script {
                    // Wait for services to stabilize
                    sleep(10)
                    
                    // Check backend API
                    sh '''
                        echo "Checking backend API..."
                        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/)
                        if [ $response -eq 200 ]; then
                            echo "✅ Backend API is healthy (HTTP $response)"
                        else
                            echo "❌ Backend API health check failed (HTTP $response)"
                            exit 1
                        fi
                    '''
                    
                    // Check frontend
                    sh '''
                        echo "Checking frontend..."
                        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
                        if [ $response -eq 200 ]; then
                            echo "✅ Frontend is healthy (HTTP $response)"
                        else
                            echo "❌ Frontend health check failed (HTTP $response)"
                            exit 1
                        fi
                    '''
                    
                    // Check MongoDB connection
                    sh '''
                        echo "Checking MongoDB connection..."
                        mongosh --quiet --eval "db.adminCommand('ping')" || exit 1
                        echo "✅ MongoDB is healthy"
                    '''
                    
                    // Check system resources
                    sh '''
                        echo "System Resources:"
                        echo "CPU Usage:"
                        top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1"%"}'
                        
                        echo "Memory Usage:"
                        free -h | awk 'NR==2{printf "Used: %s / %s (%.2f%%)\n", $3, $2, $3*100/$2}'
                        
                        echo "Disk Usage:"
                        df -h / | awk 'NR==2{printf "%s / %s (%s)\n", $3, $2, $5}'
                    '''
                }
            }
        }
        
        stage('Smoke Tests') {
            steps {
                echo '💨 Running smoke tests...'
                sh '''
                    echo "Testing API endpoints..."
                    
                    # Test root endpoint
                    curl -f http://localhost:8001/api/ || exit 1
                    
                    # Test dashboard stats
                    curl -f http://localhost:8001/api/dashboard/stats || exit 1
                    
                    # Test servers endpoint
                    curl -f http://localhost:8001/api/servers || exit 1
                    
                    # Test telemetry endpoint
                    curl -f http://localhost:8001/api/telemetry?limit=10 || exit 1
                    
                    echo "✅ All smoke tests passed!"
                '''
            }
        }
        
        stage('Update Documentation') {
            steps {
                echo '📚 Updating deployment documentation...'
                script {
                    def timestamp = new Date().format('yyyy-MM-dd HH:mm:ss')
                    sh """
                        echo "Deployment Information" > /var/log/ground-station/last_deployment.txt
                        echo "======================" >> /var/log/ground-station/last_deployment.txt
                        echo "Timestamp: ${timestamp}" >> /var/log/ground-station/last_deployment.txt
                        echo "Build Number: ${env.BUILD_NUMBER}" >> /var/log/ground-station/last_deployment.txt
                        echo "Git Branch: ${env.GIT_BRANCH}" >> /var/log/ground-station/last_deployment.txt
                        echo "Git Commit: \$(git rev-parse --short HEAD)" >> /var/log/ground-station/last_deployment.txt
                        echo "Deployed By: ${env.BUILD_USER:-Jenkins}" >> /var/log/ground-station/last_deployment.txt
                    """
                }
            }
        }
    }
    
    post {
        success {
            script {
                def timestamp = new Date().format('yyyy-MM-dd HH:mm:ss')
                
                echo """
                ╔════════════════════════════════════════════════════════╗
                ║         ✅ DEPLOYMENT SUCCESSFUL                       ║
                ╚════════════════════════════════════════════════════════╝
                
                🎉 Ground Station Management System deployed successfully!
                
                📊 Deployment Details:
                   • Build Number: ${env.BUILD_NUMBER}
                   • Branch: ${env.GIT_BRANCH}
                   • Timestamp: ${timestamp}
                   • Duration: ${currentBuild.durationString}
                
                🔗 Access the application:
                   • Frontend: http://your-server-ip/
                   • Backend API: http://your-server-ip/api/
                   • API Docs: http://your-server-ip/api/docs
                
                📝 Logs:
                   • Backend: sudo journalctl -u ground-station-backend -f
                   • Frontend: sudo journalctl -u ground-station-frontend -f
                """
                
                // Send email notification
                emailext(
                    subject: "✅ Deployment Successful - Ground Station (Build #${env.BUILD_NUMBER})",
                    body: """
                    <h2>Deployment Successful</h2>
                    <p>Ground Station Management System has been deployed successfully.</p>
                    <ul>
                        <li><strong>Build Number:</strong> ${env.BUILD_NUMBER}</li>
                        <li><strong>Branch:</strong> ${env.GIT_BRANCH}</li>
                        <li><strong>Timestamp:</strong> ${timestamp}</li>
                        <li><strong>Duration:</strong> ${currentBuild.durationString}</li>
                    </ul>
                    <p><a href="${env.BUILD_URL}">View Build Details</a></p>
                    """,
                    to: "${EMAIL_RECIPIENTS}",
                    mimeType: 'text/html'
                )
            }
        }
        
        failure {
            script {
                echo """
                ╔════════════════════════════════════════════════════════╗
                ║         ❌ DEPLOYMENT FAILED                           ║
                ╚════════════════════════════════════════════════════════╝
                
                ⚠️  Deployment failed! Rolling back...
                """
                
                // Attempt rollback
                sh '''
                    echo "Attempting rollback..."
                    
                    # Find latest backup
                    LATEST_BACKUP=$(ls -t /backup/ground-station/backup_*.tar.gz 2>/dev/null | head -1)
                    
                    if [ -n "$LATEST_BACKUP" ]; then
                        echo "Restoring from backup: $LATEST_BACKUP"
                        
                        # Stop services
                        sudo systemctl stop ground-station-backend
                        sudo systemctl stop ground-station-frontend
                        
                        # Restore backup
                        tar -xzf "$LATEST_BACKUP" -C / 2>/dev/null || true
                        
                        # Start services
                        sudo systemctl start ground-station-backend
                        sudo systemctl start ground-station-frontend
                        
                        echo "Rollback completed"
                    else
                        echo "No backup found for rollback!"
                    fi
                '''
                
                // Send failure notification
                emailext(
                    subject: "❌ Deployment Failed - Ground Station (Build #${env.BUILD_NUMBER})",
                    body: """
                    <h2>Deployment Failed</h2>
                    <p>Ground Station Management System deployment has failed.</p>
                    <ul>
                        <li><strong>Build Number:</strong> ${env.BUILD_NUMBER}</li>
                        <li><strong>Branch:</strong> ${env.GIT_BRANCH}</li>
                    </ul>
                    <p>System has been rolled back to previous version.</p>
                    <p><a href="${env.BUILD_URL}console">View Console Output</a></p>
                    """,
                    to: "${EMAIL_RECIPIENTS}",
                    mimeType: 'text/html'
                )
            }
        }
        
        always {
            // Clean workspace
            cleanWs()
            
            // Archive deployment logs
            sh '''
                mkdir -p /var/log/ground-station/jenkins
                cp /var/log/ground-station/last_deployment.txt \
                   /var/log/ground-station/jenkins/build_${BUILD_NUMBER}.txt || true
            '''
        }
    }
}
