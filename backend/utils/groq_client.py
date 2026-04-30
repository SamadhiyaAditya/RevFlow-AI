"""
Groq API wrapper.
Provides a simple function to call the Groq LLM for email generation.
Uses llama-3.1-8b-instant by default (free tier, fast inference).
"""

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def generate_text(system_prompt: str, user_prompt: str, model: str = "llama-3.1-8b-instant", max_tokens: int = 512) -> str:
    """
    Call Groq API with a system + user prompt and return the generated text.
    Falls back to a placeholder if the API key is not configured.
    """
    if not client:
        return f"[LLM Unavailable] Groq API key not configured. Prompt was: {user_prompt[:200]}..."

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=model,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        return f"[LLM Error] Failed to generate text: {str(e)}"

def call_groq(prompt: str) -> str:
    """Convenience wrapper for a single prompt."""
    return generate_text("You are a professional finance assistant.", prompt)


def generate_discrepancy_email(vendor_name: str, item_name: str, billed_qty: int, expected_qty: int, billed_price: float, expected_price: float) -> str:
    """Generate a professional vendor email for a billing discrepancy."""
    system_prompt = (
        "You are a professional finance assistant at a company. "
        "Your job is to draft short, firm but polite emails to vendors about billing discrepancies. "
        "Keep emails under 4 sentences. Sign off as 'RevFlow-Ai Finance Agent'."
    )
    user_prompt = (
        f"Draft an email to {vendor_name} about a billing discrepancy on item '{item_name}'.\n"
        f"- Billed Quantity: {billed_qty}, Expected Quantity: {expected_qty}\n"
        f"- Billed Price: ${billed_price:.2f}, Expected Price: ${expected_price:.2f}\n"
        f"- Quantity Difference: {billed_qty - expected_qty}\n"
        f"- Price Difference: ${billed_price - expected_price:.2f}\n"
        f"Request clarification and a corrected invoice."
    )
    return generate_text(system_prompt, user_prompt)


def generate_collections_email(stage: int, vendor_name: str, invoice_number: str, amount: float, days_overdue: int, due_date: str, reminder_count: int = 0) -> str:
    """Generate a collections email for the appropriate escalation stage."""
    system_prompt = (
        "You are a professional finance assistant handling accounts receivable collections. "
        "Sign off as 'RevFlow-Ai Finance Agent'."
    )

    if stage == 1:
        user_prompt = (
            f"Draft a polite payment reminder email to {vendor_name}.\n"
            f"Invoice #{invoice_number} for ${amount:.2f} was due on {due_date} and is now {days_overdue} days overdue.\n"
            f"Assume it may be an oversight. Keep it under 4 sentences. Be friendly."
        )
    elif stage == 2:
        user_prompt = (
            f"Draft a payment plan proposal email to {vendor_name}.\n"
            f"Invoice #{invoice_number} for ${amount:.2f} has been overdue for {days_overdue} days.\n"
            f"We've sent {reminder_count} previous reminders with no response.\n"
            f"Propose exactly 2 concrete payment plan options:\n"
            f"  Option A: Pay 50% (${amount * 0.5:.2f}) now and the remainder in 30 days.\n"
            f"  Option B: Pay in 3 equal monthly installments of ${amount / 3:.2f}.\n"
            f"Minimum down payment is 25%. Maximum installments is 3.\n"
            f"Plans are valid for 7 days. Tone: understanding but firm."
        )
    elif stage == 3:
        user_prompt = (
            f"Draft a final notice email to {vendor_name}.\n"
            f"Invoice #{invoice_number} for ${amount:.2f} is now {days_overdue} days overdue.\n"
            f"We have sent multiple reminders and a payment plan proposal, all unanswered.\n"
            f"Inform them this account will now be escalated to a human team member for review.\n"
            f"Tone: formal and firm, no threats. Under 4 sentences."
        )
    else:
        return "[Error] Invalid collections stage."

    return generate_text(system_prompt, user_prompt)
