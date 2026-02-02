"""
Tic Tac Toe - Flask Server
Serves the static game files from the same directory as this script.

Usage:
    python tic-tac-toe.py

Server will be available at http://localhost:5000
"""
import os
from flask import Flask, send_from_directory

app = Flask(__name__)

# Get the directory where this script is located (portable)
WEB_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")

@app.route("/<path:filename>")
def serve_files(filename):
    try:
        return send_from_directory(WEB_DIR, filename)
    except FileNotFoundError:
        return "File not found", 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
