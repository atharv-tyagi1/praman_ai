"""
Pipeline state — TypedDict defining the state schema for the 7-step pipeline.
"""

from typing import TypedDict, Any, Optional


class PipelineState(TypedDict, total=False):
    """
    State object that flows through the 7-step pipeline.

    Steps:
        [1] Content Extraction → input_text, url_metadata
        [2] Claim Extraction   → claims, claims_summary, total_claims
        [3] Query Generation   → search_queries
        [4] Live Search        → raw_search_results
        [5] Evidence Structuring → research_results (structured evidence)
        [6] Verification       → verdicts, overall_assessment
        [7] Report Generation  → final_report
    """
    # Input
    input_text: str                          # Raw text from user (or fetched from URL)
    input_url: Optional[str]                 # Optional URL provided by user
    url_metadata: Optional[dict[str, str]]   # Extracted open graph metadata (title, image, desc)
    
    # Granular content (Step 1 output)
    structured_content: Optional[dict[str, str]] # {text_content, ocr_content, merged_content}


    # Step 2: Claim Extraction
    claims: list[dict[str, Any]]             # Extracted claims from extractor
    claims_summary: str                      # Summary of extracted claims
    total_claims: int                        # Number of claims extracted

    # Step 3: Query Generation
    search_queries: list[dict[str, Any]]     # Generated search queries per claim

    # Step 4: Live Search (raw results)
    raw_search_results: list[dict[str, Any]] # Raw results from external search

    # Step 5: Evidence Structuring
    research_results: list[dict[str, Any]]   # Structured evidence per claim

    # Step 6: Verification
    verdicts: list[dict[str, Any]]           # Verdict per claim
    overall_assessment: dict[str, Any]       # Overall credibility assessment

    # Pipeline metadata
    current_step: str                        # Current pipeline step name
    errors: list[str]                        # Accumulated errors
    final_report: Optional[dict[str, Any]]   # Complete final report
