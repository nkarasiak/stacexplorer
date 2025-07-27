#!/usr/bin/env python3
"""
Static server with URL rewriting for STAC Explorer
Supports clean URLs like /catalog/collection/item/ that route to the SPA
"""

import http.server
import socketserver
import os
import urllib.parse
import mimetypes
from pathlib import Path

class STACExplorerHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler that supports SPA routing"""
    
    def __init__(self, *args, **kwargs):
        # Ensure proper MIME types for JavaScript modules
        if not hasattr(self, 'extensions_map'):
            self.extensions_map = {}
        self.extensions_map.update({
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.json': 'application/json',
            '.css': 'text/css',
            '.html': 'text/html',
        })
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def do_GET(self):
        """Handle GET requests with URL rewriting for SPA routes"""
        
        # Parse the URL
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Remove leading slash for easier handling
        clean_path = path.lstrip('/')
        
        # Debug: print(f"Request: {path} -> clean_path: '{clean_path}'")
        
        # Static file extensions to serve directly
        static_extensions = {
            '.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', 
            '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map'
        }
        
        # Check if it's a static file request
        file_path = Path(clean_path)
        has_extension = file_path.suffix.lower() in static_extensions
        file_exists = file_path.exists()
        
        # Debug: print(f"  File check: extension='{file_path.suffix}' in static={has_extension}, exists={file_exists}")
        
        if has_extension and file_exists:
            # Debug: print(f"  -> Serving static file: {clean_path}")
            # Serve static files normally
            return super().do_GET()
        elif has_extension and not file_exists:
            # Debug: print(f"  -> Static file not found: {clean_path}")
            # File doesn't exist, return 404
            return super().do_GET()
        
        # Handle SPA routes that should serve index.html
        spa_routes = [
            'view',     # /view and /view/...
            'browser',  # /browser and /browser/...
            'catalog',  # Legacy /catalog/... routes (will be redirected)
        ]
        
        # Check if this is an SPA route
        is_spa_route = False
        if clean_path == '' or clean_path == 'index.html':
            # Root path - serve index.html
            # Debug: print("  -> Root path - serving index.html")
            is_spa_route = True
        elif any(clean_path.startswith(route) for route in spa_routes):
            # SPA routes
            # Debug: print(f"  -> SPA route detected: {clean_path}")
            is_spa_route = True
        
        if is_spa_route:
            # Serve index.html for SPA routes
            # Debug: print(f"  -> Serving index.html for SPA route: {clean_path}")
            self.path = '/index.html'
            return super().do_GET()
        
        # For all other cases, try to serve the file normally
        # If it doesn't exist, it will return 404
        # Debug: print(f"  -> No route matched, serving normally: {clean_path}")
        return super().do_GET()
    
    def end_headers(self):
        """Add CORS headers for development"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Custom log format"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server(port=8000, directory=None):
    """Run the static server"""
    
    if directory:
        os.chdir(directory)
    
    # Ensure we're in the right directory
    if not os.path.exists('index.html'):
        print("Warning: index.html not found in current directory")
        print(f"Current directory: {os.getcwd()}")
        print("Make sure to run this from your STAC Explorer root directory")
    
    try:
        with socketserver.TCPServer(("", port), STACExplorerHTTPRequestHandler) as httpd:
            print(f"STAC Explorer server running at http://localhost:{port}")
            print(f"Serving directory: {os.getcwd()}")
            print("\nExample clean URLs:")
            print("\nSearch/Visualization Mode (/view/):")
            print(f"   - http://localhost:{port}/view")
            print(f"   - http://localhost:{port}/view/search")
            print(f"   - http://localhost:{port}/view/collection/sentinel-2-l2a")
            print(f"   - http://localhost:{port}/view/item/LC08_L2SP_199024_20220101_20220101_02_T1")
            print("\nCatalog Browser Mode (/browser/):")
            print(f"   - http://localhost:{port}/browser")
            print(f"   - http://localhost:{port}/browser/cdse-stac")
            print(f"   - http://localhost:{port}/browser/earth-search-aws/sentinel-2-l2a")
            print(f"   - http://localhost:{port}/browser/microsoft-pc/landsat-c2-l2/LC08_L2SP_199024_20220101_20220101_02_T1")
            print("\nSPA routing enabled - all /view/* and /browser/* URLs will serve index.html")
            print("   Press Ctrl+C to stop the server\n")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use. Try a different port:")
            print(f"   python server.py --port {port + 1}")
        else:
            print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='STAC Explorer Static Server with SPA routing')
    parser.add_argument('--port', '-p', type=int, default=8000, 
                       help='Port to serve on (default: 8000)')
    parser.add_argument('--directory', '-d', type=str, 
                       help='Directory to serve from (default: current directory)')
    
    args = parser.parse_args()
    
    run_server(args.port, args.directory)