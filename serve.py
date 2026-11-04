"""Servidor local do Flowline (sem cache, para ver mudanças na hora).
Uso: python serve.py  →  http://127.0.0.1:8765
"""
import http.server
import os
import socketserver

PORT = 8765
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        # permite que o editor do Apps Script busque gas/*.gs|html durante o deploy
        if self.path.startswith("/gas/"):
            self.send_header("Access-Control-Allow-Origin", "https://script.google.com")
            self.send_header("Access-Control-Allow-Private-Network", "true")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()


with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), NoCache) as httpd:
    print(f"Flowline at http://127.0.0.1:{PORT}")
    httpd.serve_forever()
