"""Unit and integration tests for Digital Soil Mapping (DSM) endpoints."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_soil_layers():
    response = client.get("/api/v1/soil-layers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 7  # farm_boundary + 6 DSM layers
    
    ids = [layer["id"] for layer in data]
    assert "farm_boundary" in ids
    assert "ph" in ids
    assert "bd" in ids
    assert "elevation" in ids
    assert "nitrogen" in ids
    assert "soc" in ids
    assert "ndvi" in ids
    
    boundary_layer = next(l for l in data if l["id"] == "farm_boundary")
    assert boundary_layer["status"] == "available"
    
    ph_layer = next(l for l in data if l["id"] == "ph")
    assert ph_layer["status"] == "pending"
    assert ph_layer["unit"] == "pH"

def test_get_single_soil_layer():
    response = client.get("/api/v1/soil-layers/ph")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "ph"
    assert data["unit"] == "pH"
    assert data["min"] == 4.5
    assert data["max"] == 8.5

def test_get_nonexistent_soil_layer():
    response = client.get("/api/v1/soil-layers/nonexistent")
    assert response.status_code == 404
