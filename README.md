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

Access

    Web App: http://localhost:3001
    API: http://localhost:3000
    Database: localhost:5432

📖 Usage

    Take a screenshot of your InBody scale or Glucose meter
    Upload to FitMi via web interface
    OCR automatically extracts all measurements (10-30 seconds)
    Review and edit extracted data if needed
    Save to database - comparisons generated automatically
    View trends in graphs and charts

🔧 API Endpoints
OCR Extraction

    POST /api/ocr/auto - Auto-detect & extract
    POST /api/ocr/inbody - Extract InBody data
    POST /api/ocr/glucose - Extract Glucose data

Data Management

    POST /api/inbody/save - Save InBody record
    GET /api/inbody/:startDate/:endDate - Get InBody records
    POST /api/glucose/save - Save Glucose record
    GET /api/glucose/:startDate/:endDate - Get Glucose records

Comparison

    GET /api/inbody/compare/:startDate/:endDate - Compare InBody changes

🐳 Docker Management
View Logs
bash

docker-compose logs -f backend

Restart Services
bash

docker-compose restart

Stop All Services
bash

docker-compose down

Full Reset
bash

docker-compose down -v
docker-compose up -d

# Start application
docker-compose up -d
