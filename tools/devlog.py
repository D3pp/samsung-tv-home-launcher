# Receives the launcher's development log from the TV and appends it to logs/tv.jsonl.
#   python3 tools/devlog.py            (listens on port 8790)
# Then set CONFIG.devLogUrl to 'http://<this computer's IP>:8790/log' and redeploy.
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs', 'tv.jsonl')
os.makedirs(os.path.dirname(LOG), exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = min(int(self.headers.get('Content-Length', 0)), 1_000_000)
        body = self.rfile.read(length).decode('utf-8', 'replace')
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(body.rstrip('\n') + '\n')
        print(body, flush=True)
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, *args):
        pass


print('devlog listening on port %d, writing %s' % (PORT, os.path.normpath(LOG)), flush=True)
HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
