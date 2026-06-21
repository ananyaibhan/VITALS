import pandas as pd
import numpy as np
import lightgbm as lgb
from prophet import Prophet
import mlflow
import mlflow.lightgbm
import joblib
import os
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
from datetime import timedelta

def train_forecasting_model(data_path="data/processed/forecasting_features.csv"):
    df = pd.read_csv(data_path)
    df['date'] = pd.to_datetime(df['date'])
    
    # 1. Chronological Split (Last 2 months as test)
    max_date = df['date'].max()
    split_date = max_date - pd.DateOffset(months=2)
    
    train_df = df[df['date'] <= split_date]
    test_df = df[df['date'] > split_date]
    
    print(f"Training from {train_df['date'].min()} to {train_df['date'].max()}")
    print(f"Testing from {test_df['date'].min()} to {test_df['date'].max()}")
    
    # Features and target
    drop_cols = ['date', 'units_issued', 'hospital_id', 'blood_type']
    X_train = train_df.drop(columns=drop_cols)
    y_train = train_df['units_issued']
    X_test = test_df.drop(columns=drop_cols)
    y_test = test_df['units_issued']
    
    # Categorical handling
    cat_features = ['day_of_week', 'month', 'is_weekend', 'is_holiday', 'season', 'outbreak_active', 'donation_drive_active']
    for col in cat_features:
        X_train[col] = X_train[col].astype('category')
        X_test[col] = X_test[col].astype('category')
        
    # 2. Train LightGBM
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'verbosity': -1,
        'boosting_type': 'gbdt',
        'random_state': 42,
        'learning_rate': 0.05,
        'num_leaves': 31,
        'feature_fraction': 0.8
    }
    
    mlflow.set_experiment("Blood_Bank_Forecasting")
    
    with mlflow.start_run(run_name="LightGBM_Recursive"):
        mlflow.log_params(params)
        
        # Fit model
        model = lgb.LGBMRegressor(**params)
        model.fit(X_train, y_train)
        
        # Predict (Next-day)
        y_pred = model.predict(X_test)
        
        # Evaluate Overall
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        mape = mean_absolute_percentage_error(y_test, y_pred)
        
        mlflow.log_metric("rmse", rmse)
        mlflow.log_metric("mae", mae)
        mlflow.log_metric("mape", mape)
        
        print("\n=== Overall LightGBM Performance (Next-Day) ===")
        print(f"RMSE: {rmse:.4f}")
        print(f"MAE: {mae:.4f}")
        print(f"MAPE: {mape:.4f}")
        
        # Evaluate by Blood Type
        results_by_bt = []
        for bt in test_df['blood_type'].unique():
            mask = test_df['blood_type'] == bt
            bt_rmse = np.sqrt(mean_squared_error(y_test[mask], y_pred[mask]))
            bt_mae = mean_absolute_error(y_test[mask], y_pred[mask])
            results_by_bt.append({'blood_type': bt, 'rmse': bt_rmse, 'mae': bt_mae})
            
            # Sanitize name for MLflow
            bt_name = bt.replace('+', 'plus').replace('-', 'minus')
            mlflow.log_metric(f"rmse_{bt_name}", bt_rmse)
            
        bt_df = pd.DataFrame(results_by_bt)
        print("\n--- Performance by Blood Type ---")
        print(bt_df)
        
        # Save model
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, "models/forecasting_model.pkl")
        mlflow.lightgbm.log_model(model, "model")
        
    # 3. Prophet Baseline (on H1/O+)
    series_mask = (df['hospital_id'] == 'H1') & (df['blood_type'] == 'O+')
    p_df = df[series_mask][['date', 'units_issued']].rename(columns={'date': 'ds', 'units_issued': 'y'})
    p_train = p_df[p_df['ds'] <= split_date]
    p_test = p_df[p_df['ds'] > split_date]
    
    with mlflow.start_run(run_name="Prophet_Baseline_H1_Oplus"):
        m = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
        m.fit(p_train)
        
        future = m.make_future_dataframe(periods=len(p_test))
        forecast = m.predict(future)
        y_prophet_pred = forecast.iloc[-len(p_test):]['yhat']
        
        p_rmse = np.sqrt(mean_squared_error(p_test['y'], y_prophet_pred))
        p_mae = mean_absolute_error(p_test['y'], y_prophet_pred)
        
        mlflow.log_metric("rmse", p_rmse)
        mlflow.log_metric("mae", p_mae)
        
        # Get LGBM metric for SAME series for comparison
        lgbm_series_mask = (test_df['hospital_id'] == 'H1') & (test_df['blood_type'] == 'O+')
        lgbm_series_pred = model.predict(X_test[lgbm_series_mask])
        l_rmse = np.sqrt(mean_squared_error(y_test[lgbm_series_mask], lgbm_series_pred))
        
        print("\n=== Baseline Comparison (H1, O+) ===")
        print(f"Prophet RMSE:  {p_rmse:.4f}")
        print(f"LightGBM RMSE: {l_rmse:.4f}")

    print("\nTraining and evaluation complete. Logs saved to local MLflow.")

if __name__ == "__main__":
    train_forecasting_model()
