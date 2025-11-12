import random
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import ensure_csrf_cookie

from .services import fetch_devices 

@ensure_csrf_cookie
@require_GET
def index(request):
    return render(request, "dashboard/index.html", {}) # Main dashboard page

@require_GET
def devices_api(request):
    mode = request.GET.get("mode", "rich")
    if mode == "min":
        # Quick sample data for front-end testing
        data = [
            {"id": 1, "name": "Router1",   "ip_address": "192.168.1.1", "status": "Up"},
            {"id": 2, "name": "Switch1",   "ip_address": "192.168.1.2", "status": "Down"},
            {"id": 3, "name": "Firewall1", "ip_address": "192.168.1.3", "status": "Up"},
        ]
        return JsonResponse(data, safe=False) 

    data = fetch_devices(simulated_delay_ms=0)

    state = request.GET.get("status")
    if state in ("Up", "Down"):
        data = [d for d in data if d.get("status") == state]

    q = request.GET.get("q", "").strip().lower()
    if q:
        data = [d for d in data if q in d.get("name", "").lower() or q in d.get("ip_address", "")] # name filter
    
    return JsonResponse(data, safe=False)

@require_POST
def ping_device(request, device_id: int):
    # simple mock: ids 6-8 timeout
    if device_id in (6, 7, 8):
        return JsonResponse({"ok": False, "rtt_ms": -1})
    
    return JsonResponse({"ok": True, "rtt_ms": random.randint(5, 200)}) # Simulated RTT


