# fitmi-app
Self-hosted web app for daily InBody and Glucose measurements with OCR auto-fill

# 🏥 FitMi - Health Data Collection App

A self-hosted web application for collecting daily InBody and Glucose measurements with **automatic OCR extraction** from screenshots.

## 🎯 Features

✅ **Automatic OCR Extraction** - Extract data from InBody scale and Glucose meter screenshots automatically
✅ **Multi-Measurement Support** - InBody (15+ metrics) and Glucose readings
✅ **Comparative Analysis** - Track changes between measurements over time
✅ **Data Visualization** - Charts and graphs showing trends
✅ **Docker Deployment** - One-command deployment on any system
✅ **Portainer Compatible** - Manage via visual dashboard
✅ **PostgreSQL Database** - Secure persistent data storage

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Debian/Linux system (or WSL on Windows)

### Installation

```bash
# Clone repository
git clone https://github.com/egypsiano/fitmi-app.git
cd fitmi-app

# Create environment file
cat > .env <<EOF
DB_PASSWORD=$(openssl rand -base64 16)
JWT_SECRET=$(openssl rand -base64 32)
EOF

# Start application
docker-compose up -d
