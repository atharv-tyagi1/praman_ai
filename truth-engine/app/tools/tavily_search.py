"""
Tavily search wrapper — performs web searches for fact-checking research.
"""

from typing import Any
from tavily import TavilyClient
from app.config import TAVILY_API_KEY


def search_tavily(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    Search the web using Tavily API.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        
    Returns:
        List of search result dicts with keys: title, url, content, score
    """
    try:
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
            include_answer=True,
        )
        
        results = []
        for result in response.get("results", []):
            results.append({
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", ""),
                "score": result.get("score", 0.0),
            })
        
        return results
    
    except Exception as e:
        print(f"❌ Tavily search error: {e}")
        return []


def search_multiple_queries(queries: list[str], max_results_per_query: int = 3) -> list[dict[str, Any]]:
    """
    Run multiple search queries and aggregate results.
    Deduplicates by URL.
    """
    all_results = []
    seen_urls = set()
    
    for query in queries:
        results = search_tavily(query, max_results=max_results_per_query)
        for result in results:
            url = result.get("url", "")
            if url not in seen_urls:
                seen_urls.add(url)
                all_results.append(result)
    
    return all_results
