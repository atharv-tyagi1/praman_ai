"""
Pipeline graph — orchestrates the 7-step fact-checking pipeline.

Steps:
    [1] Content Extraction (HTML + OCR)
    [2] Claim Extraction (Groq)
    [3] Query Generation (Groq)
    [4] Live Search (Tavily — external)
    [5] Evidence Structuring
    [6] Verification (Groq)
    [7] Report Generation
"""

import asyncio
from typing import Any
from app.pipeline.state import PipelineState
from app.agents.extractor import extract_claims
from app.agents.researcher import generate_queries
from app.agents.verdict import generate_verdicts
from app.tools.url_fetcher import fetch_url_content, sanitize_text, estimate_token_count
from app.tools.web_search import search_multiple_queries
from app.tools.evidence_builder import structure_evidence
from app.utils.sse import format_step_event, format_error_event, format_complete_event
from app.agents.reporter import Reporter


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


# ─── Step 1: Content Extraction ────────────────────────────────────────

async def content_extraction_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Step 1 — Content Extraction.
    If a URL was provided, fetch its HTML content.
    Handles PDF/file text passed from the upload endpoint.
    """
    await _emit_event(session_id, format_step_event("content_extraction", "started"))

    errors = list(state.get("errors", []))
    input_text = state.get("input_text", "")
    input_url = state.get("input_url")
    url_metadata = None

    # If URL provided, fetch content
    if input_url:
        await _emit_event(session_id, format_step_event(
            "content_extraction", "in_progress", {"message": f"Fetching URL: {input_url}"}
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
        "content_extraction", "completed",
        {
            "token_estimate": token_count,
            "text_length": len(input_text),
            "url_metadata": url_metadata
        }
    ))

    # Populate structured_content if it came from Text/URL (not file upload)
    structured_content = state.get("structured_content")
    if not structured_content:
        structured_content = {
            "text_content": input_text,
            "ocr_content": "",
            "merged_content": input_text
        }

    return {
        **state,
        "input_text": input_text,
        "url_metadata": url_metadata,
        "structured_content": structured_content,
        "current_step": "content_extraction",
        "errors": errors,
    }


# ─── Step 2: Claim Extraction ─────────────────────────────────────────

async def claim_extraction_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Step 2 — Claim Extraction.
    Uses Groq to extract verifiable claims from the input text.
    """
    await _emit_event(session_id, format_step_event("claim_extraction", "started"))

    errors = list(state.get("errors", []))
    input_text = state.get("input_text", "")

    if not input_text:
        errors.append("Cannot extract claims: no input text available.")
        await _emit_event(session_id, format_error_event("No input text", "claim_extraction"))
        return {**state, "claims": [], "current_step": "claim_extraction", "errors": errors}

    result = await extract_claims(input_text, state.get("structured_content"))

    claims = result.get("claims", [])
    summary = result.get("summary", "")

    if result.get("error"):
        errors.append(f"Extraction error: {result['error']}")

    await _emit_event(session_id, format_step_event(
        "claim_extraction", "completed",
        {"claims_count": len(claims), "summary": summary, "claims": claims}
    ))

    return {
        **state,
        "claims": claims,
        "claims_summary": summary,
        "total_claims": len(claims),
        "current_step": "claim_extraction",
        "errors": errors,
    }


# ─── Step 3: Query Generation ─────────────────────────────────────────

async def query_generation_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Step 3 — Query Generation.
    Uses Groq to generate targeted search queries for each claim.
    """
    await _emit_event(session_id, format_step_event("query_generation", "started"))

    errors = list(state.get("errors", []))
    claims = state.get("claims", [])

    if not claims:
        errors.append("No claims to generate queries for.")
        await _emit_event(session_id, format_error_event("No claims", "query_generation"))
        return {**state, "search_queries": [], "current_step": "query_generation", "errors": errors}

    search_queries = await generate_queries(claims)

    total_queries = sum(len(q.get("queries", [])) for q in search_queries)

    await _emit_event(session_id, format_step_event(
        "query_generation", "completed",
        {"claims_count": len(search_queries), "total_queries": total_queries}
    ))

    return {
        **state,
        "search_queries": search_queries,
        "current_step": "query_generation",
        "errors": errors,
    }


# ─── Step 4: Live Search ──────────────────────────────────────────────

async def live_search_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Step 4 — Live Search.
    Executes real web searches via Tavily for each claim's queries.
    This is NOT Groq — it hits real external search engines.
    """
    await _emit_event(session_id, format_step_event("live_search", "started"))

    errors = list(state.get("errors", []))
    search_queries = state.get("search_queries", [])
    claims = state.get("claims", [])

    if not search_queries:
        errors.append("No search queries to execute.")
        await _emit_event(session_id, format_error_event("No queries", "live_search"))
        return {**state, "raw_search_results": [], "current_step": "live_search", "errors": errors}

    raw_search_results = []
    total_results = 0

    for claim_query in search_queries:
        claim_id = claim_query.get("claim_id", 0)
        queries = claim_query.get("queries", [])

        await _emit_event(session_id, format_step_event(
            "live_search", "in_progress",
            {"message": f"Searching for claim {claim_id} ({len(queries)} queries)..."}
        ))

        # Run search in a thread to avoid blocking the event loop
        results = await asyncio.to_thread(
            search_multiple_queries, queries, 3
        )

        raw_search_results.append({
            "claim_id": claim_id,
            "results": results,
        })
        total_results += len(results)

    await _emit_event(session_id, format_step_event(
        "live_search", "completed",
        {"claims_searched": len(raw_search_results), "total_results": total_results}
    ))

    return {
        **state,
        "raw_search_results": raw_search_results,
        "current_step": "live_search",
        "errors": errors,
    }


# ─── Step 5: Evidence Structuring ──────────────────────────────────────

async def evidence_structuring_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Step 5 — Evidence Structuring.
    Organizes and scores raw search results into structured evidence per claim.
    """
    await _emit_event(session_id, format_step_event("evidence_structuring", "started"))

    errors = list(state.get("errors", []))
    claims = state.get("claims", [])
    search_queries = state.get("search_queries", [])
    raw_search_results = state.get("raw_search_results", [])

    research_results = structure_evidence(claims, search_queries, raw_search_results)

    sufficient_count = sum(1 for r in research_results if r.get("sufficient", False))

    await _emit_event(session_id, format_step_event(
        "evidence_structuring", "completed",
        {
            "claims_with_evidence": len(research_results),
            "sufficient_evidence": sufficient_count,
        }
    ))

    return {
        **state,
        "research_results": research_results,
        "current_step": "evidence_structuring",
        "errors": errors,
    }


# ─── Step 6: Verification ─────────────────────────────────────────────

async def verification_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Step 6 — Verification.
    Uses Groq to produce verdicts based on the structured evidence.
    """
    await _emit_event(session_id, format_step_event("verification", "started"))

    errors = list(state.get("errors", []))
    claims = state.get("claims", [])
    research_results = state.get("research_results", [])

    if not claims:
        errors.append("No claims to evaluate.")
        await _emit_event(session_id, format_error_event("No claims", "verification"))
        return {**state, "verdicts": [], "current_step": "verification", "errors": errors}

    verdict_result = await generate_verdicts(claims, research_results)

    verdicts = verdict_result.get("verdicts", [])
    overall = verdict_result.get("overall_assessment", {})

    if verdict_result.get("error"):
        errors.append(f"Verdict error: {verdict_result['error']}")

    await _emit_event(session_id, format_step_event(
        "verification", "completed",
        {"verdicts_count": len(verdicts), "overall_credibility": overall.get("overall_credibility", 0)}
    ))

    return {
        **state,
        "verdicts": verdicts,
        "overall_assessment": overall,
        "current_step": "verification",
        "errors": errors,
    }


# ─── Step 7: Report Generation ────────────────────────────────────────

async def report_generation_node(state: PipelineState, session_id: str) -> PipelineState:
    """
    Step 7 — Report Generation.
    Compiles all pipeline results into the final accuracy report.
    """
    await _emit_event(session_id, format_step_event("report_generation", "started"))

    # Compile initial report
    report_data = {
        "claims": state.get("claims", []),
        "claims_summary": state.get("claims_summary", ""),
        "total_claims": state.get("total_claims", 0),
        "verdicts": state.get("verdicts", []),
        "overall_assessment": state.get("overall_assessment", {}),
        "research_results": state.get("research_results", []),
        "errors": state.get("errors", []),
    }

    # Generate professional reports (PPT and PDF)
    ppt_path = await Reporter.generate_ppt(report_data, session_id)
    pdf_path = await Reporter.generate_pdf(report_data, session_id)

    # Add file paths to the final report
    final_report = {
        **report_data,
        "report_files": {
            "session_id": session_id,
            "ppt_path": ppt_path if ppt_path else None,
            "pdf_path": pdf_path if pdf_path else None,
            "ppt_url": f"/download/ppt/{session_id}" if ppt_path else None,
            "pdf_url": f"/download/pdf/{session_id}" if pdf_path else None,
        }
    }

    await _emit_event(session_id, format_complete_event(final_report))

    return {
        **state,
        "final_report": final_report,
        "current_step": "report_generation",
    }


# ─── Pipeline Execution ────────────────────────────────────────────────

async def run_pipeline(
    input_text: str = "",
    input_url: str | None = None,
    session_id: str = "default",
    structured_content: dict | None = None
) -> dict[str, Any]:
    """
    Run the full 7-step fact-checking pipeline.

    Steps:
        [1] Content Extraction (HTML + OCR)
        [2] Claim Extraction (Groq)
        [3] Query Generation (Groq)
        [4] Live Search (Tavily — external)
        [5] Evidence Structuring
        [6] Verification (Groq)
        [7] Report Generation

    Args:
        input_text: Plain text to verify
        input_url: Optional URL to fetch and verify
        session_id: Unique session ID for SSE event routing
        structured_content: Optional structured {text, ocr, merged} content

    Returns:
        The final report dict
    """
    # Initialize state
    state: PipelineState = {
        "input_text": input_text,
        "input_url": input_url,
        "structured_content": structured_content,
        "claims": [],
        "claims_summary": "",
        "total_claims": 0,
        "search_queries": [],
        "raw_search_results": [],
        "research_results": [],
        "verdicts": [],
        "overall_assessment": {},
        "current_step": "init",
        "errors": [],
        "final_report": None,
    }

    try:
        # Run all 7 steps sequentially (each depends on the previous)
        state = await content_extraction_node(state, session_id)       # Step 1
        state = await claim_extraction_node(state, session_id)         # Step 2
        state = await query_generation_node(state, session_id)         # Step 3
        state = await live_search_node(state, session_id)              # Step 4
        state = await evidence_structuring_node(state, session_id)     # Step 5
        state = await verification_node(state, session_id)             # Step 6
        state = await report_generation_node(state, session_id)        # Step 7

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
