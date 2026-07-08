# AI detection for Word documents

This project analyzes .docx files and highlights likely AI-generated paragraphs.

Quick start

1. Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Set environment variables for the external API and optional OpenAI integration.

```powershell
$env:ANALYSIS_API_URL = 'https://your-provider.com/analyze'
$env:ANALYSIS_API_KEY = 'your-api-key'
$env:OPENAI_API_KEY = 'sk-...'
```

3. Install dependencies and run the backend server:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

> If the backend reports `Form data requires "python-multipart"`, install it with `pip install python-multipart` and rerun.

4. Run the frontend during development:

```powershell
cd frontend
npm install
npm run dev
```

5. Upload a `.docx` document through the frontend and inspect results.

6. If you only want to run the local analyzer without the external API, leave `ANALYSIS_API_URL` unset.

7. Run the analyzer:

```powershell
python analyze_docx.py input.docx --output report.html --json results.json
```

If no OpenAI key or package is present, the script uses a lightweight heuristic fallback.

Outputs
- `report.html`: colored HTML report with paragraph-level scores
- `results.json`: structured JSON with scores and reasons
