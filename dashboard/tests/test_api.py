import json
from django.urls import reverse

def test_devices_api_ok(client):
    url = reverse("devices-api")
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list) and len(data) >= 3
    first = data[0]
    # specific keys must be here
    assert {"id", "name", "ip_address", "status"} <= set(first.keys())
    # status must be Up/Down
    assert first["status"] in ("Up", "Down")

def test_devices_api_filter_status(client):
    # filter by status=Up
    url = reverse("devices-api") + "?status=Up"
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert all(d["status"] == "Up" for d in data)

def test_devices_api_min_mode(client):
    # minimal mode
    url = reverse("devices-api") + "?mode=min"
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    for d in data:
        assert set(d.keys()) == {"id", "name", "ip_address", "status"}

def test_devices_api_wrong_method(client):
    # POST not allowed
    url = reverse("devices-api")
    resp = client.post(url, data={})
    assert resp.status_code == 405  # Method Not Allowed

def test_ping_ok(client):
    # UP device id (adjust to one, mock as Up,eg: 1)
    url = reverse("devices-ping", args=[1])
    resp = client.post(url) 
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["rtt_ms"] >= 0

def test_ping_timeout(client):
    # Down device id (adjust to one,mock as Down, e.g., 7)
    url = reverse("devices-ping", args=[7])
    resp = client.post(url)
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is False
    assert body["rtt_ms"] == -1