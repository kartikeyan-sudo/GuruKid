import json
import os
import time
import uuid
import requests
from monitor.cpu import get_cpu
from monitor.ram import get_ram
from monitor.active_window import get_active_window_title
from utils.usb_detect import is_usb_present

BACKEND = os.getenv("GURUKID_API", "http://localhost:4000/api")
DEVICE_ID = None


def device_id():
    global DEVICE_ID
    if DEVICE_ID:
        return DEVICE_ID
    path = os.path.join(os.getcwd(), "device_id.txt")
    if os.path.exists(path):
        DEVICE_ID = open(path).read().strip()
    else:
        DEVICE_ID = str(uuid.uuid4())
        with open(path, "w") as f:
            f.write(DEVICE_ID)
    return DEVICE_ID


def register():
    url = f"{BACKEND}/devices/register"
    resp = requests.post(url, json={"deviceId": device_id(), "name": "Python Agent"})
    if resp.ok:
        print("registered", resp.json())
    else:
        print("register failed", resp.text)


def push_status():
    url = f"{BACKEND}/devices/{device_id()}/status"
    payload = {
        "stats": {"cpu": get_cpu(), "ram": get_ram()},
        "log": {
            "type": "heartbeat",
            "window": get_active_window_title(),
            "usb": is_usb_present(),
        },
    }
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as exc:
        print("status error", exc)


def main():
    register()
    while True:
        push_status()
        time.sleep(5)


if __name__ == "__main__":
    main()
