import os
import json
import requests
from tempfile import NamedTemporaryFile
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from analyze_docx import analyze, aggregate, load_paragraphs

app = FastAPI(
    title="AI Plag Analyzer Backend",
    description="Accepts Word document uploads and returns AI + plagiarism analysis results.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def write_temp_docx(file_bytes: bytes) -> str:
    temp_file = NamedTemporaryFile(delete=False, suffix=".docx")
    temp_file.write(file_bytes)
    temp_file.flush()
    temp_file.close()
    return temp_file.name


def cleanup_temp_file(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


def send_text_to_external_api(text: str) -> Optional[Dict[str, Any]]:
    """Send the extracted document text to your paid API provider.

    Replace the body of this function with the exact request your API requires.
    The code below is a generic starting point using JSON POST and bearer auth.
    """
    api_url = os.getenv("ANALYSIS_API_URL")
    api_key = os.getenv("ANALYSIS_API_KEY")
    if not api_url:
        return None

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "text": text,
        "features": ["plagiarism", "ai_detection"],
    }

    extra_fields = os.getenv("ANALYSIS_API_EXTRA")
    if extra_fields:
        try:
            body.update(json.loads(extra_fields))
        except json.JSONDecodeError:
            pass

    response = requests.post(api_url, json=body, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def extract_value(response: Dict[str, Any], paths: List[str]) -> Optional[Any]:
    for path in paths:
        parts = path.split(".")
        current = response
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                break
        else:
            return current
    return None


def normalize_external_response(response: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(response, dict):
        return {}

    ai_score = extract_value(response, ["ai_score", "ai.score", "score", "ai_percentage", "ai.percent"])
    plag_score = extract_value(response, ["plagiarism_score", "plagiarism.score", "plag.score", "plagiarism_percentage"])
    ai_label = extract_value(response, ["ai_label", "ai.label", "label"])
    plag_label = extract_value(response, ["plagiarism_label", "plagiarism.label", "plag.label"])

    results = []
    raw_items = extract_value(response, ["paragraphs", "results", "items"]) or []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            results.append({
                "ai_score": extract_value(item, ["ai_score", "ai.score", "score"]),
                "plagiarism_score": extract_value(item, ["plagiarism_score", "plagiarism.score", "plag.score"]),
                "ai_label": extract_value(item, ["ai_label", "ai.label", "label"]),
                "plagiarism_label": extract_value(item, ["plagiarism_label", "plagiarism.label"]),
                "reason": extract_value(item, ["reason", "explanation", "details"]),
            })

    return {
        "ai_score": float(ai_score) if ai_score is not None else None,
        "plagiarism_score": float(plag_score) if plag_score is not None else None,
        "ai_label": ai_label,
        "plagiarism_label": plag_label,
        "items": results,
    }


@app.get("/analyze")
def analyze_info():
    return {
        "status": "ok",
        "message": "Use POST /analyze with a multipart/form-data file upload to analyze a .docx document.",
    }


@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    file_bytes = await file.read()
    temp_path = write_temp_docx(file_bytes)

    try:
        paragraphs = load_paragraphs(temp_path)
        if not paragraphs:
            raise HTTPException(status_code=400, detail="The uploaded document contains no readable paragraphs.")

        document_text = "\n\n".join(p["text"] for p in paragraphs)
        external_data = None
        external_error = None

        try:
            raw_response = send_text_to_external_api(document_text)
            if raw_response:
                external_data = normalize_external_response(raw_response)
        except Exception as exc:
            external_error = str(exc)

        heuristic_results = analyze(paragraphs, use_openai=False)
        constructed_results = []

        external_items = external_data.get("items", []) if external_data else []
        for idx, paragraph in enumerate(heuristic_results):
            item_data = external_items[idx] if idx < len(external_items) else {}
            score = item_data.get("ai_score")
            if score is None:
                score = paragraph["score"]

            constructed_results.append({
                "index": paragraph["index"],
                "text": paragraph["text"],
                "length": paragraph["length"],
                "score": float(score),
                "label": item_data.get("ai_label") or paragraph["label"],
                "reason": item_data.get("reason") or paragraph["reason"],
                "plagiarism_score": item_data.get("plagiarism_score"),
                "plagiarism_label": item_data.get("plagiarism_label"),
            })

        summary = {
            "overall_score": external_data.get("ai_score") if external_data and external_data.get("ai_score") is not None else aggregate(heuristic_results)["overall_score"],
            "plagiarism_score": external_data.get("plagiarism_score"),
            "ai_label": external_data.get("ai_label"),
            "plagiarism_label": external_data.get("plagiarism_label"),
        }

        return JSONResponse(
            content={
                "results": constructed_results,
                "aggregate": summary,
                "external_source": bool(external_data),
                "external_error": external_error,
            }
        )
    finally:
        cleanup_temp_file(temp_path)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "AI Plag Analyzer backend is running."}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
