"""
Configuration module — loads environment variables for the truth-engine.
"""

import os
from dotenv import load_dotenv
import groq

# Load .env file from the truth-engine root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Validation
if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
    print("WARNING: GROQ_API_KEY is not set. Please update your .env file.")

# Shared client instance
groq_client = groq.Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

