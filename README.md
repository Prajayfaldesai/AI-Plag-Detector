# AI detection for Word documents

This project analyzes .docx files and highlights likely AI-generated paragraphs.

Quick start

1. Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. (Optional) Set `OPENAI_API_KEY` to enable OpenAI-based classification:

```powershell
$env:OPENAI_API_KEY = 'sk-...'
```

3. Run the analyzer:

```powershell
python analyze_docx.py input.docx --output report.html --json results.json
```

If no OpenAI key or package is present, the script uses a lightweight heuristic fallback.

Outputs
- `report.html`: colored HTML report with paragraph-level scores
- `results.json`: structured JSON with scores and reasons
