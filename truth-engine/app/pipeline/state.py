"""
Pipeline state — TypedDict defining the state schema for the LangGraph pipeline.
"""

from typing import TypedDict, Any, Optional


class PipelineState(TypedDict, total=False):
    """
    State object that flows through the LangGraph pipeline.
    All nodes read from and write to this state.
    """
    # Input
    input_text: str                          # Raw text from user (or fetched from URL)
    input_url: Optional[str]                 # Optional URL provided by user
    url_metadata: Optional[dict[str, str]]   # Extracted open graph metadata (title, image, desc)
    
    # Agent 1 output
    claims: list[dict[str, Any]]             # Extracted claims from extractor
    claims_summary: str                      # Summary of extracted claims
    total_claims: int                        # Number of claims extracted
    
    # Agent 2 output
    research_results: list[dict[str, Any]]   # Research evidence per claim
    
    # Agent 3 output
    verdicts: list[dict[str, Any]]           # Verdict per claim
    overall_assessment: dict[str, Any]       # Overall credibility assessment
    
    # Pipeline metadata
    current_step: str                        # Current pipeline step name
    errors: list[str]                        # Accumulated errors
    final_report: Optional[dict[str, Any]]   # Complete final report
