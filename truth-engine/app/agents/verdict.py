"""
Agent 3 — Verdict
Takes claims + evidence, uses Gemini to produce a verdict per claim:
True, False, Partially True, or Unverifiable — with confidence and citations.
"""

import json
import asyncio
import logging
import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.utils.prompts import VERDICT_SYSTEM_PROMPT, VERDICT_USER_PROMPT

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)


async def generate_verdicts(claims: list[dict], research_results: list[dict]) -> dict:
    """
    Generate verdicts for each claim based on research evidence.
    Includes retry logic for rate-limited (429) API responses.
    """
    last_error = None
    
    for attempt in range(3):
        try:
            if attempt > 0:
                delay = 15 * attempt
                logging.info(f"Verdict retry {attempt}/3 after {delay}s delay...")
                await asyncio.sleep(delay)
            
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=VERDICT_SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    top_p=0.8,
                    max_output_tokens=8192,
                    response_mime_type="application/json",
                ),
            )
            
            claims_json = json.dumps(claims, indent=2, default=str)
            evidence_json = json.dumps(research_results, indent=2, default=str)
            
            prompt = VERDICT_USER_PROMPT.format(
                claims_json=claims_json,
                evidence_json=evidence_json,
            )
            
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            import re
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                response_text = json_match.group(1).strip()
            else:
                start = response_text.find('{')
                end = response_text.rfind('}')
                if start != -1 and end != -1:
                    response_text = response_text[start:end+1]
            
            result = json.loads(response_text)
            
            if "verdicts" not in result:
                result["verdicts"] = []
            if "overall_assessment" not in result:
                result["overall_assessment"] = _compute_overall_assessment(result["verdicts"])
            
            # Ensure conflict_note defaults
            for v in result["verdicts"]:
                if "conflict_note" not in v:
                    v["conflict_note"] = None
            
            logging.info(f"Verdict produced {len(result['verdicts'])} verdicts")
            return result
        
        except json.JSONDecodeError as e:
            logging.warning(f"Verdict JSON parse error (attempt {attempt + 1}/3): {e}")
            last_error = f"JSON parse error: {str(e)}"
            continue  # Retry on malformed JSON
        except Exception as e:
            last_error = str(e)
            error_str = str(e).lower()
            if "429" in error_str or "quota" in error_str:
                logging.warning(f"Verdict rate limited (attempt {attempt + 1}/3)")
                continue
            logging.error(f"Verdict error: {e}")
            return {
                "verdicts": [],
                "overall_assessment": {
                    "total_claims": len(claims),
                    "true_count": 0, "false_count": 0,
                    "partial_count": 0, "unverifiable_count": len(claims),
                    "overall_credibility": 0.0,
                    "summary": f"An error occurred: {str(e)}"
                },
                "error": str(e)
            }
    
    # All retries exhausted
    logging.error(f"Verdict failed after 3 retries: {last_error}")
    return {
        "verdicts": [],
        "overall_assessment": {
            "total_claims": len(claims),
            "true_count": 0, "false_count": 0,
            "partial_count": 0, "unverifiable_count": len(claims),
            "overall_credibility": 0.0,
            "summary": f"Rate limited after retries: {last_error}"
        },
        "error": f"Rate limited: {last_error}"
    }


def _compute_overall_assessment(verdicts: list[dict]) -> dict:
    """
    Compute overall assessment from individual verdicts.
    Fallback used when the model doesn't provide one.
    """
    total = len(verdicts)
    true_count = sum(1 for v in verdicts if v.get("verdict") == "True")
    false_count = sum(1 for v in verdicts if v.get("verdict") == "False")
    partial_count = sum(1 for v in verdicts if v.get("verdict") == "Partially True")
    unverifiable_count = sum(1 for v in verdicts if v.get("verdict") == "Unverifiable")
    
    # Credibility: True=1.0, Partial=0.5, Unverifiable=0.3, False=0.0
    if total > 0:
        credibility = (
            true_count * 1.0 +
            partial_count * 0.5 +
            unverifiable_count * 0.3 +
            false_count * 0.0
        ) / total
    else:
        credibility = 0.0
    
    return {
        "total_claims": total,
        "true_count": true_count,
        "false_count": false_count,
        "partial_count": partial_count,
        "unverifiable_count": unverifiable_count,
        "overall_credibility": round(credibility, 2),
        "summary": f"Analyzed {total} claims: {true_count} True, {false_count} False, "
                   f"{partial_count} Partially True, {unverifiable_count} Unverifiable."
    }
