from pathlib import Path
import sys

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.api.main import APP_NAME, APP_VERSION, app


client = TestClient(app)


def test_health_endpoint_returns_expected_payload():
    response = client.get("/health")
    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["version"] == APP_VERSION
    assert payload["name"] == APP_NAME
    assert "timestamp" in payload


def test_root_endpoint_includes_docs_and_endpoints():
    response = client.get("/")
    assert response.status_code == 200

    payload = response.json()
    assert payload["name"] == APP_NAME
    assert payload["documentation"]["swagger"] == "/docs"
    assert payload["documentation"]["openapi"] == "/openapi.json"
    assert payload["endpoints"]["health"] == "/health"


def test_not_found_handler_returns_structured_error():
    response = client.get("/does-not-exist")
    assert response.status_code == 404

    payload = response.json()
    assert payload["error"] == "Not Found"
    assert payload["documentation"] == "/docs"
