from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict
import pandas as pd
import numpy as np
import io
import json
import hashlib
import time

from models.outlier_detection import DynamicOutlierDetector, compute_detection_score
from models.drift_predictor import TimeSeriesDriftPredictor
from models.sample_data import generate_flat_data

app = FastAPI(
    title="ISRO Burn-In Anomaly Detection System",
    description="AI-Driven Anomaly Detection in Component Burn-In & Screening - SIH 2026",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# In-memory stores
USERS_DB = {
    "admin@isro.gov.in": {
        "password": hashlib.sha256("Admin@123!".encode()).hexdigest(),
        "name": "Admin User",
        "role": "admin"
    },
    "qa@isro.gov.in": {
        "password": hashlib.sha256("Qa@123!".encode()).hexdigest(),
        "name": "QA Inspector",
        "role": "qa_inspector"
    },
    "engineer@isro.gov.in": {
        "password": hashlib.sha256("Eng@123!".encode()).hexdigest(),
        "name": "Engineer",
        "role": "engineer"
    }
}

TOKENS_DB = {}
detector = DynamicOutlierDetector()
predictor = TimeSeriesDriftPredictor()
analysis_cache = {}


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "engineer"


class OutlierAnalysisRequest(BaseModel):
    lot_id: Optional[str] = None
    z_threshold: float = 1.5
    iqr_multiplier: float = 1.5
    absolute_limits: Optional[Dict[str, float]] = None


class DriftPredictRequest(BaseModel):
    component_id: Optional[str] = None
    param: str = "iddq"
    value_0h: float = 0.0
    value_24h: float = 0.0
    value_96h: Optional[float] = None


class ManualDataEntry(BaseModel):
    component_id: str
    lot_id: str
    measurements: Dict[str, float]


class BulkAnalysisRequest(BaseModel):
    data: List[ManualDataEntry]
    parametric_columns: List[str]
    z_threshold: float = 2.5


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if token not in TOKENS_DB:
        raise HTTPException(status_code=401, detail="Invalid token")
    return TOKENS_DB[token]


import re


def _validate_password(pw: str) -> None:
    """Validate password strength on registration."""
    if len(pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not re.search(r'[A-Z]', pw):
        raise HTTPException(status_code=400, detail="Password must contain an uppercase letter")
    if not re.search(r'[a-z]', pw):
        raise HTTPException(status_code=400, detail="Password must contain a lowercase letter")
    if not re.search(r'[0-9]', pw):
        raise HTTPException(status_code=400, detail="Password must contain a number")
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', pw):
        raise HTTPException(status_code=400, detail="Password must contain a special character (!@#$%^&*...)")


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    user = USERS_DB.get(request.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    if user["password"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = hashlib.sha256(f"{request.email}{time.time()}".encode()).hexdigest()
    TOKENS_DB[token] = {"email": request.email, "role": user["role"], "name": user["name"]}
    
    return {
        "token": token,
        "user": {
            "email": request.email,
            "name": user["name"],
            "role": user["role"]
        }
    }


@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    if request.email in USERS_DB:
        raise HTTPException(status_code=400, detail="Email already registered")

    _validate_password(request.password)
    
    USERS_DB[request.email] = {
        "password": hashlib.sha256(request.password.encode()).hexdigest(),
        "name": request.name,
        "role": request.role
    }
    
    return {"message": "Registration successful", "email": request.email, "role": request.role}


@app.get("/api/auth/me")
async def get_current_user(user=Depends(verify_token)):
    return {"user": user}


@app.post("/api/upload/csv")
async def upload_csv(file: UploadFile = File(...), user=Depends(verify_token)):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be CSV or Excel")
    
    try:
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        analysis_cache['uploaded_data'] = df
        analysis_cache['filename'] = file.filename
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns),
            "preview": df.head(10).to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")


@app.post("/api/upload/manual")
async def upload_manual(data: List[ManualDataEntry], user=Depends(verify_token)):
    records = []
    for entry in data:
        record = {
            'component_id': entry.component_id,
            'lot_id': entry.lot_id,
            **entry.measurements
        }
        records.append(record)
    
    df = pd.DataFrame(records)
    analysis_cache['uploaded_data'] = df
    
    return {
        "message": f"Uploaded {len(records)} components",
        "columns": list(df.columns),
        "preview": df.head(10).to_dict(orient='records')
    }


@app.get("/api/data/sample")
async def get_sample_data(user=Depends(verify_token)):
    df = generate_flat_data(n_components=200, n_lots=5, defect_rate=0.08)
    analysis_cache['uploaded_data'] = df
    
    return {
        "message": "Sample data generated",
        "rows": len(df),
        "columns": list(df.columns),
        "preview": df.head(20).to_dict(orient='records'),
        "lots": df['lot_id'].unique().tolist(),
        "defective_count": int(df['is_defective'].sum()),
        "total_count": len(df)
    }


@app.get("/api/data/stats")
async def get_data_stats(user=Depends(verify_token)):
    if 'uploaded_data' not in analysis_cache:
        return {"error": "No data loaded. Upload data or generate sample first."}
    
    df = analysis_cache['uploaded_data']
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    stats = {}
    for col in numeric_cols:
        stats[col] = {
            'mean': round(float(df[col].mean()), 4),
            'std': round(float(df[col].std()), 4),
            'min': round(float(df[col].min()), 4),
            'max': round(float(df[col].max()), 4),
            'median': round(float(df[col].median()), 4),
        }
    
    return {
        "total_components": len(df),
        "lots": df['lot_id'].nunique() if 'lot_id' in df.columns else 0,
        "column_stats": stats,
        "columns": list(df.columns)
    }


@app.post("/api/analysis/outlier")
async def run_outlier_analysis(request: OutlierAnalysisRequest, user=Depends(verify_token)):
    if 'uploaded_data' not in analysis_cache:
        raise HTTPException(status_code=400, detail="No data loaded")
    
    df = analysis_cache['uploaded_data']
    
    # Identify parametric columns (numeric, not IDs)
    exclude_cols = ['component_id', 'lot_id', 'is_defective', 'test_hour']
    parametric_cols = [c for c in df.select_dtypes(include=[np.number]).columns 
                       if c not in exclude_cols]
    
    if not parametric_cols:
        raise HTTPException(status_code=400, detail="No parametric columns found")
    
    # Configure detector
    detector.z_threshold = request.z_threshold
    detector.iqr_multiplier = request.iqr_multiplier
    
    if request.absolute_limits:
        detector.set_absolute_limits(request.absolute_limits)
    
    # Fit lot statistics
    lot_stats = detector.fit_lot_statistics(df, parametric_cols)
    
    # Analyze components
    results = detector.analyze_batch(df, parametric_cols)
    
    # Summary statistics
    classifications = {'PASS': 0, 'REVIEW': 0, 'REJECT': 0}
    risk_scores = []
    for r in results:
        classifications[r['classification']] = classifications.get(r['classification'], 0) + 1
        risk_scores.append(r['overall_risk_score'])
    
    summary = {
        'total_analyzed': len(results),
        'classifications': classifications,
        'avg_risk_score': round(float(np.mean(risk_scores)), 4) if risk_scores else 0,
        'max_risk_score': round(float(np.max(risk_scores)), 4) if risk_scores else 0,
    }

    # Anomaly Detection Score with catastrophic false-negative penalty (uses ground truth when available)
    detection_metrics = compute_detection_score(results, df)
    summary['detection_metrics'] = detection_metrics
    
    # Store results
    analysis_cache['outlier_results'] = results
    analysis_cache['outlier_summary'] = summary
    
    return {
        'summary': summary,
        'lot_statistics': {k: v for k, v in list(lot_stats.items())[:5]},
        'results': results,
        'total_results': len(results),
        'parametric_columns': parametric_cols
    }


@app.post("/api/analysis/drift-train")
async def train_drift_model(user=Depends(verify_token)):
    if 'uploaded_data' not in analysis_cache:
        raise HTTPException(status_code=400, detail="No data loaded")
    
    df = analysis_cache['uploaded_data']
    
    # Identify parameters
    params = []
    for prefix in ['iddq', 'leakage', 'delay', 'supply_current']:
        if f'{prefix}_0h' in df.columns and f'{prefix}_168h' in df.columns:
            params.append(prefix)
    
    if not params:
        raise HTTPException(status_code=400, detail="No parametric columns with time-series data found")
    
    predictor.train(df, params)

    # Populate drift accuracy/results so the dashboard reflects drift activity
    # right after training (not only after a batch prediction).
    all_results = []
    accuracy_metrics = {}
    for param in predictor.models.keys():
        col_0h = f'{param}_0h'
        col_24h = f'{param}_24h'
        col_96h = f'{param}_96h' if f'{param}_96h' in df.columns else None
        col_168h = f'{param}_168h' if f'{param}_168h' in df.columns else None
        results = predictor.predict_batch(df, param, col_0h, col_24h, col_96h, col_168h)
        for r in results:
            try:
                r['component_id'] = df.iloc[r['component_index']]['component_id']
                r['lot_id'] = df.iloc[r['component_index']].get('lot_id')
            except (IndexError, KeyError):
                pass
        all_results.extend(results)
        if col_168h and col_168h in df.columns:
            accuracy_metrics[param] = predictor.get_overall_accuracy(results)

    analysis_cache['drift_results'] = all_results
    analysis_cache['drift_accuracy'] = accuracy_metrics

    return {
        'message': 'Models trained successfully',
        'trained_parameters': params,
        'training_metrics': predictor.training_metrics,
        'safety_slopes': {k: round(v, 6) for k, v in predictor.safety_slopes.items()},
        'feature_importances': predictor.feature_importances,
        'accuracy_metrics': accuracy_metrics,
        'total_predictions': len(all_results)
    }


@app.post("/api/analysis/drift-predict")
async def predict_drift(request: DriftPredictRequest, user=Depends(verify_token)):
    result = predictor.predict(request.param, request.value_0h, request.value_24h,
                                request.value_96h)
    return result


@app.post("/api/analysis/drift-batch")
async def predict_drift_batch(user=Depends(verify_token)):
    if 'uploaded_data' not in analysis_cache:
        raise HTTPException(status_code=400, detail="No data loaded")
    
    df = analysis_cache['uploaded_data']
    
    all_results = []
    accuracy_metrics = {}
    
    for param in predictor.models.keys():
        col_0h = f'{param}_0h'
        col_24h = f'{param}_24h'
        col_96h = f'{param}_96h' if f'{param}_96h' in df.columns else None
        col_168h = f'{param}_168h' if f'{param}_168h' in df.columns else None
        
        results = predictor.predict_batch(df, param, col_0h, col_24h, col_96h, col_168h)
        for r in results:
            try:
                r['component_id'] = df.iloc[r['component_index']]['component_id']
                r['lot_id'] = df.iloc[r['component_index']].get('lot_id')
            except (IndexError, KeyError):
                pass
        all_results.extend(results)
        
        if col_168h and col_168h in df.columns:
            accuracy_metrics[param] = predictor.get_overall_accuracy(results)
    
    analysis_cache['drift_results'] = all_results
    analysis_cache['drift_accuracy'] = accuracy_metrics
    
    return {
        'total_predictions': len(all_results),
        'accuracy_metrics': accuracy_metrics,
        'results': all_results
    }


@app.get("/api/analysis/dashboard")
async def get_dashboard(user=Depends(verify_token)):
    dashboard = {
        'outlier': analysis_cache.get('outlier_summary', {}),
        'drift_accuracy': analysis_cache.get('drift_accuracy', {}),
        'data_info': {}
    }
    
    if 'uploaded_data' in analysis_cache:
        df = analysis_cache['uploaded_data']
        dashboard['data_info'] = {
            'total_components': len(df),
            'lots': df['lot_id'].nunique() if 'lot_id' in df.columns else 0,
            'has_ground_truth': 'is_defective' in df.columns
        }
        
        if 'outlier_results' in analysis_cache:
            results = analysis_cache['outlier_results']
            dashboard['outlier_distribution'] = {
                r['classification']: dashboard['outlier_distribution'].get(r['classification'], 0) + 1
                for r in results
            } if False else {}
            
            dist = {}
            for r in results:
                c = r['classification']
                dist[c] = dist.get(c, 0) + 1
            dashboard['outlier_distribution'] = dist
        
        if 'drift_results' in analysis_cache:
            results = analysis_cache['drift_results']
            rejected = sum(1 for r in results if r.get('recommendation') == 'REJECT')
            passed = sum(1 for r in results if r.get('recommendation') == 'PASS')
            dashboard['drift_distribution'] = {'REJECT': rejected, 'PASS': passed}
    
    return dashboard


@app.get("/api/analysis/explain/{component_id}")
async def get_component_explanation(component_id: str, user=Depends(verify_token)):
    if 'uploaded_data' not in analysis_cache:
        raise HTTPException(status_code=400, detail="No data loaded. Upload data and run analysis first.")

    df = analysis_cache['uploaded_data']
    matched = df[df['component_id'] == component_id]
    if matched.empty:
        raise HTTPException(status_code=404, detail="Component not found in uploaded data")

    row = matched.iloc[0]

    # Raw parametric values (0h / 24h / 96h / 168h)
    raw_values = {}
    for col in df.select_dtypes(include=[np.number]).columns:
        for suffix in ('_0h', '_24h', '_96h', '_168h'):
            if col.endswith(suffix):
                param = col[: -len(suffix)]
                raw_values.setdefault(param, {})[suffix] = round(float(row[col]), 4)
                break

    explanation = {
        'component_id': component_id,
        'lot_id': str(row.get('lot_id')) if 'lot_id' in df.columns else None,
        'is_defective': bool(row.get('is_defective', False)) if 'is_defective' in df.columns else None,
        'raw_values': raw_values,
    }

    # Module A full outlier analysis
    if 'outlier_results' in analysis_cache:
        for r in analysis_cache['outlier_results']:
            if r.get('component_id') == component_id:
                explanation['outlier_analysis'] = r
                break

    # Module B drift predictions for this component across all parameters
    drift_analysis = {}
    if 'drift_results' in analysis_cache:
        for r in analysis_cache['drift_results']:
            comp_idx = r.get('component_index')
            if comp_idx is None or comp_idx >= len(df):
                continue
            try:
                if df.iloc[comp_idx]['component_id'] == component_id:
                    drift_analysis[r.get('parameter')] = r
            except (IndexError, KeyError):
                continue
    if drift_analysis:
        explanation['drift_analysis'] = drift_analysis

    return explanation


@app.post("/api/analysis/comprehensive")
async def run_comprehensive_analysis(request: OutlierAnalysisRequest, user=Depends(verify_token)):
    if 'uploaded_data' not in analysis_cache:
        raise HTTPException(status_code=400, detail="No data loaded")
    
    df = analysis_cache['uploaded_data']
    
    exclude_cols = ['component_id', 'lot_id', 'is_defective', 'test_hour']
    parametric_cols = [c for c in df.select_dtypes(include=[np.number]).columns 
                       if c not in exclude_cols]
    
    # Run Module A
    detector.z_threshold = request.z_threshold
    detector.iqr_multiplier = request.iqr_multiplier
    if request.absolute_limits:
        detector.set_absolute_limits(request.absolute_limits)
    
    lot_stats = detector.fit_lot_statistics(df, parametric_cols)
    outlier_results = detector.analyze_batch(df, parametric_cols)
    
    outlier_classifications = {'PASS': 0, 'REVIEW': 0, 'REJECT': 0}
    for r in outlier_results:
        outlier_classifications[r['classification']] += 1
    
    # Run Module B
    drift_params = []
    for prefix in ['iddq', 'leakage', 'delay', 'supply_current']:
        if f'{prefix}_0h' in df.columns and f'{prefix}_168h' in df.columns:
            drift_params.append(prefix)
    
    drift_accuracy = {}
    drift_summary = {'REJECT': 0, 'PASS': 0}
    
    if drift_params:
        predictor.train(df, drift_params)
        
        for param in drift_params:
            col_0h = f'{param}_0h'
            col_24h = f'{param}_24h'
            col_96h = f'{param}_96h' if f'{param}_96h' in df.columns else None
            col_168h = f'{param}_168h' if f'{param}_168h' in df.columns else None
            
            results = predictor.predict_batch(df, param, col_0h, col_24h, col_96h, col_168h)
            
            for r in results:
                rec = r.get('recommendation', 'PASS')
                drift_summary[rec] = drift_summary.get(rec, 0) + 1
            
            if col_168h:
                drift_accuracy[param] = predictor.get_overall_accuracy(results)
    
    # Combined verdict
    combined_results = []
    for i, outlier_r in enumerate(outlier_results):
        comp_result = {
            'component_id': outlier_r.get('component_id', f'COMP-{i}'),
            'lot_id': outlier_r.get('lot_id', ''),
            'outlier_classification': outlier_r['classification'],
            'outlier_risk': outlier_r['overall_risk_score'],
            'drift_recommendation': None,
            'combined_verdict': outlier_r['classification']
        }
        
        combined_results.append(comp_result)
    
    # Anomaly Detection Score with catastrophic false-negative penalty
    detection_metrics = compute_detection_score(outlier_results, df)

    summary = {
        'total_components': len(df),
        'module_a': {
            'classifications': outlier_classifications,
            'avg_risk': round(float(np.mean([r['overall_risk_score'] for r in outlier_results])), 4),
            'detection_metrics': detection_metrics
        },
        'module_b': {
            'drift_distribution': drift_summary,
            'accuracy': drift_accuracy
        }
    }
    
    analysis_cache['combined_results'] = combined_results
    analysis_cache['outlier_results'] = outlier_results
    analysis_cache['outlier_summary'] = {
        'total_analyzed': len(outlier_results),
        'classifications': outlier_classifications,
        'avg_risk_score': round(float(np.mean([r['overall_risk_score'] for r in outlier_results])), 4),
        'detection_metrics': detection_metrics
    }
    
    return {
        'summary': summary,
        'results': combined_results
    }


@app.get("/api/system/health")
async def health_check():
    return {
        "status": "healthy",
        "system": "ISRO Burn-In Anomaly Detection System",
        "version": "1.0.0",
        "data_loaded": 'uploaded_data' in analysis_cache,
        "models_trained": len(predictor.models) > 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
