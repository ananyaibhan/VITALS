import pytest
from fastapi.testclient import TestClient
from api.app import app

def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

def test_forecast_valid():
    with TestClient(app) as client:
        response = client.get("/forecast?hospital_id=H1&blood_type=O%2B")
        assert response.status_code == 200
        data = response.json()
        assert "next_day_demand" in data
        assert "daily_breakdown" in data
        assert data["hospital_id"] == "H1"

def test_forecast_invalid():
    with TestClient(app) as client:
        response = client.get("/forecast?hospital_id=H99&blood_type=Z-")
        assert response.status_code == 422

def test_recommendation():
    with TestClient(app) as client:
        response = client.get("/recommendation?hospital_id=H3")
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        assert data["hospital_id"] == "H3"

def test_hospital_inventory():
    with TestClient(app) as client:
        response = client.get("/hospital-inventory?hospital_id=H2")
        assert response.status_code == 200
        data = response.json()
        assert data["hospital_id"] == "H2"
        assert len(data["inventory"]) > 0

def test_network_summary():
    with TestClient(app) as client:
        response = client.get("/network-summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_network_stock" in data
        assert len(data["hospitals"]) == 6

def test_monitoring_drift_status():
    with TestClient(app) as client:
        response = client.get("/monitoring/drift-status")
        assert response.status_code == 200
        data = response.json()
        assert "drift_share" in data or "status" in data

def test_log_intake():
    with TestClient(app) as client:
        payload = {
            "hospital_id": "H2",
            "blood_type": "O+",
            "units_collected": 5,
            "units_issued": 2
        }
        response = client.post("/log-intake", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "new_current_stock" in data
        assert data["hospital_id"] == "H2"
        assert data["blood_type"] == "O+"
