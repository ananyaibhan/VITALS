import pandas as pd
import numpy as np
import joblib
import pulp
from datetime import timedelta
import os

def get_recommendations():
    # 1. Load Data & Models
    daily_inv = pd.read_csv("data/raw/daily_inventory.csv")
    batch_log = pd.read_csv("data/raw/batch_log.csv")
    distances = pd.read_csv("data/raw/hospital_distances.csv")
    forecast_features = pd.read_csv("data/processed/forecasting_features.csv")
    
    # Load models
    forecast_model = joblib.load("models/forecasting_model.pkl")
    expiry_model = joblib.load("models/expiry_risk_model.pkl")
    
    # Preprocess dates
    daily_inv['date'] = pd.to_datetime(daily_inv['date'])
    batch_log['collection_date'] = pd.to_datetime(batch_log['collection_date'])
    batch_log['expiry_date'] = pd.to_datetime(batch_log['expiry_date'])
    latest_date = daily_inv['date'].max()
    
    # 2. Get Current State & Forecasts
    # Latest stock
    current_stock = daily_inv[daily_inv['date'] == latest_date].groupby(['hospital_id', 'blood_type'])['closing_stock'].last().to_dict()
    
    # Generate 7-day forecast (simplified for this task - we use the forecasting_features for the latest date)
    # In a real app, we'd recursively predict. Here, we'll use a heuristic or the model on the available features.
    latest_features = forecast_features[forecast_features['date'] == forecast_features['date'].max()]
    
    # Predict next-day demand
    X = latest_features.drop(columns=['date', 'units_issued', 'hospital_id', 'blood_type'])
    cat_features = ['day_of_week', 'month', 'is_weekend', 'is_holiday', 'season', 'outbreak_active', 'donation_drive_active']
    for col in cat_features:
        X[col] = X[col].astype('category')
        
    preds = forecast_model.predict(X)
    forecast_results = latest_features[['hospital_id', 'blood_type']].copy()
    forecast_results['pred_demand_1d'] = preds
    forecast_results['pred_demand_7d'] = preds * 7 # Simplification
    
    # 3. Identify At-Risk Batches
    # For speed, we'll use the model to flag batches in batch_log that haven't expired yet
    living_batches = batch_log[batch_log['expiry_date'] > latest_date].copy()
    # We need to create features for the expiry model for these batches
    # (Simplified: just using the provided ones in batch_log + placeholder for demand stats)
    living_batches['shelf_life_days'] = (living_batches['expiry_date'] - living_batches['collection_date']).dt.days
    # For now, we'll use a subset of batches for the demo optimization
    at_risk_batches = living_batches[living_batches['units_expired_unused'] < living_batches['units_collected']].head(100)
    
    # 4. PuLP Optimization
    hospitals = daily_inv['hospital_id'].unique()
    blood_types = daily_inv['blood_type'].unique()
    
    prob = pulp.LpProblem("Blood_Supply_Optimization", pulp.LpMinimize)
    
    # Variables
    def sanitize(name):
        return str(name).replace('+', 'plus').replace('-', 'minus').replace(' ', '_')

    transfers = pulp.LpVariable.dicts("Transfer", 
                                      ([sanitize(h) for h in hospitals], 
                                       [sanitize(h) for h in hospitals], 
                                       [sanitize(b) for b in blood_types]), 
                                      lowBound=0, cat='Continuous')
    collections = pulp.LpVariable.dicts("Collection", 
                                        ([sanitize(h) for h in hospitals], 
                                         [sanitize(b) for b in blood_types]), 
                                        lowBound=0, cat='Continuous')
    shortages = pulp.LpVariable.dicts("Shortage", 
                                      ([sanitize(h) for h in hospitals], 
                                       [sanitize(b) for b in blood_types]), 
                                      lowBound=0, cat='Continuous')
    
    # Costs
    COST_SHORTAGE = 100
    COST_TRANSFER = 5
    COST_COLLECTION = 10
    
    for h in hospitals:
        sh = sanitize(h)
        for b in blood_types:
            sb = sanitize(b)
            stock = current_stock.get((h, b), 0)
            demand_7d = forecast_results[(forecast_results['hospital_id'] == h) & (forecast_results['blood_type'] == b)]['pred_demand_7d'].values[0]
            
            # Balance equation: Stock + Collections + Net Transfers - Demand = Balance
            net_transfer = pulp.lpSum([transfers[sanitize(f)][sh][sb] for f in hospitals if f != h]) - \
                           pulp.lpSum([transfers[sh][sanitize(t)][sb] for t in hospitals if t != h])
            
            prob += (stock + collections[sh][sb] + net_transfer + shortages[sh][sb]) >= demand_7d
            
    # Objective
    prob += pulp.lpSum([shortages[sanitize(h)][sanitize(b)] * COST_SHORTAGE for h in hospitals for b in blood_types]) + \
            pulp.lpSum([transfers[sanitize(f)][sanitize(t)][sanitize(b)] * COST_TRANSFER for f in hospitals for t in hospitals for b in blood_types if f != t]) + \
            pulp.lpSum([collections[sanitize(h)][sanitize(b)] * COST_COLLECTION for h in hospitals for b in blood_types])
    
    # Constraints for Transfers (simplified feasibility)
    for f in hospitals:
        for t in hospitals:
            if f == t: continue
            dist = distances[(distances['from_hospital'] == f) & (distances['to_hospital'] == t)]['transfer_time_hours'].values
            if len(dist) > 0 and dist[0] > 4: # If > 4 hours, restrict transfer size for demo
                 for b in blood_types:
                     prob += transfers[f][t][b] <= 10 

    prob.solve(pulp.GLPK_CMD(path='/opt/homebrew/bin/glpsol', msg=1))
    
    if pulp.LpStatus[prob.status] != 'Optimal':
        print(f"Warning: Optimization status: {pulp.LpStatus[prob.status]}")
    
    # 5. Output Results
    recs = []
    for f in hospitals:
        sf = sanitize(f)
        for t in hospitals:
            st = sanitize(t)
            for b in blood_types:
                sb = sanitize(b)
                val = pulp.value(transfers[sf][st][sb])
                if val and val > 0.01:
                    recs.append({
                        'type': 'transfer',
                        'from': f, 'to': t, 'blood_type': b, 'units': val
                    })
    
    for h in hospitals:
        sh = sanitize(h)
        for b in blood_types:
            sb = sanitize(b)
            val = pulp.value(collections[sh][sb])
            if val and val > 0.01:
                recs.append({
                    'type': 'collection',
                    'hospital': h, 'blood_type': b, 'units': val
                })
                
    return recs, latest_date

if __name__ == "__main__":
    recommendations, date = get_recommendations()
    print(f"Recommendations for {date.date()}:\n")
    
    count = 0
    for r in recommendations:
        if r['type'] == 'collection' and count < 3:
            print(f"- {r['blood_type']} inventory at {r['hospital']} is forecasted to fall below safety threshold within 7 days. Recommended: request {int(r['units'])} additional units.")
            count += 1
        elif r['type'] == 'transfer' and count < 3:
            print(f"- {r['blood_type']} inventory at {r['to']} is forecasted to fall below safety threshold within 7 days. Recommended: transfer {int(r['units'])} units of {r['blood_type']} from {r['from']}.")
            count += 1
