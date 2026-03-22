"""
Agent 1 — Extractor
Uses Gemini with CoT prompting to extract 5–10 verifiable claims from input text.
"""

import json
import asyncio
import logging
import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.utils.prompts import EXTRACTOR_SYSTEM_PROMPT, EXTRACTOR_USER_PROMPT


# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

MAX_RETRIES = 5
RETRY_DELAY = 15  # seconds (free tier needs longer cooldowns)


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
            
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=EXTRACTOR_SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    temperature=0.2,
                    top_p=0.8,
                    max_output_tokens=4096,
                    response_mime_type="application/json",
                ),
            )
            
            prompt = EXTRACTOR_USER_PROMPT.format(input_text=input_text)
            response = model.generate_content(prompt)
            
            # Parse JSON from response
            response_text = response.text.strip()
            logging.info(f"Extractor raw response ({len(response_text)} chars): {response_text[:200]}...")
            
            # Handle potential CoT text before the JSON block
            import re
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                response_text = json_match.group(1).strip()
            else:
                # Fallback to finding the curly braces if no code block was used
                start = response_text.find('{')
                end = response_text.rfind('}')
                if start != -1 and end != -1:
                    response_text = response_text[start:end+1]
            
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

