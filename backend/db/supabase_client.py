"""
Supabase client initialisation.
Provides a singleton Supabase client instance used across the entire backend.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  WARNING: SUPABASE_URL or SUPABASE_KEY not set. Database operations will fail.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
