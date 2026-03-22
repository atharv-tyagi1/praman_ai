"""
URL fetcher — scrapes and extracts clean text from web pages.
Used in the pre-processor step for URL inputs.
"""

import httpx
from bs4 import BeautifulSoup
from typing import Optional
from tavily import AsyncTavilyClient
from app.config import TAVILY_API_KEY
import logging


async def fetch_url_content(url: str, timeout: float = 15.0) -> dict:
    """
    Fetch a URL and extract clean text content using BeautifulSoup.
    Handles bot-blocked pages by extracting OG metadata even from error responses.
    
    Args:
        url: The URL to fetch
        timeout: Request timeout in seconds
        
    Returns:
        Dict with keys: title, text, url, error, and metadata (title, description, image, site_name)
    """
    html_text = ""
    status_code = 0
    
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1"
            }
        ) as client:
            response = await client.get(url)
            status_code = response.status_code
            html_text = response.text  # Always read the body BEFORE checking status
    except Exception as e:
        logging.warning(f"Connection error for {url}: {str(e)}")
        return {
            "title": None, "text": None, "url": url,
            "metadata": {}, "error": str(e)
        }
    
    # --- Parse whatever HTML we got (even from 4xx/5xx responses) ---
    soup = BeautifulSoup(html_text, "html.parser")
    
    # Extract Open Graph metadata (works even on error pages)
    metadata = {"title": "", "description": "", "image": "", "site_name": ""}
    
    page_title = soup.title.string.strip() if soup.title and soup.title.string else ""
    metadata["title"] = page_title
    
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        metadata["title"] = og_title["content"].strip()
        
    og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
    if og_desc and og_desc.get("content"):
        metadata["description"] = og_desc["content"].strip()
        
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        metadata["image"] = og_image["content"].strip()
        
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        metadata["site_name"] = og_site["content"].strip()
    
    # If this was an error response (4xx/5xx), return metadata only (no body text)
    if status_code >= 400:
        logging.warning(f"HTTP {status_code} for {url}. Extracted metadata: {metadata}")
        has_useful_metadata = bool(metadata.get("title") or metadata.get("image"))
        return {
            "title": metadata["title"] or page_title,
            "text": "",
            "url": url,
            "metadata": metadata if has_useful_metadata else {},
            "error": f"HTTP {status_code}" if not has_useful_metadata else None
        }
    
    # --- Success path: extract article text ---
    # Remove non-content elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
        tag.decompose()
    
    main_content = soup.find("article") or soup.find("main") or soup.find("body")
    
    if main_content:
        paragraphs = main_content.find_all(["p", "h1", "h2", "h3", "h4", "li", "blockquote"])
        text_parts = [p.get_text(separator=" ", strip=True) for p in paragraphs if p.get_text(strip=True) and len(p.get_text(strip=True)) > 20]
        text = "\n\n".join(text_parts)
    else:
        text = soup.get_text(separator="\n", strip=True)
    
    # Truncate to ~10000 chars
    if len(text) > 10000:
        text = text[:10000] + "\n\n[Content truncated — showing first 10,000 characters]"
    
    return {
        "title": metadata["title"] or page_title,
        "text": text,
        "url": url,
        "metadata": metadata,
        "error": None
    }


def sanitize_text(text: str) -> str:
    """
    Clean and sanitize input text.
    Removes excessive whitespace and normalizes the text.
    """
    if not text:
        return ""
    
    # Normalize whitespace
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = " ".join(line.split())  # Collapse internal whitespace
        if stripped:
            cleaned_lines.append(stripped)
    
    return "\n".join(cleaned_lines)


def estimate_token_count(text: str) -> int:
    """
    Rough token count estimation (4 chars ≈ 1 token).
    """
    return len(text) // 4
