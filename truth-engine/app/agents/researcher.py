"""
Agent — Query Generator (Step 3)
Uses Groq to generate targeted search queries for each extracted claim.
"""

import json
import asyncio
import logging
from app.config import GROQ_MODEL, groq_client
from app.utils.prompts import (
    RESEARCHER_SYSTEM_PROMPT,
    RESEARCHER_USER_PROMPT,
)

RETRY_DELAY = 2  # seconds


async def generate_queries(claims: list[dict]) -> list[dict]:
    """
    Generate search queries for all claims using Groq.

    Args:
        claims: List of claim dicts from the extractor

    Returns:
        List of {claim_id, claim_text, queries} dicts
    """
    for attempt in range(3):
        try:
            if attempt > 0:
                await asyncio.sleep(RETRY_DELAY * attempt)
                logging.info(f"Query gen retry {attempt}/3...")

            claims_json = json.dumps(claims, indent=2, default=str)
            prompt = RESEARCHER_USER_PROMPT.format(claims_json=claims_json)

            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": RESEARCHER_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=600,
                response_format={"type": "json_object"}
            )

            response_text = completion.choices[0].message.content.strip()
            result = json.loads(response_text)
            queries = result.get("claim_queries", [])

            logging.info(f"Generated queries for {len(queries)} claims")
            return queries

        except json.JSONDecodeError as e:
            logging.warning(f"Query gen JSON error (attempt {attempt + 1}/3): {e}")
            continue
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "quota" in error_str or "rate_limit_exceeded" in error_str or "413" in error_str:
                logging.warning(f"Query gen rate limited, waiting 20s (attempt {attempt + 1}/3)")
                await asyncio.sleep(20)
                continue
            logging.error(f"Query generation error: {e}")
            break

    # Fallback: use claim text as search query
    logging.warning("Query generation failed, using claim text as fallback queries")
    return [
        {
            "claim_id": c.get("id", i),
            "claim_text": c.get("claim_text", ""),
            "queries": [c.get("claim_text", "")]
        }
        for i, c in enumerate(claims)
    ]
