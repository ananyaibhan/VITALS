import streamlit as st
import requests
import pandas as pd
import numpy as np

import os

# Config
# When running in Docker, use the service name. Default to localhost for local dev.
BASE_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

st.set_page_config(page_title="Blood Bank Optimizer", layout="wide")

st.title("🩸 Blood Bank Optimization Dashboard")

# Sidebar
st.sidebar.header("Controls")
hospital_id = st.sidebar.selectbox("Select Hospital", ["H1", "H2", "H3", "H4", "H5", "H6"])
blood_type = st.sidebar.selectbox("Select Blood Type", ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"])

# Helper for API calls
def call_api(endpoint, params=None):
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", params=params)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error ({response.status_code}): {response.text}")
            return None
    except Exception as e:
        st.error(f"Could not connect to API: {e}")
        return None

# Tabs for different views
tab_overview, tab_details = st.tabs(["🌎 Network Overview", "🏥 Hospital Specifics"])

with tab_overview:
    st.subheader("Global Inventory Status")
    
    # In a real app, calculate status for all. 
    # For demo, we'll fetch recommendations (which identifies shortages)
    recs_data = call_api("/recommendation", {"hospital_id": hospital_id}) # using selected as entry
    
    # Fetch some dummy mapping for the overview
    cols = st.columns(3)
    for i, h_id in enumerate(["H1", "H2", "H3", "H4", "H5", "H6"]):
        with cols[i % 3]:
            # Simple status box logic
            # This is a mock based on general data trends seen in EDA
            status = "Green" if h_id in ["H1", "H2"] else "Yellow"
            if h_id == "H3": status = "Red"
            
            st.markdown(f"""
            <div style="padding: 10px; border-radius: 5px; background-color: {'#ff4b4b33' if status=='Red' else '#ffbd4533' if status=='Yellow' else '#21c35433'}; border: 1px solid {'#ff4b4b' if status=='Red' else '#ffbd45' if status=='Yellow' else '#21c354'}">
                <h3 style="margin:0">{h_id}</h3>
                <p style="margin:0">Status: <b>{status}</b></p>
            </div>
            """, unsafe_allow_html=True)
            st.write("")

with tab_details:
    st.header(f"Insights for {hospital_id} ({blood_type})")
    
    # 1. Forecast section
    st.subheader("📈 7-Day Demand Forecast")
    forecast = call_api("/forecast", {"hospital_id": hospital_id, "blood_type": blood_type})
    if forecast:
        col1, col2 = st.columns(2)
        col1.metric("Next Day Demand", f"{forecast['next_day_demand']} units")
        col2.metric("Weekly Cumulative", f"{forecast['seven_day_forecast']} units")
        
        # Simple forecast chart creation (mocking seasonality over next 7 days based on pred)
        days = pd.date_range(start=forecast['forecast_date'], periods=7)
        base = forecast['next_day_demand']
        noise = np.random.normal(0, 1, 7)
        y_vals = np.clip(base + noise, 0, None)
        chart_data = pd.DataFrame({"Date": days, "Demand": y_vals}).set_index("Date")
        st.line_chart(chart_data)

    # 2. Expiry Risk
    st.subheader("⚠️ At-Risk Batches")
    risk_data = call_api("/expiry-risk", {"hospital_id": hospital_id, "blood_type": blood_type})
    if risk_data:
        if risk_data['batches']:
            st.dataframe(pd.DataFrame(risk_data['batches']), use_container_width=True)
        else:
            st.info("No batches categorized as high risk for this hospital/blood type.")

    # 3. Recommendations
    st.subheader("💡 Optimizer Recommendations")
    recs = call_api("/recommendation", {"hospital_id": hospital_id})
    if recs:
        # Filter for current selection in details view
        filtered_recs = [r for r in recs['recommendations'] if r.get('blood_type') == blood_type]
        
        if not filtered_recs:
            st.success("Configuration optimal. No immediate actions required for this selection.")
        else:
            for r in filtered_recs:
                if r['type'] == 'collection':
                    st.warning(f"**Action Required**: Request **{int(r['units'])} additional units** of {r['blood_type']} for {hospital_id}.")
                elif r['type'] == 'transfer':
                    st.info(f"**Action Required**: Transfer **{int(r['units'])} units** of {r['blood_type']} from **{r['from']}**.")
