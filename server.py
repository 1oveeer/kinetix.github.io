# -*- coding: utf-8 -*-
import http.server
import socketserver
import json
import os
import sys
import urllib.parse
import webbrowser
import threading
import database

PORT = 8000
WEB_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS_DIR = os.path.join(WEB_DIR, "downloads")

class KinetixAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/user/profile":
            username = query.get("username", [""])[0].strip()
            if not username:
                self.send_json({"success": False, "error": "Не указано имя пользователя."}, 400)
                return
            profile = database.get_user_profile(username)
            if profile:
                self.send_json({"success": True, "user": profile})
            else:
                self.send_json({"success": False, "error": "Пользователь не найден."}, 404)
            return

        elif path == "/api/client/status":
            exe_path = os.path.join(DOWNLOADS_DIR, "Kinetix-Launcher.exe")
            jar_path = os.path.join(DOWNLOADS_DIR, "Kinetix-Client.jar")
            size = os.path.getsize(exe_path) if os.path.isfile(exe_path) else (os.path.getsize(jar_path) if os.path.isfile(jar_path) else 0)
            self.send_json({
                "success": True,
                "client_name": "Kinetix Client",
                "version": "1.2.0",
                "mc_version": "1.21.4 (Fabric)",
                "launcher_size": size,
                "download_url": "/downloads/Kinetix-Launcher.exe"
            })
            return

        elif path == "/api/admin/users":
            users = database.list_all_users()
            self.send_json({"success": True, "users": users})
            return

        elif path == "/api/ping":
            self.send_json({"status": "online", "service": "Kinetix Web API"})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        data = self.read_json_body()

        if path in ["/api/auth/login", "/api/auth"]:
            login = str(data.get("login") or data.get("username") or "").strip()
            password = str(data.get("password") or "").strip()
            hwid = str(data.get("hwid") or "").strip()

            success, msg, user = database.authenticate(login, password, hwid)
            if success:
                self.send_json({"success": True, "message": msg, "user": user})
            else:
                self.send_json({"success": False, "error": msg}, 401)
            return

        elif path == "/api/auth/register":
            username = str(data.get("username") or "").strip()
            password = str(data.get("password") or "").strip()
            email = str(data.get("email") or "").strip()
            hwid = str(data.get("hwid") or "").strip()

            success, msg, user = database.register(username, password, email, hwid)
            if success:
                self.send_json({"success": True, "message": msg, "user": user})
            else:
                self.send_json({"success": False, "error": msg}, 400)
            return

        elif path == "/api/user/activate-key":
            username = str(data.get("username") or "").strip()
            key_str = str(data.get("key") or "").strip()
            if not username or not key_str:
                self.send_json({"success": False, "error": "Укажите имя пользователя и ключ."}, 400)
                return

            success, msg = database.activate_license_key(username, key_str)
            updated_profile = database.get_user_profile(username) if success else None
            self.send_json({"success": success, "message": msg, "user": updated_profile})
            return

        elif path == "/api/user/reset-hwid":
            username = str(data.get("username") or "").strip()
            new_hwid = str(data.get("new_hwid") or "").strip()
            charge_fee = bool(data.get("charge_fee", True))
            fee_amount = float(data.get("fee_amount", 150.0))
            success, msg = database.reset_hwid(
                username, new_hwid, ip=self.client_address[0],
                charge_fee=charge_fee, fee_amount=fee_amount
            )
            updated_profile = database.get_user_profile(username)
            self.send_json({"success": success, "message": msg, "user": updated_profile})
            return

        elif path == "/api/user/add-balance":
            username = str(data.get("username") or "").strip()
            amount = float(data.get("amount") or 0)
            if amount <= 0:
                self.send_json({"success": False, "message": "Сумма пополнения должна быть больше 0 ₽."})
                return
            success, msg = database.add_user_balance(
                username, amount, reason="Пополнение через личный кабинет", ip=self.client_address[0]
            )
            updated_profile = database.get_user_profile(username)
            self.send_json({"success": success, "message": msg, "user": updated_profile})
            return

        elif path == "/api/admin/create-key":
            plan = str(data.get("plan", "30 DAYS"))
            days = int(data.get("days", 30))
            custom_key = str(data.get("custom_key", "")).strip().upper()
            import random, string
            if custom_key:
                key_str = custom_key
            else:
                key_str = f"KINETIX-{plan.replace(' ', '')[:4]}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"
            conn = database.get_connection()
            cur = conn.cursor()
            cur.execute("INSERT OR IGNORE INTO license_keys (key, plan, duration_days, is_used) VALUES (?, ?, ?, 0)", (key_str, plan, days))
            conn.commit()
            conn.close()
            self.send_json({"success": True, "key": key_str, "plan": plan, "days": days})
            return

        else:
            self.send_error(404, "Endpoint not found")

class ThreadingDualServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run_server(port=PORT, open_browser=False):
    os.chdir(WEB_DIR)
    chosen_port = port
    server = None
    for p in range(port, port + 20):
        try:
            server = ThreadingDualServer(("", p), KinetixAPIHandler)
            chosen_port = p
            break
        except OSError:
            continue

    if not server:
        print(f"[!] Ошибка: не удалось привязать порт от {port} до {port+20}")
        sys.exit(1)

    url = f"http://localhost:{chosen_port}"
    print(f"[*] Kinetix Web & API Server запущен на: {url}")
    print(f"[*] Личный кабинет: {url}/dashboard.html")
    print("[*] Для остановки сервера нажмите Ctrl+C")

    if open_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Остановка сервера...")
        server.shutdown()

if __name__ == "__main__":
    open_b = "--open" in sys.argv or "-o" in sys.argv
    run_server(PORT, open_browser=open_b)
