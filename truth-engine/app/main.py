"""
Truth-Engine — FastAPI Application Entry Point
AI-based Fact-Check & Claim Verification System
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import verify, bonus

# ─── App Initialization ────────────────────────────────────────────────

app = FastAPI(
    title="Truth-Engine API",
    description="AI-based Fact-Check & Claim Verification System powered by Gemini and Tavily",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS Middleware ────────────────────────────────────────────────────
# Allow the Next.js frontend and common dev origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Next.js default dev server
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*",                            # Allow all origins in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Mount Routers ─────────────────────────────────────────────────────

app.include_router(verify.router, tags=["Verification"])
app.include_router(bonus.router, tags=["Bonus Features"])

# ─── Health Check ──────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Truth-Engine API",
        "version": "1.0.0",
        "endpoints": {
            "verify": "POST /verify",
            "detect_ai": "POST /detect-ai",
            "detect_media": "POST /detect-media",
            "docs": "GET /docs",
        }
    }


@app.get("/health", tags=["Health"])
async def detailed_health():
    """Detailed health check with dependency status."""
    from app.config import GEMINI_API_KEY, TAVILY_API_KEY
    
    return {
        "status": "healthy",
        "service": "Truth-Engine API",
        "dependencies": {
            "gemini_configured": bool(GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here"),
            "tavily_configured": bool(TAVILY_API_KEY and TAVILY_API_KEY != "your_tavily_api_key_here"),
        }
    }
