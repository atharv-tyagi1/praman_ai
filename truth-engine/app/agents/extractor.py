"""
Agent 1 — Extractor
Uses Gemini with CoT prompting to extract 5–10 verifiable claims from input text.
"""

import json
import asyncio
import logging
import groq
from app.config import GROQ_MODEL, groq_client
from app.utils.prompts import EXTRACTOR_SYSTEM_PROMPT, EXTRACTOR_USER_PROMPT

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds (used to be 15, lowered to improve frontend latency)


async def extract_claims(input_text: str) -> dict:
    """
    Extract verifiable factual claims from input text using Gemini.
    Includes retry logic for rate-limited (429) API responses.
    """
    last_error = None
    
    for attempt in range(MAX_RETRIES):
        try:
            if attempt > 0:
                delay = RETRY_DELAY * attempt
                logging.info(f"Extractor retry {attempt}/{MAX_RETRIES} after {delay}s delay...")
                await asyncio.sleep(delay)
            
            prompt = EXTRACTOR_USER_PROMPT.format(input_text=input_text)
            
            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": EXTRACTOR_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2048,
                response_format={"type": "json_object"}
            )
            
            # Parse JSON from response
            response_text = completion.choices[0].message.content.strip()
            logging.info(f"Extractor raw response ({len(response_text)} chars): {response_text[:200]}...")
            
            result = json.loads(response_text)
            
            # Ensure required fields exist
            if "claims" not in result:
                result["claims"] = []
            if "summary" not in result:
                result["summary"] = "Claims extracted from input text."
            if "total_claims_found" not in result:
                result["total_claims_found"] = len(result["claims"])
            
            # Ensure new CoT and context-injection fields have defaults
            for claim in result["claims"]:
                if "reasoning" not in claim:
                    claim["reasoning"] = "No reasoning provided."
                if "original_text" not in claim:
                    claim["original_text"] = claim.get("claim_text", "")
            
            logging.info(f"Extractor found {len(result['claims'])} claims")
            return result
        
        except json.JSONDecodeError as e:
            logging.warning(f"Extractor JSON parse error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
            last_error = f"JSON parse error: {str(e)}"
            continue  # Retry on malformed JSON
        except Exception as e:
            last_error = str(e)
            error_str = str(e).lower()
            
            # Retry on rate limit errors
            if "429" in error_str or "quota" in error_str or "resource" in error_str:
                logging.warning(f"Extractor rate limited (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                continue
            else:
                logging.error(f"Extractor error (non-retryable): {e}")
                return {
                    "claims": [],
                    "summary": "An error occurred during claim extraction.",
                    "total_claims_found": 0,
                    "error": str(e)
                }
    
    # All retries exhausted
    logging.error(f"Extractor failed after {MAX_RETRIES} retries: {last_error}")
    return {
        "claims": [],
        "summary": "Failed after multiple retries (API rate limit).",
        "total_claims_found": 0,
        "error": f"Rate limited after {MAX_RETRIES} retries: {last_error}"
    }

