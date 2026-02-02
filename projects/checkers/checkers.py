import os
from flask import Flask, send_from_directory

app = Flask(__name__)

# Use absolute path based on the script location to avoid hardcoding user paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:filename>")
def serve_files(filename):
    return send_from_directory(BASE_DIR, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
