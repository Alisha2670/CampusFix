from fastapi.testclient import TestClient
from app.main import app

def test_health_check_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert data["model"] == "all-MiniLM-L6-v2"
        assert "timestamp" in data

