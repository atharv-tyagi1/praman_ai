"""
Groq search wrapper — simulates web searches for fact-checking research
by querying Groq directly using its internal knowledge base.
"""

from typing import Any
import json
import logging
import groq
from app.config import GROQ_MODEL, groq_client

def search_groq(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    Simulate a web search using Groq's internal knowledge base.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        
    Returns:
        List of search result dicts with keys: title, url, content, score
    """
    try:

        
        prompt = f"""
        You are a highly accurate fact-checking researcher. Given the following query, provide {max_results} highly relevant "search results" based on your internal knowledge. 
        Format your response as a JSON object with a single key 'results' containing an array of objects. Each object must have the following keys:
        - "title": a concise title summarizing the piece of information
        - "url": a plausible URL for a credible source related to the information, e.g. "https://www.reuters.com/article/..." or "https://en.wikipedia.org/wiki/..."
        - "content": a detailed snippet of information directly answering or providing evidence for the query
        - "score": a float between 0.0 and 1.0 indicating how confident you are in this information
        
        Query: {query}
        """
        
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a research assistant that only outputs valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        
        response_text = response.choices[0].message.content.strip()
        result_obj = json.loads(response_text)
        results = result_obj.get("results", [])
        
        # Ensure it's a list
        if not isinstance(results, list):
            results = [results]
            
        formatted_results = []
        for result in results:
            formatted_results.append({
                "title": result.get("title", "Generated Information"),
                "url": result.get("url", "https://groq.com/knowledge"),
                "content": result.get("content", ""),
                "score": float(result.get("score", 0.9)),
            })
            
        return formatted_results[:max_results]
    
    except Exception as e:
        logging.error(f"❌ Groq search error: {e}")
        return []

def search_multiple_queries(queries: list[str], max_results_per_query: int = 3) -> list[dict[str, Any]]:
    """
    Run multiple search queries and aggregate results using Groq's knowledge.
    Deduplicates by URL/Title to ensure variety.
    """
    all_results = []
    seen_urls = set()
    
    for query in queries:
        results = search_groq(query, max_results=max_results_per_query)
        for result in results:
            url = result.get("url", "")
            title = result.get("title", "")
            dedup_key = f"{url}-{title}"
            if dedup_key not in seen_urls:
                seen_urls.add(dedup_key)
                all_results.append(result)
                
    return all_results
