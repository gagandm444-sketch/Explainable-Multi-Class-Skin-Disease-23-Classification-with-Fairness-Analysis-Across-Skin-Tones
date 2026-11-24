#!/usr/bin/env python
"""
SkinFairness-AI Web Application Server Runner
Compatible with both Python 2.7 and Python 3.x
Serves the web application at http://localhost:8080
"""
from __future__ import print_function
import sys
import os
import webbrowser

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

print("=" * 70)
print("  SkinFairness-AI: Explainable Multi-Class Skin Disease 23 Classification")
print("  with Fairness Analysis Across Skin Tones")
print("=" * 70)
print("Starting local HTTP server on http://localhost:{} ...".format(PORT))
print("Serving files from: {}".format(DIRECTORY))
print("Press Ctrl+C to stop the server.")
print("-" * 70)

os.chdir(DIRECTORY)

try:
    if sys.version_info[0] < 3:
        # Python 2
        import SimpleHTTPServer
        import SocketServer
        Handler = SimpleHTTPServer.SimpleHTTPRequestHandler
        httpd = SocketServer.TCPServer(("", PORT), Handler)
    else:
        # Python 3
        import http.server
        import socketserver
        Handler = http.server.SimpleHTTPRequestHandler
        httpd = socketserver.TCPServer(("", PORT), Handler)

    print("Server active at: http://localhost:{}".format(PORT))
    httpd.serve_forever()

except KeyboardInterrupt:
    print("\nServer stopped gracefully.")
    sys.exit(0)
except Exception as e:
    print("\nError launching server: {}".format(e))
    sys.exit(1)
