"""
Bouncing Cat Web Server
A simple Flask server to serve the bouncing cat animation.
"""

import os
from flask import Flask, send_from_directory

app = Flask(__name__)

# Use the directory where this script is located
WEB_DIR = os.path.dirname(os.path.abspath(__file__))


@app.route("/")
def index():
    """Serve the main index.html page."""
    return send_from_directory(WEB_DIR, "index.html")


@app.route("/<path:filename>")
def serve_files(filename):
    """Serve static files (CSS, JS, images, etc.)."""
    return send_from_directory(WEB_DIR, filename)


if __name__ == "__main__":
    print(f"🐱 Bouncing Cat server starting...")
    print(f"📁 Serving files from: {WEB_DIR}")
    print(f"🌐 Open http://localhost:5000 in your browser")
    app.run(host="0.0.0.0", port=5000, debug=True)
