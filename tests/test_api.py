import pytest
from fastapi.testclient import TestClient
from deployment.api.app import app

client = TestClient(app)

def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

def test_forecast_valid():
    with TestClient(app) as client:
        response = client.get("/forecast?hospital_id=H1&blood_type=O%2B") # O+
        assert response.status_code == 200
        data = response.json()
        assert "next_day_demand" in data
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
