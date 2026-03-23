"""
Chat router — POST /chat endpoint for report Q&A.
"""

import json
import groq
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import GROQ_API_KEY, GROQ_MODEL

client = groq.Groq(api_key=GROQ_API_KEY)
router = APIRouter()


CHAT_SYSTEM_PROMPT = """You are Praman AI's report assistant. The user has just completed a fact-check verification report and may ask questions about it.

You have access to the full report context below. Answer the user's questions accurately, concisely, and helpfully based on this report. If the user asks something unrelated to the report, politely redirect them.

Be conversational but precise. Use bullet points when listing multiple items. Keep responses under 200 words unless the user asks for detail."""


class ChatRequest(BaseModel):
    message: str
    report_context: str = ""


@router.post("/chat")
async def chat_with_report(request: ChatRequest):
    """
    POST /chat — Ask questions about the verification report.
    """
    try:
        system_msg = CHAT_SYSTEM_PROMPT
        if request.report_context:
            system_msg += f"\n\n--- REPORT CONTEXT ---\n{request.report_context}\n--- END CONTEXT ---"

        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": request.message},
            ],
            temperature=0.3,
            max_tokens=1024,
        )

        reply = completion.choices[0].message.content.strip()
        return {"success": True, "reply": reply}

    except Exception as e:
        return {"success": False, "error": f"Chat error: {str(e)}"}
