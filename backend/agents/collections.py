"""
Collections Agent (v3).
Handles the 3-stage escalation logic with RAG-powered tone adjustment.
Excludes disputed invoices and respects response flags.
"""

import logging
from datetime import datetime, date, timezone
from typing import Optional, Dict, Any

from utils.groq_client import call_groq
from utils.rag_engine import query_vendor_history, store_vendor_history

logger = logging.getLogger(__name__)


def check_and_escalate(invoice: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Decision tree for escalation:
    1. Check status (must be PENDING or OVERDUE)
    2. Check response flag (must be false)
    3. Check stage and overdue days
    """
    # 1. Status Guards
    status = invoice.get("status", "").upper()
    if status not in ["PENDING", "OVERDUE"]:
        # We explicitly exclude DISCREPANCY, MATCHED (if not overdue), and PAID
        return None

    if invoice.get("flagged_as_responded") or invoice.get("response_received"):
        return None

    # 2. Date Logic
    today = date.today()
    due_date_str = invoice.get("due_date")
    if not due_date_str:
        return None
    
    due_date = date.fromisoformat(due_date_str)
    days_overdue = (today - due_date).days

    if days_overdue <= 0:
        return None

    # 3. Escalation Stages
    stage = invoice.get("collections_stage", 0)
    
    # RAG: Retrieve historical payment behavior
    vendor_name = invoice.get("vendor_name", "Vendor")
    query = f"{vendor_name} payment behavior late payments track record"
    history = query_vendor_history(vendor_name, query)

    # --- Stage 1: Reminder (1-7 days) ---
    if stage == 0:
        prompt = f"""
        Draft a polite Stage 1 payment reminder for {vendor_name} regarding Invoice #{invoice['invoice_number']}.
        Amount: ${invoice['total_amount']} | Due Date: {due_date_str} ({days_overdue} days late).
        {history}
        Tone: Friendly but professional. Adjust based on track record.
        Sign off as: RevFlow-Ai - Automated Finance Agent
        """
        body = call_groq(prompt)
        return {
            "action": "SEND_REMINDER",
            "stage": 1,
            "vendor_email": invoice.get("vendor_email"),
            "email_subject": f"Reminder: Invoice #{invoice['invoice_number']} is overdue",
            "email_body": body,
            "is_rag_draft": bool(history),
            "audit_action": "EMAIL_SENT",
            "audit_reasoning": f"Stage 1 reminder sent. Invoice {days_overdue} days overdue.",
            "db_updates": {
                "collections_stage": 1,
                "reminder_count": invoice.get("reminder_count", 0) + 1,
                "last_reminder_sent": today.isoformat(),
                "status": "OVERDUE"
            }
        }

    # --- Stage 2: Payment Plan (8-21 days + 2 reminders) ---
    elif stage == 1 and invoice.get("reminder_count", 0) >= 2:
        # Proposed plan logic (Simplified)
        total = invoice['total_amount']
        p1 = round(total * 0.5, 2)
        p2 = round(total * 0.5, 2)
        
        prompt = f"""
        Draft a Stage 2 payment plan proposal for {vendor_name}.
        Invoice #{invoice['invoice_number']} | Total: ${total}.
        Proposal: Installment 1: ${p1} (now), Installment 2: ${p2} (30 days).
        {history}
        Tone: Firm and direct. Acknowledge multiple ignored reminders.
        Sign off as: RevFlow-Ai - Automated Finance Agent
        """
        body = call_groq(prompt)
        return {
            "action": "PROPOSE_PLAN",
            "stage": 2,
            "vendor_email": invoice.get("vendor_email"),
            "email_subject": f"Urgent: Payment Plan Proposal for Invoice #{invoice['invoice_number']}",
            "email_body": body,
            "is_rag_draft": bool(history),
            "audit_action": "PAYMENT_PLAN_PROPOSED",
            "audit_reasoning": "Stage 2 proposal sent after 2 ignored reminders.",
            "db_updates": {
                "collections_stage": 2,
                "stage2_sent_at": today.isoformat()
            }
        }

    # --- Stage 3: Final Notice (14 days after Stage 2) ---
    elif stage == 2:
        s2_date_str = invoice.get("stage2_sent_at")
        if s2_date_str:
            s2_date = date.fromisoformat(s2_date_str)
            if (today - s2_date).days >= 14:
                prompt = f"""
                Draft a Stage 3 Final Notice for {vendor_name}.
                Invoice #{invoice['invoice_number']} is severely overdue.
                This is the final notice before human legal/collections review.
                {history}
                Tone: Very firm, formal.
                Sign off as: RevFlow-Ai - Automated Finance Agent
                """
                body = call_groq(prompt)
                return {
                    "action": "FINAL_NOTICE",
                    "stage": 3,
                    "vendor_email": invoice.get("vendor_email"),
                    "email_subject": f"FINAL NOTICE: Invoice #{invoice['invoice_number']}",
                    "email_body": body,
                    "is_rag_draft": bool(history),
                    "audit_action": "FINAL_NOTICE_SENT",
                    "audit_reasoning": "Stage 3 final notice sent. Flagged for human review.",
                    "db_updates": {
                        "collections_stage": 3,
                        "flagged_for_human": True
                    }
                }

    return None


def execute_escalation(invoice: Dict[str, Any], db_client) -> Optional[Dict[str, Any]]:
    """
    Executes the escalation for an invoice: sends email and updates DB.
    Also stores payment behavior in RAG history.
    """
    action = check_and_escalate(invoice)
    if not action:
        return None

    from utils.email_sender import send_email
    email_status = send_email(
        to_address=action["vendor_email"],
        subject=action["email_subject"],
        body=action["email_body"]
    )

    # Store in RAG history for future context
    event_desc = f"Stage {action['stage']} escalation sent. Status: {email_status.get('success')}"
    store_vendor_history(invoice["vendor_name"], event_desc, {"invoice_id": invoice["id"], "stage": action["stage"]})

    # Update DB
    db_client.table("invoices").update(action["db_updates"]).eq("id", invoice["id"]).execute()
    
    # Audit log
    db_client.table("audit_logs").insert({
        "invoice_id": invoice["id"],
        "agent": "COLLECTIONS",
        "action_taken": action["audit_action"],
        "reasoning": action["audit_reasoning"]
    }).execute()

    return action
