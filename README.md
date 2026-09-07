# MAVERICK: ISRO Burn-In Anomaly Detection System

**AI-Driven Anomaly Detection in Component Burn-In & Screening**
Smart Automation | Department of Space / Indian Space Research Organisation | SIH 2026

## Problem Statement

Traditional screening relies on static parametric pass/fail limits. However, *latent defects* — components that pass absolute limits but exhibit subtle, anomalous drift over time — often escape into final payloads, leading to catastrophic field failures.

## Solution Overview

A predictive ML system that analyzes time-series parametric data (Iddq, leakage currents, propagation delays measured at 0h, 24h, 96h, 168h) to detect anomalous components.

### Module A: Dynamic Outlier Detection System
Static limits catch obvious failures. This system develops a **dynamic** outlier detection system where each component is compared against its lot's statistical distribution:
- Lot-relative mean/std analysis (Z-Score detection, default **1.5σ** — high-sensitivity screening)
- IQR-based dynamic bounds (default 1.5× IQR)
- Absolute datasheet limit checking
- Majority-vote consensus across 3 detection methods
- Example: Lot average leakage = 10µA → a part showing 45µA is flagged even if the absolute limit is 50µA
- **Anomaly Detection Score** (confusion-matrix based, false negatives penalized at 10×): verified 100% recall, 0 escaped parts, score 81% on reference dataset

### Module B: Time-Series Drift Predictor
Predictive regression model that takes Value_0h and Value_24h as inputs and forecasts Value_168h:
- Ridge, Random Forest, and Gradient Boosting regression
- Automatic model selection with cross-validation scoring
- Safety slope threshold calculation from historical drift distribution
- Early rejection flagging when predicted drift exceeds safety slope

## Tech Stack

### Frontend
- **Next.js 14** (App Router) + Tailwind CSS
- Real-time dashboard with dark mission-control UI
- ISRO (Indian Space Research Organisation) branding

### Backend
- **Python FastAPI** with server-side ML
- scikit-learn models (RandomForest / GradientBoosting / Ridge)
- JWT-like token authentication

## Getting Started

### Quick Start (Windows)

Run `start.bat` which:
1. Installs Python dependencies
2. Starts FastAPI backend on `http://localhost:8001`
3. Installs npm dependencies (if needed)
4. Starts Next.js frontend on `http://localhost:3000`
5. Opens the browser

### Manual Start

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@isro.gov.in | Admin@123! |
| QA Inspector | qa@isro.gov.in | Qa@123! |
| Engineer | engineer@isro.gov.in | Eng@123! |

> New registrations require a strong password: minimum 8 characters with uppercase, lowercase, number, and special character.

## Using The System

1. **Login** with a demo account
2. **Data Ingress** → Generate sample data (or upload a CSV/Excel file of burn-in measurements)
3. **Analysis Center** → Run analysis:
   - **Module A**: Dynamic Outlier Detection
   - **Module B**: Batch drift prediction to get MAE/R2 metrics
   - **Comprehensive**: Full pipeline in one click
4. **Explainability** → Click "Explain" on any component to see human-readable reasons

## Data Format

The system expects CSV/Excel columns like:
- `component_id`, `lot_id`
- `iddq_0h`, `iddq_24h`, `iddq_96h`, `iddq_168h`
- `leakage_0h`, `leakage_24h`, `leakage_96h`, `leakage_168h`
- `delay_0h`, `delay_24h`, `delay_96h`, `delay_168h`
- `supply_current_0h`, ..., `supply_current_168h`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login & get token |
| POST | `/api/auth/register` | Create account |
| POST | `/api/upload/csv` | Upload CSV/Excel |
| POST | `/api/upload/manual` | Manual data entry |
| GET | `/api/data/sample` | Generate sample data |
| POST | `/api/analysis/outlier` | Module A analysis |
| POST | `/api/analysis/drift-train` | Train Module B models |
| POST | `/api/analysis/drift-batch` | Batch drift prediction |
| POST | `/api/analysis/drift-predict` | Single drift prediction |
| POST | `/api/analysis/comprehensive` | Full pipeline |
| GET | `/api/analysis/explain/{id}` | Component explainability |

## Evaluation Metrics Addressed

1. **Anomaly Detection Score**: False negatives minimized via multi-method consensus and a 1.5σ dynamic threshold; measured against ground truth with false negatives penalized at 10× (verified: 0 escaped parts in reference data)
2. **Drift Prediction Accuracy**: MAE reported per parameter (e.g., iddq MAE 0.35µA, leakage MAE 0.19µA across 200 components)
3. **Explainability**: Every classification includes step-by-step reasoning and feature contribution analysis for QA inspectors

## Project Structure

```
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── requirements.txt
│   ├── models/
│   │   ├── outlier_detection.py   # Module A: Dynamic Outlier Detection
│   │   ├── drift_predictor.py     # Module B: Drift Predictor
│   │   └── sample_data.py         # Synthetic burn-in data generator
│   └── routers/
└── frontend/
    ├── app/
    │   ├── page.js                # Landing page
    │   ├── login/                 # Authentication
    │   ├── dashboard/             # Mission control dashboard
    │   ├── upload/                # Data ingestion
    │   └── analysis/              # Module A + B analysis
    ├── components/
    │   └── Sidebar.js
    └── lib/
        └── api.js                 # API client
```