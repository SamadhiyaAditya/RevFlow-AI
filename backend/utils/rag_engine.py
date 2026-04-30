"""
RAG Engine for RevFlow-Ai.
Uses sentence-transformers for local embeddings and pgvector in Supabase for retrieval.
"""

import os
import logging
from typing import List, Dict, Any, Optional

import torch
from sentence_transformers import SentenceTransformer
from db.supabase_client import supabase

logger = logging.getLogger(__name__)

# Load model once at startup (CPU only for production free tiers)
try:
    model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
    logger.info("✅ RAG SentenceTransformer loaded on CPU.")
except Exception as e:
    logger.error(f"❌ Failed to load SentenceTransformer: {e}")
    model = None


def generate_embedding(text: str) -> List[float]:
    """Generate 384-dimensional embedding for the given text."""
    if not model or not text:
        return [0.0] * 384
    try:
        embedding = model.encode(text).tolist()
        return embedding
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return [0.0] * 384


def store_vendor_history(vendor_name: str, event_description: str, metadata: Dict[str, Any] = None):
    """
    Saves an event to the vendor_history table with its vector embedding.
    Example events: 'Price dispute on MacBook', 'Late payment for Jan invoice'.
    """
    try:
        embedding = generate_embedding(f"{vendor_name}: {event_description}")
        data = {
            "vendor_name": vendor_name,
            "event_description": event_description,
            "embedding": embedding,
            "metadata": metadata or {}
        }
        supabase.table("vendor_history").insert(data).execute()
        logger.info(f"Stored RAG history for {vendor_name}")
    except Exception as e:
        logger.error(f"Failed to store vendor history: {e}")


def query_vendor_history(vendor_name: str, query_text: str, limit: int = 3) -> str:
    """
    Retrieves the most relevant historical events for a vendor using vector similarity.
    Returns a formatted context string for the LLM.
    """
    try:
        query_embedding = generate_embedding(query_text)
        
        # Use Supabase RPC to perform vector search (assumes 'match_vendor_history' function exists)
        # Note: In schema.sql we should have defined this function.
        params = {
            "query_embedding": query_embedding,
            "match_threshold": 0.5,
            "match_count": limit,
            "v_name": vendor_name
        }
        
        rpc_res = supabase.rpc("match_vendor_history", params).execute()
        matches = rpc_res.data or []

        if not matches:
            return ""

        context = "\n--- Historical Context ---\n"
        for i, match in enumerate(matches):
            date_str = match.get("created_at", "")[:10]
            context += f"- {date_str}: {match['event_description']}\n"
        return context

    except Exception as e:
        logger.error(f"RAG Query error: {e}")
        return ""
