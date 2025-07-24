#!/usr/bin/env python3
"""
Enhanced HTTP server for STAC Explorer with proper MIME type handling
Fixes issues with ES modules and CSS loading in browsers
"""

import http.server
import socketserver
import mimetypes
import os
import sys
from urllib.parse import urlparse

class STACExplorerHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Enhanced request handler with proper MIME types for modern web apps"""
    
    def __init__(self, *args, **kwargs):
        # Add custom MIME types for modern web development
        mimetypes.add_type('application/javascript', '.js')
        mimetypes.add_type('application/javascript', '.mjs')
        mimetypes.add_type('text/css', '.css')
        mimetypes.add_type('application/json', '.json')
        mimetypes.add_type('image/svg+xml', '.svg')
        mimetypes.add_type('font/woff2', '.woff2')
        mimetypes.add_type('font/woff', '.woff')
        super().__init__(*args, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for API calls and assets
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Add cache control for better performance
        if self.path.endswith(('.js', '.css', '.png', '.jpg', '.svg', '.woff', '.woff2')):
            self.send_header('Cache-Control', 'public, max-age=3600')
        else:
            self.send_header('Cache-Control', 'no-cache')
            
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight requests for CORS
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        # Enhanced logging with file types
        path = args[1] if len(args) > 1 else "unknown"
        if path.endswith('.js'):
            file_type = "[JS]"
        elif path.endswith('.css'):
            file_type = "[CSS]"
        elif path.endswith(('.png', '.jpg', '.svg')):
            file_type = "[IMG]"
        else:
            file_type = "[HTML]"
        
        print(f"{file_type} {format % args}")

def run_server(port=8000, directory="."):
    """Run the enhanced HTTP server"""
    
    # Change to the specified directory
    os.chdir(directory)
    
    # Create the server
    with socketserver.TCPServer(("", port), STACExplorerHTTPRequestHandler) as httpd:
        print(f"STAC Explorer Server")
        print(f"Serving: {os.getcwd()}")
        print(f"URL: http://localhost:{port}")
        print(f"Network: http://{get_local_ip()}:{port}")
        print(f"Features: ES Modules, CORS, Proper MIME types")
        print(f"Press Ctrl+C to stop\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            sys.exit(0)

def get_local_ip():
    """Get the local IP address for network access"""
    import socket
    try:
        # Connect to a remote address to determine local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except:
        return "localhost"

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="STAC Explorer HTTP Server")
    parser.add_argument("-p", "--port", type=int, default=8000, 
                       help="Port to serve on (default: 8000)")
    parser.add_argument("-d", "--directory", default=".", 
                       help="Directory to serve (default: current)")
    
    args = parser.parse_args()
    
    run_server(args.port, args.directory)