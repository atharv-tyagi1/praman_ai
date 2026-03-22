"""
Configuration module — loads environment variables for the truth-engine.
"""

import os
from dotenv import load_dotenv

# Load .env file from the truth-engine root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

# Validation
if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
    print("⚠️  WARNING: GEMINI_API_KEY is not set. Please update your .env file.")

if not TAVILY_API_KEY or TAVILY_API_KEY == "your_tavily_api_key_here":
    print("⚠️  WARNING: TAVILY_API_KEY is not set. Please update your .env file.")
