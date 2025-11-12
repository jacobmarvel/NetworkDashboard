from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="dashboard-index"),
    path("devices", views.devices_api, name="devices-api"),
    path("devices/<int:device_id>/ping", views.ping_device, name="devices-ping"),

]
