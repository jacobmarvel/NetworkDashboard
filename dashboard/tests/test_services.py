import random
from dashboard import services

def test_simulate_latency_values(monkeypatch):
    # Down status must always return -1
    assert services._simulate_latency(services.DeviceStatus.Down) == -1
    # Used seed to ensure RTT is in range
    random.seed(0)
    ms = services._simulate_latency(services.DeviceStatus.Up)
    assert 5 <= ms <= 205

def test_fetch_devices_shape():
    data = services.fetch_devices(simulated_delay_ms=0) # Skip sleep during testing
    assert isinstance(data, list) and len(data) >= 3
    first = data[0]
    # Checked minimum required keys are present
    assert {"id","name","ip_address","status"} <= set(first.keys())