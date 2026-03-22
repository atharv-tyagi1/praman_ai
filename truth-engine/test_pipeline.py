"""Quick test to debug claim extraction pipeline."""
import asyncio
import json
import logging

logging.basicConfig(level=logging.INFO)

async def main():
    # Step 1: Test URL fetching
    from app.tools.url_fetcher import fetch_url_content
    url = "https://indianexpress.com/article/world/us-israel-iran-war-news-live-updates-donald-trump-threats-oil-hormuz-10594811/"
    print("=" * 60)
    print("STEP 1: Fetching URL content...")
    print("=" * 60)
    result = await fetch_url_content(url)
    print(f"Title: {result.get('title')}")
    print(f"Error: {result.get('error')}")
    text = result.get("text", "")
    print(f"Text length: {len(text)} chars")
    print(f"First 500 chars of text:\n{text[:500]}")
    print()
    
    if not text:
        print("❌ NO TEXT EXTRACTED FROM URL! This is likely the root cause.")
        print("Metadata:", json.dumps(result.get("metadata", {}), indent=2))
        return
    
    # Step 2: Test claim extraction
    print("=" * 60)
    print("STEP 2: Extracting claims...")
    print("=" * 60)
    from app.agents.extractor import extract_claims
    claims_result = await extract_claims(text)
    print(json.dumps(claims_result, indent=2, default=str))

asyncio.run(main())
