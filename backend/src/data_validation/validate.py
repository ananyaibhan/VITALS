import pandas as pd
import numpy as np
import sys
import os

def validate_daily_inventory(df):
    errors = []
    
    # 1. Negative values check
    neg_cols = ['opening_stock', 'units_collected', 'units_issued', 'units_expired', 'closing_stock', 'shortage_units']
    for col in neg_cols:
        if (df[col] < 0).any():
            count = (df[col] < 0).sum()
            errors.append(f"daily_inventory: {count} negative values found in {col}")

    # 2. Blood type check
    valid_types = {'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'}
    invalid_types = df[~df['blood_type'].isin(valid_types)]['blood_type'].unique()
    if len(invalid_types) > 0:
        errors.append(f"daily_inventory: Invalid blood types found: {invalid_types}")

    # 3. Date check and continuity
    try:
        df['date'] = pd.to_datetime(df['date'])
        
        # Continuity check
        df_sorted = df.sort_values(['hospital_id', 'blood_type', 'date'])
        groups = df_sorted.groupby(['hospital_id', 'blood_type'])
        for name, group in groups:
            date_diffs = group['date'].diff().dt.days
            # First row diff is NaN, ignore it
            gaps = date_diffs[date_diffs > 1]
            if not gaps.empty:
                errors.append(f"daily_inventory: Gaps found in dates for group {name}")
                break # Just report first group with gaps to avoid spam
    except Exception as e:
        errors.append(f"daily_inventory: Date parsing error: {e}")

    # 4. Closing stock equation
    # closing_stock = opening_stock + units_collected - units_issued - units_expired
    calculated_closing = df['opening_stock'] + df['units_collected'] - df['units_issued'] - df['units_expired']
    violations = np.abs(df['closing_stock'] - calculated_closing) > 1e-5
    if violations.any():
        count = violations.sum()
        errors.append(f"daily_inventory: {count} rows violate closing_stock equation")

    return errors

def validate_batch_log(df):
    errors = []
    
    # Date conversion
    try:
        df['collection_date'] = pd.to_datetime(df['collection_date'])
        df['expiry_date'] = pd.to_datetime(df['expiry_date'])
        
        # 1. Expiry > Collection
        if (df['expiry_date'] <= df['collection_date']).any():
            count = (df['expiry_date'] <= df['collection_date']).sum()
            errors.append(f"batch_log: {count} rows have expiry_date <= collection_date")
    except Exception as e:
        errors.append(f"batch_log: Date parsing error: {e}")

    # 2. units_collected > 0
    if (df['units_collected'] <= 0).any():
        count = (df['units_collected'] <= 0).sum()
        errors.append(f"batch_log: {count} rows have units_collected <= 0")

    # 3. units_expired_unused <= units_collected
    if (df['units_expired_unused'] > df['units_collected']).any():
        count = (df['units_expired_unused'] > df['units_collected']).sum()
        errors.append(f"batch_log: {count} rows have units_expired_unused > units_collected")

    return errors

def run_all_validations(data_dir="data/raw"):
    all_errors = []
    
    inventory_path = os.path.join(data_dir, "daily_inventory.csv")
    if os.path.exists(inventory_path):
        df_inv = pd.read_csv(inventory_path)
        all_errors.extend(validate_daily_inventory(df_inv))
    else:
        all_errors.append("daily_inventory.csv missing")

    batch_path = os.path.join(data_dir, "batch_log.csv")
    if os.path.exists(batch_path):
        df_batch = pd.read_csv(batch_path)
        all_errors.extend(validate_batch_log(df_batch))
    else:
        all_errors.append("batch_log.csv missing")

    return all_errors

if __name__ == "__main__":
    errors = run_all_validations()
    if not errors:
        print("✅ All validations PASSED!")
        sys.exit(0)
    else:
        print("❌ Validations FAILED:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
