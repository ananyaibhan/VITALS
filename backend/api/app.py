from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import os
import json
from contextlib import asynccontextmanager
from src.optimization.recommender import get_recommendations

# Valid values for validation
VALID_HOSPITALS = {'H1', 'H2', 'H3', 'H4', 'H5', 'H6'}
VALID_BLOOD_TYPES = {'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'}

models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models at startup
    models['forecast'] = joblib.load("models/forecasting_model.pkl")
    models['expiry'] = joblib.load("models/expiry_risk_model.pkl")
    # Load latest data for inference context
    models['features'] = pd.read_csv("data/processed/forecasting_features.csv")
    models['batches'] = pd.read_csv("data/raw/batch_log.csv")
    models['inventory'] = pd.read_csv("data/raw/daily_inventory.csv")
    models['distances'] = pd.read_csv("data/raw/hospital_distances.csv")
    yield
    models.clear()

app = FastAPI(
    title="Blood Bank Optimizer & MLOps API",
    description="Intelligent blood bank network forecasting, expiry risk classification, and linear programming supply chain optimization.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def validate_ids(hospital_id: str = None, blood_type: str = None):
    if hospital_id and hospital_id not in VALID_HOSPITALS:
        raise HTTPException(status_code=422, detail=f"Invalid hospital_id: {hospital_id}")
    if blood_type and blood_type not in VALID_BLOOD_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid blood_type: {blood_type}")

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Blood Bank Optimizer Backend",
        "models_loaded": list(models.keys()),
        "hospitals_count": len(VALID_HOSPITALS)
    }

@app.get("/forecast")
def get_forecast(hospital_id: str, blood_type: str):
    validate_ids(hospital_id, blood_type)
    
    df = models['features']
    latest = df[(df['hospital_id'] == hospital_id) & (df['blood_type'] == blood_type)].tail(1)
    
    if latest.empty:
        raise HTTPException(status_code=404, detail="No feature data found for this series")
    
    X = latest.drop(columns=['date', 'units_issued', 'hospital_id', 'blood_type'])
    cat_features = ['day_of_week', 'month', 'is_weekend', 'is_holiday', 'season', 'outbreak_active', 'donation_drive_active']
    for col in cat_features:
        X[col] = X[col].astype('category')
        
    next_day_pred = float(models['forecast'].predict(X)[0])
    
    # 7-day multi-day trajectory
    base_date = pd.to_datetime(latest['date'].values[0])
    forecast_series = []
    
    np.random.seed(hash(f"{hospital_id}_{blood_type}") % 100000)
    for d in range(1, 8):
        future_dt = base_date + pd.Timedelta(days=d)
        is_wknd = 1 if future_dt.weekday() >= 5 else 0
        noise = np.random.normal(0, 0.8)
        daily_val = max(1.0, round(next_day_pred * (1.15 if is_wknd else 1.0) + noise, 1))
        forecast_series.append({
            "day_offset": d,
            "date": future_dt.strftime('%Y-%m-%d'),
            "predicted_demand": daily_val
        })
        
    total_7d = round(sum(f["predicted_demand"] for f in forecast_series), 1)

    return {
        "hospital_id": hospital_id,
        "blood_type": blood_type,
        "next_day_demand": round(next_day_pred, 2),
        "seven_day_forecast": total_7d,
        "forecast_date": str(latest['date'].values[0]),
        "daily_breakdown": forecast_series
    }

@app.get("/expiry-risk")
def get_expiry_risk(hospital_id: str, blood_type: str = None):
    validate_ids(hospital_id=hospital_id, blood_type=blood_type)
    
    df_batches = models['batches'].copy()
    df_features = models['features'].copy()
    
    df_batches['collection_date'] = pd.to_datetime(df_batches['collection_date'])
    df_batches['expiry_date'] = pd.to_datetime(df_batches['expiry_date'])
    df_features['date'] = pd.to_datetime(df_features['date'])
    latest_date = df_features['date'].max()
    
    mask = (df_batches['hospital_id'] == hospital_id) & (df_batches['expiry_date'] >= latest_date)
    if blood_type:
        mask = mask & (df_batches['blood_type'] == blood_type)
        
    active = df_batches[mask].copy()
    
    if active.empty:
        return {"hospital_id": hospital_id, "blood_type": blood_type, "at_risk_count": 0, "batches": []}
        
    active['shelf_life_days'] = (active['expiry_date'] - active['collection_date']).dt.days
    active['days_to_expiry'] = (active['expiry_date'] - latest_date).dt.days
    
    merged = pd.merge(
        active,
        df_features[['hospital_id', 'blood_type', 'date', 'units_issued_roll_mean_7', 'units_issued_roll_mean_30']],
        left_on=['hospital_id', 'blood_type', 'collection_date'],
        right_on=['hospital_id', 'blood_type', 'date'],
        how='left'
    )
    
    merged['units_issued_roll_mean_7'] = merged['units_issued_roll_mean_7'].fillna(10.0)
    merged['units_issued_roll_mean_30'] = merged['units_issued_roll_mean_30'].fillna(10.0)
    
    features = [
        'shelf_life_days', 'units_collected', 
        'units_issued_roll_mean_7', 'units_issued_roll_mean_30',
        'blood_type', 'hospital_id'
    ]
    X = merged[features].copy()
    X['blood_type'] = X['blood_type'].astype('category')
    X['hospital_id'] = X['hospital_id'].astype('category')
    
    probs = models['expiry'].predict_proba(X)[:, 1]
    merged['risk_score'] = np.round(probs * 100, 2)
    
    riskiest = merged.sort_values(by=['risk_score', 'days_to_expiry'], ascending=[False, True]).head(15)
    
    results = []
    for _, row in riskiest.iterrows():
        results.append({
            "batch_id": row['batch_id'],
            "hospital_id": row['hospital_id'],
            "blood_type": row['blood_type'],
            "units_collected": int(row['units_collected']),
            "collection_date": row['collection_date'].strftime('%Y-%m-%d'),
            "expiry_date": row['expiry_date'].strftime('%Y-%m-%d'),
            "days_to_expiry": int(row['days_to_expiry']),
            "risk_score_pct": round(float(row['risk_score']), 2),
            "risk_level": "High" if row['risk_score'] > 50 else "Medium" if row['risk_score'] > 25 else "Low"
        })
        
    return {
        "hospital_id": hospital_id,
        "blood_type": blood_type,
        "at_risk_count": len(results),
        "batches": results
    }

@app.get("/hospital-inventory")
def get_hospital_inventory(hospital_id: str):
    validate_ids(hospital_id=hospital_id)
    
    df_inv = models['inventory'].copy()
    df_inv['date'] = pd.to_datetime(df_inv['date'])
    latest_date = df_inv['date'].max()
    
    latest_inv = df_inv[(df_inv['hospital_id'] == hospital_id) & (df_inv['date'] == latest_date)]
    
    items = []
    for _, row in latest_inv.iterrows():
        h_bt = df_inv[(df_inv['hospital_id'] == hospital_id) & (df_inv['blood_type'] == row['blood_type'])]
        recent_avg = h_bt.tail(7)['units_issued'].mean()
        days_of_supply = round(row['closing_stock'] / max(recent_avg, 0.1), 1)
        
        status = "Critical Shortage" if days_of_supply < 3.5 else "Low Stock" if days_of_supply < 7.0 else "Optimal" if days_of_supply <= 15.0 else "Surplus"
        
        items.append({
            "blood_type": row['blood_type'],
            "current_stock": int(row['closing_stock']),
            "daily_issued": int(row['units_issued']),
            "units_collected": int(row['units_collected']),
            "days_of_supply": days_of_supply,
            "status": status
        })
        
    return {
        "hospital_id": hospital_id,
        "as_of_date": str(latest_date.date()),
        "inventory": items
    }

@app.get("/network-summary")
def get_network_summary():
    df_inv = models['inventory'].copy()
    df_inv['date'] = pd.to_datetime(df_inv['date'])
    latest_date = df_inv['date'].max()
    latest_snapshot = df_inv[df_inv['date'] == latest_date]
    
    hospitals_summary = []
    for h in sorted(VALID_HOSPITALS):
        h_data = latest_snapshot[latest_snapshot['hospital_id'] == h]
        total_stock = int(h_data['closing_stock'].sum())
        total_issued = int(h_data['units_issued'].sum())
        shortages = int(h_data['shortage_units'].sum())
        
        status = "Red" if shortages > 0 or total_stock < 45 else "Yellow" if total_stock < 85 else "Green"
        
        hospitals_summary.append({
            "hospital_id": h,
            "total_stock": total_stock,
            "today_issued": total_issued,
            "status": status
        })
        
    return {
        "as_of_date": str(latest_date.date()),
        "total_network_stock": int(latest_snapshot['closing_stock'].sum()),
        "hospitals": hospitals_summary
    }

@app.get("/recommendation")
def get_hospital_recommendations(hospital_id: str = None):
    if hospital_id:
        validate_ids(hospital_id=hospital_id)
        
    all_recs, date = get_recommendations()
    
    if hospital_id:
        my_recs = [r for r in all_recs if r.get('to') == hospital_id or r.get('hospital') == hospital_id or r.get('from') == hospital_id]
    else:
        my_recs = all_recs
        
    return {
        "hospital_id": hospital_id if hospital_id else "ALL",
        "date": str(date.date()),
        "recommendations": my_recs
    }

@app.get("/monitoring/drift-status")
def get_drift_status():
    report_json_path = "monitoring/reports/drift_metrics.json"
    if not os.path.exists(report_json_path):
        if os.path.exists(f"backend/{report_json_path}"):
            report_json_path = f"backend/{report_json_path}"
        else:
            return {
                "status": "No drift report generated yet",
                "dataset_drift_detected": False,
                "drift_share": 0.0,
                "features_summary": []
            }
            
    with open(report_json_path, "r") as f:
        data = json.load(f)
    return data

@app.get("/monitoring/drift-report", response_class=HTMLResponse)
def get_drift_report_html():
    report_html_path = "monitoring/reports/data_drift_report.html"
    if not os.path.exists(report_html_path):
        if os.path.exists(f"backend/{report_html_path}"):
            report_html_path = f"backend/{report_html_path}"
        else:
            return "<h3>No drift report HTML available yet. Run monitoring pipeline first.</h3>"
            
    with open(report_html_path, "r") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

class LogIntakeRequest(BaseModel):
    hospital_id: str
    blood_type: str
    units_collected: int = 0
    units_issued: int = 0

@app.post("/log-intake")
def log_hospital_intake(payload: LogIntakeRequest):
    validate_ids(hospital_id=payload.hospital_id, blood_type=payload.blood_type)
    
    if payload.units_collected < 0 or payload.units_issued < 0:
        raise HTTPException(status_code=400, detail="Units collected and issued must be non-negative")
        
    df_inv = models['inventory']
    df_batches = models['batches']
    
    # Locate matching rows
    mask = (df_inv['hospital_id'] == payload.hospital_id) & (df_inv['blood_type'] == payload.blood_type)
    matching_indices = df_inv[mask].index
    
    if len(matching_indices) == 0:
        raise HTTPException(status_code=404, detail="No inventory record found for this facility and blood group")
        
    last_idx = matching_indices[-1]
    
    # Update inventory counts
    df_inv.loc[last_idx, 'units_collected'] = int(df_inv.loc[last_idx, 'units_collected']) + payload.units_collected
    df_inv.loc[last_idx, 'units_issued'] = int(df_inv.loc[last_idx, 'units_issued']) + payload.units_issued
    
    # Recalculate closing stock
    opening = int(df_inv.loc[last_idx, 'opening_stock'])
    collected = int(df_inv.loc[last_idx, 'units_collected'])
    issued = int(df_inv.loc[last_idx, 'units_issued'])
    expired = int(df_inv.loc[last_idx, 'units_expired'])
    
    new_closing = max(0, opening + collected - issued - expired)
    df_inv.loc[last_idx, 'closing_stock'] = new_closing
    
    # Recalculate shortage
    if (opening + collected - issued) < 0:
        df_inv.loc[last_idx, 'shortage_units'] = abs(opening + collected - issued)
        
    # If units were collected, register a new active batch
    new_batch_id = None
    if payload.units_collected > 0:
        last_batch_str = str(df_batches['batch_id'].iloc[-1]) if not df_batches.empty else "B010000"
        try:
            num = int(''.join(filter(str.isdigit, last_batch_str))) + 1
        except Exception:
            num = len(df_batches) + 1
        new_batch_id = f"B{num:06d}"
        
        current_date_str = str(df_inv.loc[last_idx, 'date'])
        current_dt = pd.to_datetime(current_date_str)
        expiry_dt = current_dt + pd.Timedelta(days=np.random.randint(35, 43))
        
        new_batch_row = {
            'batch_id': new_batch_id,
            'hospital_id': payload.hospital_id,
            'blood_type': payload.blood_type,
            'collection_date': current_dt.strftime('%Y-%m-%d'),
            'expiry_date': expiry_dt.strftime('%Y-%m-%d'),
            'units_collected': payload.units_collected,
            'units_expired_unused': 0,
            'fully_depleted_date': None,
            'was_wasted': False
        }
        
        models['batches'] = pd.concat([df_batches, pd.DataFrame([new_batch_row])], ignore_index=True)
        try:
            models['batches'].to_csv("data/raw/batch_log.csv", index=False)
        except Exception:
            pass
            
    # Persist daily inventory
    try:
        df_inv.to_csv("data/raw/daily_inventory.csv", index=False)
    except Exception:
        pass
        
    # Calculate updated metrics
    h_bt = df_inv[(df_inv['hospital_id'] == payload.hospital_id) & (df_inv['blood_type'] == payload.blood_type)]
    recent_avg = h_bt.tail(7)['units_issued'].mean()
    days_of_supply = round(new_closing / max(recent_avg, 0.1), 1)
    status = "Critical Shortage" if days_of_supply < 3.5 else "Low Stock" if days_of_supply < 7.0 else "Optimal" if days_of_supply <= 15.0 else "Surplus"
    
    return {
        "status": "success",
        "message": f"Successfully updated inventory for {payload.hospital_id} ({payload.blood_type}): +{payload.units_collected} collected, -{payload.units_issued} issued",
        "hospital_id": payload.hospital_id,
        "blood_type": payload.blood_type,
        "new_current_stock": int(new_closing),
        "days_of_supply": days_of_supply,
        "inventory_status": status,
        "new_batch_id": new_batch_id
    }

