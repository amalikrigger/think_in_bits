import os
from flask import Flask, send_from_directory

app = Flask(__name__)

WEB_DIR = os.path.dirname(os.path.abspath(__file__))  # Path to your webpage folder

@app.route("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")

@app.route("/<path:filename>")
def serve_files(filename):
    return send_from_directory(WEB_DIR, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
