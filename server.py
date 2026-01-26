#!/usr/bin/env python3
"""
Simple proxy server for DWD pollen data
Serves both the static site and acts as a CORS proxy for the DWD API
"""

import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import os
import mimetypes

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the request URL
        path = urlparse(self.path).path
        
        print(f"[REQUEST] GET {path}")
        
        # Route: /api/dwd-pollen - proxy to DWD API
        if path == '/api/dwd-pollen':
            self._handle_dwd_proxy()
            return
        
        # Serve static files
        self._serve_file(path)
    
    def _handle_dwd_proxy(self):
        """Fetch DWD data and serve with CORS headers"""
        try:
            print(f"[DWD PROXY] Fetching from DWD...")
            
            url = 'https://opendata.dwd.de/climate_environment/health/alerts/s31fg.json'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read()
            
            # Send response with CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Cache-Control', 'max-age=3600')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            
            print(f"[DWD PROXY] ✅ Success ({len(data)} bytes)")
        except Exception as e:
            print(f"[DWD PROXY] ❌ Error: {e}")
            error_msg = json.dumps({'error': str(e)}).encode()
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(error_msg)))
            self.end_headers()
            self.wfile.write(error_msg)
    
    def _serve_file(self, path):
        """Serve static files"""
        # Clean up path
        if path == '/':
            path = '/index.html'
        
        # Security: prevent directory traversal
        filepath = os.path.join(os.getcwd(), path.lstrip('/'))
        filepath = os.path.normpath(filepath)
        
        if not os.path.abspath(filepath).startswith(os.getcwd()):
            self.send_response(403)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Forbidden')
            return
        
        if os.path.isfile(filepath):
            try:
                with open(filepath, 'rb') as f:
                    data = f.read()
                
                mime_type, _ = mimetypes.guess_type(filepath)
                if mime_type is None:
                    mime_type = 'application/octet-stream'
                
                self.send_response(200)
                self.send_header('Content-Type', mime_type)
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                print(f"[FILE] Error reading {filepath}: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Server error')
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'File not found')
            print(f"[FILE] Not found: {filepath}")
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Suppress default logging - we use our own"""
        pass

if __name__ == '__main__':
    # Change to the script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    HOST = 'localhost'
    PORT = 8000
    
    server = HTTPServer((HOST, PORT), ProxyHandler)
    print(f"🌍 Server running at http://{HOST}:{PORT}")
    print(f"📡 DWD Pollen API proxied at http://{HOST}:{PORT}/api/dwd-pollen")
    print(f"📂 Serving files from {os.getcwd()}")
    print("Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✋ Server stopped")

