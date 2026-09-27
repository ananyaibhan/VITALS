import pandas as pd
import numpy as np
import os
import json
from datetime import datetime
from evidently.legacy.report import Report
from evidently.legacy.metric_preset import DataDriftPreset

def run_drift_analysis(
    data_path="data/processed/forecasting_features.csv",
    output_dir="monitoring/reports"
):
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(data_path):
        # check parent directory if run from backend
        if os.path.exists(f"backend/{data_path}"):
            data_path = f"backend/{data_path}"
        else:
            print(f"Error: {data_path} not found")
            return None

    df = pd.read_csv(data_path)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')

    # Reference dataset: Historical baseline (first 70%)
    # Current dataset: Recent production traffic (last 30%)
    split_idx = int(len(df) * 0.70)
    reference_df = df.iloc[:split_idx]
    current_df = df.iloc[split_idx:]

    numerical_features = [
        'units_issued', 'units_issued_lag_1', 'units_issued_lag_7',
        'units_issued_lag_14', 'units_issued_roll_mean_7', 'units_issued_roll_mean_30'
    ]
    categorical_features = ['day_of_week', 'month', 'is_weekend', 'season']

    # Select features present
    avail_num = [f for f in numerical_features if f in df.columns]
    avail_cat = [f for f in categorical_features if f in df.columns]
    selected_cols = avail_num + avail_cat

    ref_data = reference_df[selected_cols]
    curr_data = current_df[selected_cols]

    print(f"Running Data Drift Analysis: Ref ({len(ref_data)} rows) vs Curr ({len(curr_data)} rows)...")

    # Generate Evidently Report
    report = Report(metrics=[DataDriftPreset()])
    report.run(reference_data=ref_data, current_data=curr_data)

    html_path = os.path.join(output_dir, "data_drift_report.html")
    report.save_html(html_path)

    # Compute key drift summary metrics
    drift_dict = report.as_dict()
    
    # Extract high-level summary
    drift_metrics = {
        "timestamp": datetime.now().isoformat(),
        "reference_rows": len(ref_data),
        "current_rows": len(curr_data),
        "features_evaluated": len(selected_cols),
        "dataset_drift_detected": False,
        "drift_share": 0.0,
        "drifted_features": [],
        "features_summary": []
    }

    try:
        metrics_list = drift_dict.get("metrics", [])
        for m in metrics_list:
            res = m.get("result", {})
            if "dataset_drift" in res:
                drift_metrics["dataset_drift_detected"] = bool(res.get("dataset_drift", False))
                drift_metrics["drift_share"] = round(float(res.get("drift_share", 0.0)) * 100, 1)
                drift_metrics["number_of_drifted_features"] = int(res.get("number_of_drifted_columns", 0))
            
            if "drift_by_columns" in res:
                for col_name, col_data in res["drift_by_columns"].items():
                    is_drift = bool(col_data.get("drift_detected", False))
                    score = round(float(col_data.get("drift_score", 0.0)), 4)
                    stat_test = col_data.get("stat_test_name", "K-S")
                    
                    if is_drift:
                        drift_metrics["drifted_features"].append(col_name)
                        
                    drift_metrics["features_summary"].append({
                        "feature": col_name,
                        "drift_detected": is_drift,
                        "drift_score": score,
                        "stat_test": stat_test
                    })
    except Exception as e:
        print(f"Warning parsing detailed metrics: {e}")

    json_path = os.path.join(output_dir, "drift_metrics.json")
    with open(json_path, "w") as f:
        json.dump(drift_metrics, f, indent=2)

    print(f"✅ Data Drift Report saved to: {html_path}")
    print(f"✅ Drift Metrics JSON saved to: {json_path}")
    print(f"Drift Share: {drift_metrics.get('drift_share', 0)}%, Dataset Drift: {drift_metrics.get('dataset_drift_detected')}")

    return drift_metrics

if __name__ == "__main__":
    run_drift_analysis()
