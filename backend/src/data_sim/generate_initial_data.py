import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def generate_data(output_dir="data/raw"):
    os.makedirs(output_dir, exist_ok=True)
    np.random.seed(42)

    hospitals = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
    blood_types = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
    
    # 1. Hospital Distances
    distances_rows = []
    # Base coords roughly for 6 regional centers
    coords = {
        'H1': (0.0, 0.0),
        'H2': (15.0, 10.0),
        'H3': (25.0, -15.0),
        'H4': (-10.0, 20.0),
        'H5': (-20.0, -10.0),
        'H6': (5.0, 30.0)
    }
    for h1 in hospitals:
        for h2 in hospitals:
            if h1 == h2:
                dist = 0.0
                time_hrs = 0.0
            else:
                c1, c2 = coords[h1], coords[h2]
                dist = round(float(np.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)), 2)
                time_hrs = round(dist / 40.0 + 0.25, 2) # approx 40km/h + handling
            distances_rows.append({
                'from_hospital': h1,
                'to_hospital': h2,
                'distance_km': dist,
                'transfer_time_hours': time_hrs
            })
    df_dist = pd.DataFrame(distances_rows)
    df_dist.to_csv(os.path.join(output_dir, "hospital_distances.csv"), index=False)
    print("✅ hospital_distances.csv generated")

    # 2. Daily Inventory
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 6, 21)
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')

    # Popularity weights for blood types
    bt_weights = {
        'O+': 0.38, 'A+': 0.30, 'B+': 0.15, 'AB+': 0.05,
        'O-': 0.07, 'A-': 0.02, 'B-': 0.02, 'AB-': 0.01
    }
    h_scale = {'H1': 1.5, 'H2': 1.2, 'H3': 0.9, 'H4': 1.0, 'H5': 0.8, 'H6': 1.1}

    inv_rows = []
    batches_rows = []
    batch_counter = 10000

    for h in hospitals:
        scale = h_scale[h]
        for b in blood_types:
            weight = bt_weights[b]
            base_mean = max(2.0, scale * weight * 30.0)

            opening_stock = int(base_mean * 7) # start with 7 days stock

            for d in date_range:
                is_weekend = int(d.weekday() >= 5)
                # seasonal flag
                season = "Winter" if d.month in [12, 1, 2] else "Spring" if d.month in [3, 4, 5] else "Summer" if d.month in [6, 7, 8] else "Autumn"
                is_holiday = int((d.month == 1 and d.day == 1) or (d.month == 7 and d.day == 4) or (d.month == 12 and d.day == 25))
                outbreak_active = int(d.month in [7, 8] and np.random.rand() < 0.1)
                donation_drive_active = int(d.weekday() == 5 and np.random.rand() < 0.25)

                # Demand
                demand_factor = 1.0 + (0.2 if is_weekend else 0.0) + (0.3 if outbreak_active else 0.0)
                units_demanded = int(np.random.poisson(base_mean * demand_factor))
                units_issued = min(opening_stock, units_demanded)
                shortage = max(0, units_demanded - opening_stock)

                # Collections
                col_factor = 1.0 + (1.5 if donation_drive_active else 0.0) - (0.3 if is_holiday else 0.0)
                units_collected = int(np.random.poisson(base_mean * col_factor))

                # Expiry (occasionally small percentage of stock)
                if opening_stock > base_mean * 5 and np.random.rand() < 0.15:
                    units_expired = min(opening_stock - units_issued, int(np.random.randint(1, 4)))
                else:
                    units_expired = 0

                closing_stock = opening_stock + units_collected - units_issued - units_expired

                inv_rows.append({
                    'hospital_id': h,
                    'blood_type': b,
                    'date': d.strftime('%Y-%m-%d'),
                    'opening_stock': opening_stock,
                    'units_collected': units_collected,
                    'units_issued': units_issued,
                    'units_expired': units_expired,
                    'closing_stock': closing_stock,
                    'shortage_units': shortage,
                    'is_weekend': is_weekend,
                    'is_holiday': is_holiday,
                    'season': season,
                    'outbreak_active': outbreak_active,
                    'donation_drive_active': donation_drive_active
                })

                # Create batch entry if collected
                if units_collected > 0:
                    batch_counter += 1
                    shelf_life = np.random.randint(35, 43)
                    exp_date = d + timedelta(days=shelf_life)
                    was_wasted = bool(units_expired > 0 and np.random.rand() < 0.3)
                    expired_unused = min(units_collected, units_expired) if was_wasted else 0
                    depleted_date = (d + timedelta(days=np.random.randint(5, 30))).strftime('%Y-%m-%d') if not was_wasted else None

                    batches_rows.append({
                        'batch_id': f"B{batch_counter:06d}",
                        'hospital_id': h,
                        'blood_type': b,
                        'collection_date': d.strftime('%Y-%m-%d'),
                        'expiry_date': exp_date.strftime('%Y-%m-%d'),
                        'units_collected': units_collected,
                        'units_expired_unused': expired_unused,
                        'fully_depleted_date': depleted_date,
                        'was_wasted': was_wasted
                    })

                # Next day opening stock
                opening_stock = closing_stock

    df_inv = pd.DataFrame(inv_rows)
    df_inv.to_csv(os.path.join(output_dir, "daily_inventory.csv"), index=False)
    print(f"✅ daily_inventory.csv generated ({len(df_inv)} rows)")

    df_batches = pd.DataFrame(batches_rows)
    df_batches.to_csv(os.path.join(output_dir, "batch_log.csv"), index=False)
    print(f"✅ batch_log.csv generated ({len(df_batches)} rows)")

if __name__ == "__main__":
    generate_data()
