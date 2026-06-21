import pandas as pd
import numpy as np
from datetime import timedelta

def extend_data(inventory_path="data/raw/daily_inventory.csv", batch_path="data/raw/batch_log.csv"):
    # 1. Extend Inventory
    df_inv = pd.read_csv(inventory_path)
    df_inv['date'] = pd.to_datetime(df_inv['date'])
    
    last_date = df_inv['date'].max()
    today = pd.to_datetime("2026-06-21")
    
    if last_date >= today:
        print("Data is already up to date.")
        return

    days_to_add = (today - last_date).days
    print(f"Extending inventory by {days_to_add} days...")
    
    # We will replicate the last year of data to maintain seasonality, then adjust dates
    # Let's take the 2024 data (most recent full-ish year)
    data_2024 = df_inv[df_inv['date'].dt.year == 2024].copy()
    
    new_rows = []
    current_date = last_date + timedelta(days=1)
    
    while current_date <= today:
        # Pick a row from 2024 with same month/day if possible, or just cycle
        source_date = current_date - timedelta(days=365)
        # Find rows for all hospital/blood_type on this source date
        daily_snapshot = df_inv[df_inv['date'] == source_date].copy()
        
        if daily_snapshot.empty:
            # Fallback to random snapshot if 2024 didn't have this date
            daily_snapshot = df_inv[df_inv['date'] == df_inv['date'].sample(1).iloc[0]].copy()
            
        daily_snapshot['date'] = current_date
        # Add some random noise to demand/collection
        daily_snapshot['units_collected'] = np.clip(daily_snapshot['units_collected'] + np.random.randint(-2, 3), 0, None)
        daily_snapshot['units_demanded'] = np.clip(daily_snapshot['units_demanded'] + np.random.randint(-3, 4), 0, None)
        
        new_rows.append(daily_snapshot)
        current_date += timedelta(days=1)
        
    df_inv_extended = pd.concat([df_inv] + new_rows).sort_values(['hospital_id', 'blood_type', 'date'])
    df_inv_extended.to_csv(inventory_path, index=False)
    
    # 2. Extend Batches
    # We'll generate new batches for the period 2025-2026
    df_batch = pd.read_csv(batch_path)
    df_batch['collection_date'] = pd.to_datetime(df_batch['collection_date'])
    df_batch['expiry_date'] = pd.to_datetime(df_batch['expiry_date'])
    
    print("Generating new batches for the extended period...")
    
    # Heuristic: Create batches based on collections in the extended inventory
    new_inv = pd.concat(new_rows)
    new_batches = []
    
    # Get last batch ID
    last_id = int(df_batch['batch_id'].iloc[-1][1:])
    
    for idx, row in new_inv.iterrows():
        if row['units_collected'] > 0:
            last_id += 1
            # Expiry usually 35-42 days for red cells
            expiry_days = np.random.randint(35, 43)
            new_batches.append({
                'batch_id': f"B{last_id:06d}",
                'hospital_id': row['hospital_id'],
                'blood_type': row['blood_type'],
                'collection_date': row['date'],
                'expiry_date': row['date'] + timedelta(days=expiry_days),
                'units_collected': row['units_collected'],
                'units_expired_unused': 0,
                'fully_depleted_date': None,
                'was_wasted': False
            })
            
    df_batch_extended = pd.concat([df_batch, pd.DataFrame(new_batches)])
    df_batch_extended.to_csv(batch_path, index=False)
    
    print(f"Success. Inventory ends at {df_inv_extended['date'].max()}")

if __name__ == "__main__":
    extend_data()
