from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
import joblib
import os
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
    yield
    models.clear()

app = FastAPI(title="Blood Bank Optimizer API", lifespan=lifespan)

def validate_ids(hospital_id: str = None, blood_type: str = None):
    if hospital_id and hospital_id not in VALID_HOSPITALS:
        raise HTTPException(status_code=422, detail=f"Invalid hospital_id: {hospital_id}")
    if blood_type and blood_type not in VALID_BLOOD_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid blood_type: {blood_type}")

@app.get("/health")
def health():
    return {"status": "healthy", "models_loaded": list(models.keys())}

@app.get("/forecast")
def get_forecast(hospital_id: str, blood_type: str):
    validate_ids(hospital_id, blood_type)
    
    df = models['features']
    # Get latest features for this specific series
    latest = df[(df['hospital_id'] == hospital_id) & (df['blood_type'] == blood_type)].tail(1)
    
    if latest.empty:
        raise HTTPException(status_code=404, detail="No feature data found for this series")
    
    # Prepare features for model
    X = latest.drop(columns=['date', 'units_issued', 'hospital_id', 'blood_type'])
    cat_features = ['day_of_week', 'month', 'is_weekend', 'is_holiday', 'season', 'outbreak_active', 'donation_drive_active']
    for col in cat_features:
        X[col] = X[col].astype('category')
        
    next_day_pred = float(models['forecast'].predict(X)[0])
    
    return {
        "hospital_id": hospital_id,
        "blood_type": blood_type,
        "next_day_demand": round(next_day_pred, 2),
        "seven_day_forecast": round(next_day_pred * 7, 2), # Heuristic per optimization logic
        "forecast_date": str(latest['date'].values[0])
    }

@app.get("/expiry-risk")
def get_expiry_risk(hospital_id: str, blood_type: str):
    validate_ids(hospital_id, blood_type)
    
    df = models['batches']
    # Get unexpired batches for this hospital/BT
    today = pd.to_datetime("2024-12-30") # Latest date in our dataset context
    active_batches = df[(df['hospital_id'] == hospital_id) & 
                        (df['blood_type'] == blood_type) & 
                        (pd.to_datetime(df['expiry_date']) > today)]
    
    if active_batches.empty:
        return {"at_risk_batches": []}

    # In a real app we would run the classifier here. 
    # For now, we'll return batches where predicted waste risk is high (placeholder logic or filter)
    # Let's just return the top 5 closest to expiry as "at risk" for the demo
    at_risk = active_batches.sort_values('expiry_date').head(5).fillna(value="").to_dict('records')
    
    return {
        "hospital_id": hospital_id,
        "blood_type": blood_type,
        "at_risk_count": len(at_risk),
        "batches": at_risk
    }

@app.get("/recommendation")
def get_hospital_recommendations(hospital_id: str):
    validate_ids(hospital_id=hospital_id)
    
    all_recs, date = get_recommendations()
    
    # Filter for the specific hospital (either as 'to' or 'hospital')
    my_recs = [r for r in all_recs if r.get('to') == hospital_id or r.get('hospital') == hospital_id]
    
    return {
        "hospital_id": hospital_id,
        "date": str(date.date()),
        "recommendations": my_recs
    }
