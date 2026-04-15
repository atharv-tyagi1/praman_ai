"""
Evidence builder — structures and scores raw search results into clean evidence.
Step 5 of the pipeline: Evidence Structuring.
"""

import logging
from typing import Any


def structure_evidence(
    claims: list[dict],
    search_queries: list[dict],
    raw_search_results: list[dict],
) -> list[dict[str, Any]]:
    """
    Organize raw search results into structured evidence grouped by claim.

    Args:
        claims: List of extracted claims
        search_queries: List of {claim_id, queries} dicts
        raw_search_results: List of {claim_id, results} dicts from live search

    Returns:
        List of structured evidence dicts, one per claim
    """
    structured = []

    for claim in claims:
        claim_id = claim.get("id", 0)
        claim_text = claim.get("claim_text", "")

        # Find search queries used for this claim
        claim_query_info = next(
            (q for q in search_queries if q.get("claim_id") == claim_id),
            None
        )
        queries_used = claim_query_info.get("queries", []) if claim_query_info else []

        # Find raw search results for this claim
        claim_search = next(
            (r for r in raw_search_results if r.get("claim_id") == claim_id),
            None
        )
        raw_results = claim_search.get("results", []) if claim_search else []

        # Score and rank evidence by relevance
        scored_evidence = _score_evidence(raw_results, claim_text)

        # Determine if evidence is sufficient
        sufficient = len(scored_evidence) >= 2
        confidence = min(0.9, 0.2 + len(scored_evidence) * 0.1)

        structured.append({
            "claim_id": claim_id,
            "claim_text": claim_text,
            "evidence": scored_evidence,
            "search_queries_used": queries_used,
            "confidence": confidence,
            "sufficient": sufficient,
        })

        logging.info(
            f"Claim {claim_id}: {len(scored_evidence)} evidence items, "
            f"sufficient={sufficient}, confidence={confidence:.2f}"
        )

    return structured


def _score_evidence(
    results: list[dict], claim_text: str
) -> list[dict]:
    """
    Score search results by relevance to the claim.
    Uses keyword overlap as a lightweight relevance signal.
    """
    if not results:
        return []

    claim_words = set(claim_text.lower().split())
    # Remove common stopwords
    stopwords = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
                 "to", "for", "of", "and", "or", "but", "not", "that", "this",
                 "it", "by", "from", "with", "as", "be", "has", "had", "have"}
    claim_keywords = claim_words - stopwords

    scored = []
    for result in results:
        content = result.get("content", "").lower()
        title = result.get("title", "").lower()
        combined_text = f"{title} {content}"

        # Calculate keyword overlap score
        if claim_keywords:
            overlap = sum(1 for kw in claim_keywords if kw in combined_text)
            keyword_score = overlap / len(claim_keywords)
        else:
            keyword_score = 0.0

        # Combine with Tavily's own relevance score
        tavily_score = float(result.get("score", 0.0))
        combined_score = (tavily_score * 0.6) + (keyword_score * 0.4)

        content_text = result.get("content", "")
        # TRUNCATE severely to avoid blowing up TPM limits on Groq free tier
        if len(content_text) > 150:
            content_text = content_text[:150] + "..."

        scored.append({
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "content": content_text,
            "score": round(combined_score, 3),
        })

    # Sort by score descending and return only top 2 to keep prompt size micro
    scored.sort(key=lambda x: x["score"], reverse=True)

    return scored[:2]
