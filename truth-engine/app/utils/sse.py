"""
SSE (Server-Sent Events) formatter utility.
Formats pipeline events for streaming to the frontend.
"""

import json
from typing import Any, Optional


def format_sse_event(
    event_type: str,
    data: Any,
    event_id: Optional[str] = None
) -> str:
    """
    Format a Server-Sent Event string.
    
    Args:
        event_type: The event name (e.g., 'step_start', 'claims_extracted')
        data: The data payload (will be JSON serialized)
        event_id: Optional event ID for client-side tracking
        
    Returns:
        Formatted SSE string ready to be sent via StreamingResponse
    """
    lines = []
    
    if event_id:
        lines.append(f"id: {event_id}")
    
    lines.append(f"event: {event_type}")
    
    # Serialize data to JSON
    if isinstance(data, str):
        json_data = data
    else:
        json_data = json.dumps(data, default=str)
    
    lines.append(f"data: {json_data}")
    lines.append("")  # Empty line to terminate the event
    lines.append("")  # Double newline separator
    
    return "\n".join(lines)


def format_step_event(step: str, status: str, detail: Any = None) -> str:
    """
    Convenience wrapper for pipeline step events.
    """
    payload = {
        "step": step,
        "status": status,
    }
    if detail is not None:
        payload["detail"] = detail
    
    return format_sse_event("pipeline_step", payload)


def format_error_event(message: str, step: str = "unknown") -> str:
    """
    Format an error event.
    """
    return format_sse_event("error", {
        "step": step,
        "message": message
    })


def format_complete_event(report: Any) -> str:
    """
    Format the final completion event with the full report.
    """
    return format_sse_event("complete", report)
