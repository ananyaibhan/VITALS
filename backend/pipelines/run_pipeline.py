import subprocess
import sys
import os
import time

def run_step(step_name, command):
    print(f"\n==========================================")
    print(f"▶️ RUNNING PIPELINE STAGE: {step_name}")
    print(f"Command: {command}")
    print(f"==========================================")
    start_time = time.time()
    
    result = subprocess.run(command, shell=True)
    duration = time.time() - start_time
    
    if result.returncode != 0:
        print(f"❌ Stage [{step_name}] FAILED with exit code {result.returncode} ({duration:.1f}s)")
        sys.exit(result.returncode)
    else:
        print(f"✅ Stage [{step_name}] COMPLETED successfully in {duration:.1f}s")

def run_full_pipeline():
    python_bin = sys.executable
    print("🚀 Starting End-to-End Blood Bank MLOps Pipeline...")
    
    # 1. Validation
    run_step("1. Data Validation", f"{python_bin} src/data_validation/validate.py")
    
    # 2. Features
    run_step("2. Feature Engineering", f"{python_bin} src/features/build_features.py")
    
    # 3. Model Training - Demand Forecasting
    run_step("3. Train Forecasting Model", f"{python_bin} src/models/forecasting/train.py")
    
    # 4. Model Training - Expiry Risk
    run_step("4. Train Expiry Risk Model", f"{python_bin} src/models/expiry_risk/train.py")
    
    # 5. Monitoring & Drift
    run_step("5. Data Drift & Model Monitoring", f"{python_bin} monitoring/drift_monitor.py")
    
    print("\n🎉 Full MLOps Pipeline executed successfully!")

if __name__ == "__main__":
    run_full_pipeline()
