import pandas as pd
import numpy as np
import xgboost as xgb
import mlflow
import mlflow.xgboost
import joblib
import os
from sklearn.metrics import f1_score, precision_recall_curve, auc, precision_score
from sklearn.model_selection import train_test_split

def train_expiry_risk_model():
    # 1. Load Data
    batch_df = pd.read_csv("data/raw/batch_log.csv")
    forecast_df = pd.read_csv("data/processed/forecasting_features.csv")
    
    batch_df['collection_date'] = pd.to_datetime(batch_df['collection_date'])
    batch_df['expiry_date'] = pd.to_datetime(batch_df['expiry_date'])
    forecast_df['date'] = pd.to_datetime(forecast_df['date'])
    
    # 2. Feature Engineering
    batch_df['shelf_life_days'] = (batch_df['expiry_date'] - batch_df['collection_date']).dt.days
    
    # Merge recent demand stats from forecasting_features
    # We want features at the time of collection
    merged_df = pd.merge(
        batch_df,
        forecast_df[['hospital_id', 'blood_type', 'date', 'units_issued_roll_mean_7', 'units_issued_roll_mean_30']],
        left_on=['hospital_id', 'blood_type', 'collection_date'],
        right_on=['hospital_id', 'blood_type', 'date'],
        how='left'
    )
    
    # Drop rows where we don't have demand stats (early in the series)
    merged_df = merged_df.dropna(subset=['units_issued_roll_mean_7'])
    
    # 3. Prepare for Training
    target = 'was_wasted'
    features = [
        'shelf_life_days', 'units_collected', 
        'units_issued_roll_mean_7', 'units_issued_roll_mean_30',
        'blood_type', 'hospital_id'
    ]
    
    X = merged_df[features].copy()
    y = merged_df[target].astype(int)
    
    # Handle category encoding
    X['blood_type'] = X['blood_type'].astype('category')
    X['hospital_id'] = X['hospital_id'].astype('category')
    
    # Train/Test Split (Random is okay for this classification task as it's batch-wise, 
    # but could also be time-based. User didn't specify, so I'll do 80/20.)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Calculate scale_pos_weight
    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_weight = neg / pos if pos > 0 else 1
    
    print(f"Class imbalance: {neg} neg, {pos} pos. weight={scale_weight:.2f}")

    # 4. Train XGBoost
    mlflow.set_experiment("Blood_Bank_Expiry_Risk")
    
    with mlflow.start_run(run_name="XGBoost_ClassWeight"):
        params = {
            'objective': 'binary:logistic',
            'eval_metric': 'aucpr',
            'scale_pos_weight': scale_weight,
            'learning_rate': 0.1,
            'max_depth': 6,
            'n_estimators': 100,
            'enable_categorical': True,
            'n_jobs': -1
        }
        
        # In current XGB versions, we can pass tree_method='hist' for categorical
        params['tree_method'] = 'hist'
        
        model = xgb.XGBClassifier(**params)
        model.fit(X_train, y_train)
        
        # 5. Evaluate
        y_prob = model.predict_proba(X_test)[:, 1]
        y_pred = model.predict(X_test)
        
        f1 = f1_score(y_test, y_pred)
        precision, recall, _ = precision_recall_curve(y_test, y_prob)
        pr_auc = auc(recall, precision)
        
        # Precision @ Top 10%
        # Rank by probability
        test_results = pd.DataFrame({'y_true': y_test, 'y_prob': y_prob})
        top_10_count = int(len(test_results) * 0.1)
        top_10_riskiest = test_results.sort_values(by='y_prob', ascending=False).head(top_10_count)
        precision_at_10 = top_10_riskiest['y_true'].mean()
        
        print("\n=== Expiry Risk Performance ===")
        print(f"F1 Score:       {f1:.4f}")
        print(f"PR-AUC:         {pr_auc:.4f}")
        print(f"Precision@10%:  {precision_at_10:.4f}")
        
        # Logs
        mlflow.log_params(params)
        mlflow.log_metric("f1", f1)
        mlflow.log_metric("pr_auc", pr_auc)
        mlflow.log_metric("precision_at_10", precision_at_10)
        
        # Save
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, "models/expiry_risk_model.pkl")
        mlflow.xgboost.log_model(model, "model")

if __name__ == "__main__":
    train_expiry_risk_model()
