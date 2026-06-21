import pandas as pd
import numpy as np
import os

def build_forecasting_features(input_path="data/raw/daily_inventory.csv", output_path="data/processed/forecasting_features.csv"):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    df = pd.read_csv(input_path)
    df['date'] = pd.to_datetime(df['date'])
    
    # Sort by groups and date
    df = df.sort_values(['hospital_id', 'blood_type', 'date'])
    
    # Define group object
    grouped = df.groupby(['hospital_id', 'blood_type'])
    
    # 1. Lag Features for units_issued
    lags = [1, 7, 14, 30]
    for lag in lags:
        df[f'units_issued_lag_{lag}'] = grouped['units_issued'].shift(lag)
        
    # 2. Rolling Window Features for units_issued
    windows = [7, 30]
    for window in windows:
        df[f'units_issued_roll_mean_{window}'] = grouped['units_issued'].shift(1).rolling(window=window).mean().reset_index(0, drop=True)
        df[f'units_issued_roll_std_{window}'] = grouped['units_issued'].shift(1).rolling(window=window).std().reset_index(0, drop=True)
        
    # 3. Calendar Features
    df['day_of_week'] = df['date'].dt.dayofweek
    df['month'] = df['date'].dt.month
    
    # Categorical features
    # (Just keeping them as strings/objects for now, standard for a CSV. 
    # Usually model training script handles encoding.)
    
    # Important columns to keep
    target_col = ['units_issued']
    id_cols = ['hospital_id', 'blood_type', 'date']
    existing_flags = ['is_weekend', 'is_holiday', 'season', 'outbreak_active', 'donation_drive_active']
    
    # Filter columns
    feature_cols = [c for c in df.columns if 'lag_' in c or 'roll_' in c or c in ['day_of_week', 'month'] + existing_flags]
    final_df = df[id_cols + target_col + feature_cols]
    
    # 4. Handle NaNs
    initial_count = len(final_df)
    final_df = final_df.dropna()
    dropped_count = initial_count - len(final_df)
    
    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_df.to_csv(output_path, index=False)
    
    print(f"Feature engineering complete.")
    print(f"Processed file saved to: {output_path}")
    print(f"Initial rows: {initial_count}")
    print(f"Rows after dropping NaNs (due to lags/windows): {len(final_df)}")
    print(f"Total rows dropped: {dropped_count}")
    
    return final_df

if __name__ == "__main__":
    build_forecasting_features()
