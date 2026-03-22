"""
Agent 2 — Researcher
For each claim, generates search queries, uses Tavily to gather evidence,
and applies a self-reflection retry loop if results are insufficient.
"""

import json
import asyncio
import logging
import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.utils.prompts import (
    RESEARCHER_SYSTEM_PROMPT,
    RESEARCHER_USER_PROMPT,
    RESEARCHER_REFLECTION_PROMPT,
)
from app.tools.tavily_search import search_multiple_queries

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

MAX_RETRY_ROUNDS = 2  # Maximum self-reflection retry rounds


async def research_claims(claims: list[dict]) -> list[dict]:
    """
    Research each claim by generating search queries and gathering evidence.
    Includes a self-reflection retry loop for insufficient evidence.
    
    Args:
        claims: List of claim dicts from the extractor
        
    Returns:
        List of research result dicts, one per claim
    """
    try:
        # Step 1: Generate search queries for all claims
        queries_map = await _generate_search_queries(claims)
        
        # Step 2: For each claim, search and optionally retry
        research_results = []
        
        for claim in claims:
            claim_id = claim.get("id", 0)
            claim_text = claim.get("claim_text", "")
            
            # Get queries for this claim
            claim_queries_info = next(
                (q for q in queries_map if q.get("claim_id") == claim_id),
                None
            )
            
            if not claim_queries_info:
                research_results.append({
                    "claim_id": claim_id,
                    "claim_text": claim_text,
                    "evidence": [],
                    "search_queries_used": [],
                    "confidence": 0.0,
                    "sufficient": False,
                })
                continue
            
            queries = claim_queries_info.get("queries", [])
            all_evidence = search_multiple_queries(queries, max_results_per_query=3)
            
            # Self-reflection retry loop
            for retry_round in range(MAX_RETRY_ROUNDS):
                reflection = await _reflect_on_evidence(claim_text, all_evidence)
                
                if reflection.get("sufficient", False):
                    break
                
                # Get additional queries from reflection
                additional_queries = reflection.get("additional_queries", [])
                if additional_queries:
                    new_evidence = search_multiple_queries(additional_queries, max_results_per_query=3)
                    # Deduplicate
                    existing_urls = {e.get("url") for e in all_evidence}
                    for e in new_evidence:
                        if e.get("url") not in existing_urls:
                            all_evidence.append(e)
                            existing_urls.add(e.get("url"))
                    queries.extend(additional_queries)
                else:
                    break
            
            research_results.append({
                "claim_id": claim_id,
                "claim_text": claim_text,
                "evidence": all_evidence,
                "search_queries_used": queries,
                "confidence": reflection.get("confidence", 0.5),
                "sufficient": reflection.get("sufficient", False),
            })
        
        return research_results
    
    except Exception as e:
        print(f"❌ Researcher error: {e}")
        return [{
            "claim_id": c.get("id", 0),
            "claim_text": c.get("claim_text", ""),
            "evidence": [],
            "search_queries_used": [],
            "confidence": 0.0,
            "sufficient": False,
            "error": str(e),
        } for c in claims]


async def _generate_search_queries(claims: list[dict]) -> list[dict]:
    """Use Gemini to generate search queries for all claims at once."""
    for attempt in range(3):
        try:
            if attempt > 0:
                await asyncio.sleep(5 * attempt)
                logging.info(f"Researcher query gen retry {attempt}/3...")
            
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=RESEARCHER_SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    top_p=0.8,
                    max_output_tokens=4096,
                ),
            )
            
            claims_json = json.dumps(claims, indent=2, default=str)
            prompt = RESEARCHER_USER_PROMPT.format(claims_json=claims_json)
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
            return result.get("claim_queries", [])
        
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "quota" in error_str:
                logging.warning(f"Researcher query gen rate limited (attempt {attempt + 1}/3)")
                continue
            logging.error(f"Query generation error: {e}")
            break
    
    # Fallback: use claim text as search query
    return [
        {
            "claim_id": c.get("id", i),
            "claim_text": c.get("claim_text", ""),
            "queries": [c.get("claim_text", "")]
        }
        for i, c in enumerate(claims)
    ]


async def _reflect_on_evidence(claim_text: str, evidence: list[dict]) -> dict:
    """Self-reflection: evaluate whether gathered evidence is sufficient."""
    for attempt in range(3):
        try:
            if attempt > 0:
                await asyncio.sleep(5 * attempt)
            
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                generation_config=genai.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=1024,
                ),
            )
            
            evidence_summary = "\n".join([
                f"- [{e.get('title', 'Unknown')}]({e.get('url', '')}): {e.get('content', '')[:300]}"
                for e in evidence[:10]
            ])
            
            if not evidence_summary:
                evidence_summary = "No evidence found."
            
            prompt = RESEARCHER_REFLECTION_PROMPT.format(
                claim_text=claim_text,
                evidence_summary=evidence_summary,
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
            
            return json.loads(response_text)
        
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "quota" in error_str:
                logging.warning(f"Reflection rate limited (attempt {attempt + 1}/3)")
                continue
            logging.error(f"Reflection error: {e}")
            break
    
    return {
        "sufficient": True,
        "confidence": 0.5,
        "reasoning": "Reflection failed, proceeding with available evidence.",
        "additional_queries": []
    }
