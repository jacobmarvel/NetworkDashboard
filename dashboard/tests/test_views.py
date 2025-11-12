
from django.urls import reverse

def test_index_renders(client):
    resp = client.get(reverse("dashboard-index"))
    assert resp.status_code == 200
    
    html = resp.content.decode()
    # Check for core text elements
    assert "Network Status Dashboard" in html or "Devices" in html
    # Make sure the JS bundle reference is there
    assert "/static/dashboard/app.js" in html