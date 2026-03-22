"""
LangGraph state machine — orchestrates the 3-agent fact-checking pipeline.
Nodes: preprocess → extract → research → verdict → report
"""

import asyncio
from typing import Any, AsyncGenerator
from langgraph.graph import StateGraph, END

from app.pipeline.state import PipelineState
from app.agents.extractor import extract_claims
from app.agents.researcher import research_claims
from app.agents.verdict import generate_verdicts
from app.tools.url_fetcher import fetch_url_content, sanitize_text, estimate_token_count
from app.utils.sse import format_step_event, format_error_event, format_complete_event


# ─── Pipeline Event Queue ──────────────────────────────────────────────
# We use an asyncio queue so the SSE endpoint can yield events as they happen.

_event_queues: dict[str, asyncio.Queue] = {}


def create_event_queue(session_id: str) -> asyncio.Queue:
    """Create an event queue for a pipeline session."""
    queue = asyncio.Queue()
    _event_queues[session_id] = queue
    return queue


def get_event_queue(session_id: str) -> asyncio.Queue | None:
    """Get an event queue for a session."""
    return _event_queues.get(session_id)


def remove_event_queue(session_id: str):
    """Clean up an event queue after the session ends."""
    _event_queues.pop(session_id, None)


async def _emit_event(session_id: str, event: str):
    """Push an SSE event string into the session's queue."""
    queue = get_event_queue(session_id)
    if queue:
        await queue.put(event)


# ─── Pipeline Nodes ────────────────────────────────────────────────────

async def preprocess_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Pre-process step: if a URL was provided, fetch its content.
    Sanitize and validate the text input.
    """
    await _emit_event(session_id, format_step_event("preprocess", "started"))
    
    errors = list(state.get("errors", []))
    input_text = state.get("input_text", "")
    input_url = state.get("input_url")
    url_metadata = None
    
    # If URL provided, fetch content
    if input_url:
        await _emit_event(session_id, format_step_event(
            "preprocess", "in_progress", {"message": f"Fetching URL: {input_url}"}
        ))
        url_result = await fetch_url_content(input_url)
        
        # Always capture metadata for preview card (even if text extraction failed)
        url_metadata = url_result.get("metadata") or {}
        
        if url_result.get("error"):
            errors.append(f"URL fetch error: {url_result['error']}")
        
        if url_result.get("text"):
            input_text = url_result["text"]
            if url_result.get("title"):
                input_text = f"Title: {url_result['title']}\n\n{input_text}"
    
    # Sanitize text
    input_text = sanitize_text(input_text)
    
    if not input_text:
        errors.append("No input text provided or could not be extracted from URL.")
    
    # Token estimation
    token_count = estimate_token_count(input_text)
    
    await _emit_event(session_id, format_step_event(
        "preprocess", "completed",
        {
            "token_estimate": token_count, 
            "text_length": len(input_text),
            "url_metadata": url_metadata
        }
    ))
    
    return {
        **state,
        "input_text": input_text,
        "url_metadata": url_metadata,
        "current_step": "preprocess",
        "errors": errors,
    }


async def extract_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Agent 1 — Extract verifiable claims from the input text.
    """
    await _emit_event(session_id, format_step_event("extract", "started"))
    
    errors = list(state.get("errors", []))
    input_text = state.get("input_text", "")
    
    if not input_text:
        errors.append("Cannot extract claims: no input text available.")
        await _emit_event(session_id, format_error_event("No input text", "extract"))
        return {**state, "claims": [], "current_step": "extract", "errors": errors}
    
    result = await extract_claims(input_text)
    
    claims = result.get("claims", [])
    summary = result.get("summary", "")
    
    if result.get("error"):
        errors.append(f"Extraction error: {result['error']}")
    
    await _emit_event(session_id, format_step_event(
        "extract", "completed",
        {"claims_count": len(claims), "summary": summary, "claims": claims}
    ))
    
    return {
        **state,
        "claims": claims,
        "claims_summary": summary,
        "total_claims": len(claims),
        "current_step": "extract",
        "errors": errors,
    }


async def research_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Agent 2 — Research each claim using Tavily search with self-reflection.
    """
    await _emit_event(session_id, format_step_event("research", "started"))
    
    errors = list(state.get("errors", []))
    claims = state.get("claims", [])
    
    if not claims:
        errors.append("No claims to research.")
        await _emit_event(session_id, format_error_event("No claims", "research"))
        return {**state, "research_results": [], "current_step": "research", "errors": errors}
    
    await _emit_event(session_id, format_step_event(
        "research", "in_progress",
        {"message": f"Researching {len(claims)} claims..."}
    ))
    
    research_results = await research_claims(claims)
    
    await _emit_event(session_id, format_step_event(
        "research", "completed",
        {"claims_researched": len(research_results)}
    ))
    
    return {
        **state,
        "research_results": research_results,
        "current_step": "research",
        "errors": errors,
    }


async def verdict_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Agent 3 — Generate verdicts for each claim based on evidence.
    """
    await _emit_event(session_id, format_step_event("verdict", "started"))
    
    errors = list(state.get("errors", []))
    claims = state.get("claims", [])
    research_results = state.get("research_results", [])
    
    if not claims:
        errors.append("No claims to evaluate.")
        await _emit_event(session_id, format_error_event("No claims", "verdict"))
        return {**state, "verdicts": [], "current_step": "verdict", "errors": errors}
    
    verdict_result = await generate_verdicts(claims, research_results)
    
    verdicts = verdict_result.get("verdicts", [])
    overall = verdict_result.get("overall_assessment", {})
    
    if verdict_result.get("error"):
        errors.append(f"Verdict error: {verdict_result['error']}")
    
    await _emit_event(session_id, format_step_event(
        "verdict", "completed",
        {"verdicts_count": len(verdicts), "overall_credibility": overall.get("overall_credibility", 0)}
    ))
    
    return {
        **state,
        "verdicts": verdicts,
        "overall_assessment": overall,
        "current_step": "verdict",
        "errors": errors,
    }


async def report_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Final node — compile the full accuracy report.
    """
    await _emit_event(session_id, format_step_event("report", "started"))
    
    final_report = {
        "claims": state.get("claims", []),
        "claims_summary": state.get("claims_summary", ""),
        "total_claims": state.get("total_claims", 0),
        "verdicts": state.get("verdicts", []),
        "overall_assessment": state.get("overall_assessment", {}),
        "research_results": state.get("research_results", []),
        "errors": state.get("errors", []),
    }
    
    await _emit_event(session_id, format_complete_event(final_report))
    
    return {
        **state,
        "final_report": final_report,
        "current_step": "report",
    }


# ─── Pipeline Execution ────────────────────────────────────────────────

async def run_pipeline(
    input_text: str = "",
    input_url: str | None = None,
    session_id: str = "default"
) -> dict[str, Any]:
    """
    Run the full fact-checking pipeline.
    
    Each step emits SSE events to the session's queue so the router
    can stream them to the client.
    
    Args:
        input_text: Plain text to verify
        input_url: Optional URL to fetch and verify
        session_id: Unique session ID for SSE event routing
        
    Returns:
        The final report dict
    """
    # Initialize state
    state: PipelineState = {
        "input_text": input_text,
        "input_url": input_url,
        "claims": [],
        "claims_summary": "",
        "total_claims": 0,
        "research_results": [],
        "verdicts": [],
        "overall_assessment": {},
        "current_step": "init",
        "errors": [],
        "final_report": None,
    }
    
    try:
        # Run the pipeline sequentially (each step depends on previous)
        state = await preprocess_node(state, session_id)
        state = await extract_node(state, session_id)
        state = await research_node(state, session_id)
        state = await verdict_node(state, session_id)
        state = await report_node(state, session_id)
        
        return state.get("final_report", {})
    
    except Exception as e:
        error_msg = f"Pipeline error: {str(e)}"
        print(f"❌ {error_msg}")
        await _emit_event(session_id, format_error_event(error_msg, state.get("current_step", "unknown")))
        
        return {
            "claims": state.get("claims", []),
            "verdicts": state.get("verdicts", []),
            "overall_assessment": state.get("overall_assessment", {}),
            "errors": state.get("errors", []) + [error_msg],
        }
    
    finally:
        # Signal that the pipeline is done
        queue = get_event_queue(session_id)
        if queue:
            await queue.put(None)  # Sentinel to end SSE stream
