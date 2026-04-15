"""
Web search tool — performs REAL external web searches using DuckDuckGo.
Replaces the old groq_search.py which faked results using LLM hallucination.
"""

import logging
from typing import Any
from duckduckgo_search import DDGS


def search_web(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    Perform a real web search using DuckDuckGo.

    Args:
        query: Search query string
        max_results: Maximum number of results to return

    Returns:
        List of search result dicts with keys: title, url, content, score
    """
    results = []
    
    try:
        with DDGS() as ddgs:
            # text() yields dictionaries like {"title": ..., "href": ..., "body": ...}
            raw_results = list(ddgs.text(query, max_results=max_results))
            
            for rank, item in enumerate(raw_results):
                # Calculate a synthetic score since DDG just returns ranked order
                score = max(0.1, 1.0 - (rank * 0.1))
                
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("href", ""),
                    "content": item.get("body", ""),
                    "score": score,
                })

        logging.info(f"DuckDuckGo search '{query[:60]}...' → {len(results)} results")
        return results

    except Exception as e:
        logging.error(f"DuckDuckGo search error for query '{query[:60]}': {e}")
        return []


def search_multiple_queries(
    queries: list[str], max_results_per_query: int = 3
) -> list[dict[str, Any]]:
    """
    Run multiple search queries and aggregate results.
    Deduplicates by URL to ensure variety.
    """
    all_results = []
    seen_urls = set()

    for query in queries:
        results = search_web(query, max_results=max_results_per_query)
        for result in results:
            url = result.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_results.append(result)

    return all_results
