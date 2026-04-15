"""
Verify router — POST /verify endpoint with SSE streaming.
Also includes POST /verify-upload for file-based verification.
"""

import os
import uuid
import asyncio
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional

from app.pipeline.graph import run_pipeline, create_event_queue, get_event_queue, remove_event_queue
from app.tools.file_processor import process_uploaded_file


router = APIRouter()
REPORTS_DIR = "reports"


@router.get("/download/pdf/{session_id}")
async def download_pdf(session_id: str):
    """Download the PDF report for a session."""
    file_path = os.path.join(REPORTS_DIR, f"report_{session_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF report not found")
    return FileResponse(file_path, filename=f"PramanAI_Report_{session_id}.pdf")


@router.get("/download/ppt/{session_id}")
async def download_ppt(session_id: str):
    """Download the PPT report for a session."""
    file_path = os.path.join(REPORTS_DIR, f"report_{session_id}.pptx")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PPT report not found")
    return FileResponse(file_path, filename=f"PramanAI_Report_{session_id}.pptx")


class VerifyRequest(BaseModel):
    """Request body for the /verify endpoint."""
    text: Optional[str] = None
    url: Optional[str] = None


def _create_sse_response(session_id: str, event_queue: asyncio.Queue) -> StreamingResponse:
    """Create an SSE streaming response from a pipeline event queue."""
    async def event_generator():
        """Generate SSE events from the pipeline queue."""
        try:
            while True:
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=300.0)
                except asyncio.TimeoutError:
                    yield "event: error\ndata: {\"message\": \"Pipeline timeout\"}\n\n"
                    break
                
                if event is None:
                    break
                
                yield event
        finally:
            remove_event_queue(session_id)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/verify")
async def verify_claim(request: VerifyRequest):
    """
    POST /verify — Run the fact-checking pipeline and stream results via SSE.
    
    Accepts:
        - text: Plain text to verify
        - url: URL to fetch and verify
        (at least one must be provided)
    
    Returns:
        SSE stream with events:
        - pipeline_step: Step progress updates
        - complete: Final report
        - error: Error events
    """
    if not request.text and not request.url:
        return {"error": "Please provide either 'text' or 'url' to verify."}
    
    session_id = str(uuid.uuid4())
    event_queue = create_event_queue(session_id)
    
    asyncio.create_task(
        run_pipeline(
            input_text=request.text or "",
            input_url=request.url,
            session_id=session_id,
        )
    )
    
    return _create_sse_response(session_id, event_queue)


@router.post("/verify-upload")
async def verify_upload(
    file: UploadFile = File(...),
    source_type: str = Form("document"),
):
    """
    POST /verify-upload — Upload a file, extract text, and run fact-checking pipeline.
    
    Accepts (multipart/form-data):
        - file: The uploaded file (PDF, DOCX, TXT, image, audio)
        - source_type: Hint for processing ('document', 'image', 'audio')
    
    Returns:
        SSE stream with events (same as /verify)
    """
    # Read file content
    file_bytes = await file.read()
    
    if not file_bytes:
        return {"error": "Empty file uploaded."}
    
    # Process the file to extract text
    process_result = await process_uploaded_file(
        file_bytes=file_bytes,
        filename=file.filename or "uploaded_file",
        content_type=file.content_type,
        source_type=source_type,
    )
    
    extracted_text = process_result.get("text", "")
    
    if not extracted_text or extracted_text.startswith("[Error"):
        error_msg = process_result.get("error") or "Could not extract text from the uploaded file."
        return {"error": error_msg}
    
    # Prepend source info for context
    source_info = process_result.get("source_info", {})
    header = f"[Source: {source_info.get('filename', 'uploaded file')} ({source_info.get('file_type', 'unknown')})]\n\n"
    full_text = header + extracted_text
    
    # Run the pipeline
    session_id = str(uuid.uuid4())
    event_queue = create_event_queue(session_id)
    
    asyncio.create_task(
        run_pipeline(
            input_text=full_text,
            session_id=session_id,
            structured_content=process_result.get("structured_content"),
        )
    )
    
    return _create_sse_response(session_id, event_queue)
