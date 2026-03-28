import json
import time
import threading
from websocket import WebSocketApp


class SocketClient:
    def __init__(self, url, device_id, on_command=None):
        self.url = url
        self.device_id = device_id
        self.ws = None
        self.on_command = on_command

    def start(self):
        self.ws = WebSocketApp(
            self.url,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
        )
        t = threading.Thread(target=self.ws.run_forever, daemon=True)
        t.start()

    def _on_open(self, _):
        self.ws.send(json.dumps({"event": "register", "data": {"deviceId": self.device_id}}))

    def _on_message(self, _, message):
        try:
            payload = json.loads(message)
            if payload.get("event") == "command" and self.on_command:
                self.on_command(payload.get("data"))
        except Exception:
            pass

    def _on_error(self, _, err):
        print("socket error", err)

    def send(self, event, data):
        if not self.ws:
            return
        self.ws.send(json.dumps({"event": event, "data": data}))

    def heartbeat(self):
        while True:
            try:
                self.send("heartbeat", {"deviceId": self.device_id, "ts": time.time()})
            except Exception:
                pass
            time.sleep(5)
