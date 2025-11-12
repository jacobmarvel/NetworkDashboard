from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta, timezone
from typing import List, Dict
import random
import time

class DeviceStatus(str, Enum):
    Up = "Up"
    Down = "Down"       # Standard enum for status.


def _now() -> datetime:
    return datetime.now(timezone.utc) # current time in UTC

def _iso(dt: datetime) -> str:
    return dt.isoformat()         #  datetime to ISO8601 string

def _simulate_latency(status: DeviceStatus) -> int:
    if status == DeviceStatus.Down:
        return -1
    return int(5 + random.random() * 200)

# datastructure of a core network
@dataclass
class Device:
    id: int
    name: str
    ip_address: str
    status: str           # Up and Down
    type: str             # Router, Switch, Firewall
    last_checked: str     # ISO8601
    location: str
    latency: int          # -1 for timeout
    status_changed_at: str

def fetch_devices(simulated_delay_ms: int = 0) -> List[Dict]:
    if simulated_delay_ms:
        time.sleep(simulated_delay_ms / 1000.0)

    now = _now()
    devices: List[Device] = [
        # 5 devices Up
        Device(1, "Router1 ",      "192.168.1.1",  DeviceStatus.Up.value,   "Router",
               _iso(now), "London",      _simulate_latency(DeviceStatus.Up),   _iso(now - timedelta(days=1))),
        Device(2, "Firewall-1",    "192.168.1.3",  DeviceStatus.Up.value,   "Firewall",
               _iso(now), "Scotland",        _simulate_latency(DeviceStatus.Up),   _iso(now - timedelta(days=3))),
        Device(3, "Switch-3",    "10.10.5.1",    DeviceStatus.Up.value,   "Switch",
               _iso(now), "France",         _simulate_latency(DeviceStatus.Up),   _iso(now - timedelta(days=7))),
        Device(4, "Router2",    "192.168.1.10", DeviceStatus.Up.value,   "Router",
               _iso(now), "Germany",      _simulate_latency(DeviceStatus.Up),   _iso(now - timedelta(hours=2))),
        Device(5, "Firewall-2", "10.20.5.1",    DeviceStatus.Up.value,   "Firewall",
               _iso(now), "Newyork",        _simulate_latency(DeviceStatus.Up),   _iso(now - timedelta(hours=4))),
        # 3 devices Down
        Device(6, "Switch-4",       "192.168.1.2",  DeviceStatus.Down.value, "Switch",
               _iso(now - timedelta(minutes=5)),  "Bangalore", -1, _iso(now - timedelta(minutes=5))),
        Device(7, "Switch-5","192.168.2.2",  DeviceStatus.Down.value, "Switch",
               _iso(now - timedelta(minutes=30)), "New Delhi", -1, _iso(now - timedelta(minutes=30))),
        Device(8, "Firewall - 7",     "172.16.0.1",   DeviceStatus.Down.value, "Firewall",
               _iso(now - timedelta(days=1)),     "Dubai",        -1, _iso(now - timedelta(days=2))),
    ]
    
    return [asdict(d) for d in devices] #convert to dicts for JSON serialization