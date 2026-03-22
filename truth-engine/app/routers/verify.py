"""
Verify router — POST /verify endpoint with SSE streaming.
"""

import uuid
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.pipeline.graph import run_pipeline, create_event_queue, get_event_queue, remove_event_queue


router = APIRouter()


class VerifyRequest(BaseModel):
    """Request body for the /verify endpoint."""
    text: Optional[str] = None
    url: Optional[str] = None


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
    
    # Create a unique session ID for this verification request
    session_id = str(uuid.uuid4())
    
    # Create the event queue for SSE streaming
    event_queue = create_event_queue(session_id)
    
    # Start the pipeline in the background
    asyncio.create_task(
        run_pipeline(
            input_text=request.text or "",
            input_url=request.url,
            session_id=session_id,
        )
    )
    
    async def event_generator():
        """Generate SSE events from the pipeline queue."""
        try:
            while True:
                # Wait for the next event (with timeout)
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=300.0)
                except asyncio.TimeoutError:
                    yield "event: error\ndata: {\"message\": \"Pipeline timeout\"}\n\n"
                    break
                
                if event is None:
                    # Pipeline complete — sentinel value
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
