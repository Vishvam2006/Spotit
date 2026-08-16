#!/usr/bin/env python3
"""
Interactive Web Verification Tester
Serves a local web interface on http://localhost:8000 to upload ID photos and test verification.
Compatible with Python 3.13+.
"""

import sys
import os
import json
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from email.parser import BytesParser
from email.policy import default

sys.path.insert(0, str(Path(__file__).parent))

from app.verification.engine import VerificationEngine
from app.models.schemas import AccountData

PORT = 8080

def run_server():
    port = PORT
    server = None
    for p in range(port, port + 10):
        try:
            server = HTTPServer(("0.0.0.0", p), SimpleHandler)
            port = p
            break
        except OSError:
            continue

    if not server:
        print("❌ Could not find an open port between 8080 and 8090", file=sys.stderr)
        sys.exit(1)

    print(f"\n=======================================================")
    print(f"🚀 AI Verification Engine Web Tester Started!")
    print(f"👉 Open in browser: http://localhost:{port}")
    print(f"=======================================================\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()

HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Document Verification Tester</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --accent: #38bdf8;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
    body { background-color: var(--bg); color: var(--text); display: flex; justify-content: center; padding: 40px 20px; min-height: 100vh; }
    .container { width: 100%; max-width: 680px; }
    .header { text-align: center; margin-bottom: 25px; }
    .header h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
    .header p { color: var(--text-muted); font-size: 14px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
    .form-group { margin-bottom: 18px; }
    label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    input[type="text"], input[type="date"], input[type="file"] {
      width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    input[type="text"]:focus, input[type="date"]:focus { border-color: var(--accent); }
    .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #0284c7, #2563eb); border: none; border-radius: 10px; color: white; font-weight: 600; font-size: 16px; cursor: pointer; transition: opacity 0.2s; margin-top: 10px; }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .result-box { margin-top: 25px; display: none; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 14px; margin-bottom: 15px; }
    .badge.VERIFIED { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid #22c55e; }
    .badge.MISMATCH { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
    .badge.EXPIRED { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
    .badge.UNKNOWN_DOCUMENT, .badge.OCR_FAILED { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid #64748b; }
    .checks-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
    .check-card { background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid var(--border); text-align: center; }
    .check-card .title { font-size: 11px; text-transform: uppercase; color: var(--text-muted); }
    .check-card .val { font-weight: 600; font-size: 13px; margin-top: 4px; }
    pre { background: #0f172a; padding: 15px; border-radius: 10px; border: 1px solid var(--border); font-size: 12px; color: #a5f3fc; overflow-x: auto; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🪪 AI ID Verification Tester</h1>
      <p>Select your Driving Licence or RC photo to test document verification AI against account data.</p>
    </div>

    <div class="card">
      <form id="verifyForm">
        <div class="form-group">
          <label>Choose ID Photo / PDF File</label>
          <input type="file" id="docFile" accept="image/*,.pdf" required>
        </div>

        <div class="form-group">
          <label>Account Holder Name</label>
          <input type="text" id="accName" value="ARYAN PATEL" placeholder="e.g. ARYAN PATEL" required>
        </div>

        <div class="form-group">
          <label>Account Date of Birth (for DL)</label>
          <input type="date" id="accDob" value="2005-04-12">
        </div>

        <div class="form-group">
          <label>Vehicle Registration Number (for RC)</label>
          <input type="text" id="accVehicle" value="GJ01AB1234" placeholder="e.g. GJ01AB1234">
        </div>

        <div class="form-group">
          <label>Groq API Key (Optional)</label>
          <input type="text" id="groqKey" placeholder="gsk_... (Leave blank to use .env key or rule engine)">
        </div>

        <button type="submit" class="btn" id="submitBtn">⚡ Verify ID Document</button>
      </form>

      <div class="result-box" id="resultBox">
        <hr style="border-color: var(--border); margin: 20px 0;">
        <h3 style="margin-bottom: 10px; font-size: 16px;">Verification Output:</h3>
        <div id="badgeContainer"></div>
        <div id="summaryMsg" style="font-size: 14px; color: var(--text-muted);"></div>

        <div class="checks-grid" id="checksGrid"></div>

        <pre id="jsonOutput"></pre>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('verifyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const resBox = document.getElementById('resultBox');
      btn.disabled = true;
      btn.innerText = '🔄 Running AI & Verification Engine...';
      resBox.style.display = 'none';

      const formData = new FormData();
      formData.append('document', document.getElementById('docFile').files[0]);
      formData.append('name', document.getElementById('accName').value);
      formData.append('dob', document.getElementById('accDob').value);
      formData.append('vehicle', document.getElementById('accVehicle').value);
      formData.append('groqKey', document.getElementById('groqKey').value);

      try {
        const response = await fetch('/api/verify', { method: 'POST', body: formData });
        const data = await response.json();

        resBox.style.display = 'block';
        document.getElementById('badgeContainer').innerHTML = `<span class="badge ${data.status}">${data.status} (${data.document_type})</span>`;
        document.getElementById('summaryMsg').innerText = data.message || '';

        let checksHtml = '';
        if (data.checks) {
          for (const [k, v] of Object.entries(data.checks)) {
            checksHtml += `<div class="check-card"><div class="title">${k}</div><div class="val">${v}</div></div>`;
          }
        }
        document.getElementById('checksGrid').innerHTML = checksHtml;
        document.getElementById('jsonOutput').innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        alert('Error processing document: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = '⚡ Verify ID Document';
      }
    });
  </script>
</body>
</html>
"""


def parse_multipart(content_type: str, body: bytes):
    """
    Standard multipart/form-data parser for Python 3.13+.
    """
    msg_headers = f"Content-Type: {content_type}\r\n\r\n".encode("utf-8")
    msg = BytesParser(policy=default).parsebytes(msg_headers + body)

    fields = {}
    files = {}

    for part in msg.iter_parts():
        disp = part.get("Content-Disposition", "")
        if "form-data" in disp:
            name_m = re.search(r'name="([^"]+)"', disp)
            filename_m = re.search(r'filename="([^"]+)"', disp)

            if name_m:
                field_name = name_m.group(1)
                if filename_m:
                    files[field_name] = {
                        "filename": filename_m.group(1),
                        "content": part.get_payload(decode=True)
                    }
                else:
                    payload = part.get_payload(decode=True)
                    fields[field_name] = payload.decode("utf-8", errors="ignore").strip() if payload else ""

    return fields, files


class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ["/", "/index.html"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/verify":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                content_type = self.headers.get("Content-Type", "")

                fields, files = parse_multipart(content_type, body)

                if "document" not in files:
                    raise ValueError("No document file uploaded")

                file_obj = files["document"]
                doc_bytes = file_obj["content"]
                filename = file_obj["filename"]

                name = fields.get("name", "")
                dob = fields.get("dob") or None
                vehicle = fields.get("vehicle") or None
                groq_key = fields.get("groqKey") or None

                account_data = AccountData(
                    name=name,
                    date_of_birth=dob,
                    vehicle_registration_number=vehicle
                )

                engine = VerificationEngine(groq_api_key=groq_key)
                result = engine.verify(
                    document=doc_bytes,
                    account_data=account_data,
                    filename=filename
                )

                response_data = result.model_dump()

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode("utf-8"))

            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_error(404)



if __name__ == "__main__":
    run_server()
