"""
Collections Router.
Manual email triggers, batch escalation, overdue/flagged listing.
"""

import logging
from typing import Optional
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.supabase_client import supabase
from agents.collections import check_and_escalate, execute_escalation
from utils.email_sender import send_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/collections", tags=["Collections"])


class EmailEditRequest(BaseModel):
    email_body: Optional[str] = None
    email_subject: Optional[str] = None


@router.post("/send/{invoice_id}")
async def send_collections_email(invoice_id: str, edits: Optional[EmailEditRequest] = None):
    """Send appropriate stage email. Supports human-in-the-loop editing."""
    try:
        inv_resp = supabase.table("invoices").select("*").eq("id", invoice_id).execute()
        if not inv_resp.data:
            raise HTTPException(status_code=404, detail="Invoice not found")

        action = check_and_escalate(inv_resp.data[0])
        if not action:
            return {"success": False, "message": "No escalation action needed.", "current_stage": inv_resp.data[0].get("collections_stage", 0)}

        if edits:
            if edits.email_body:
                action["email_body"] = edits.email_body
            if edits.email_subject:
                action["email_subject"] = edits.email_subject

        email_result = send_email(action["vendor_email"], action["email_subject"], action["email_body"])

        supabase.table("invoices").update(action["db_updates"]).eq("id", invoice_id).execute()
        supabase.table("audit_logs").insert({"invoice_id": invoice_id, "agent": "COLLECTIONS", "action_taken": action["audit_action"], "reasoning": action["audit_reasoning"]}).execute()
        supabase.table("email_logs").insert({"invoice_id": invoice_id, "recipient_email": action["vendor_email"], "subject": action["email_subject"], "body": action["email_body"], "stage": action["stage"], "trigger": "MANUAL"}).execute()

        return {"success": True, "action": action["action"], "stage": action["stage"], "email_sent": email_result.get("success", False)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview/{invoice_id}")
async def preview_collections_email(invoice_id: str):
    """Preview the next email without sending."""
    try:
        inv_resp = supabase.table("invoices").select("*").eq("id", invoice_id).execute()
        if not inv_resp.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        action = check_and_escalate(inv_resp.data[0])
        if not action:
            return {"has_next_action": False, "message": "No escalation action available."}
        return {
            "has_next_action": True, 
            "action": action["action"], 
            "stage": action["stage"], 
            "email_subject": action["email_subject"], 
            "email_body": action["email_body"], 
            "vendor_email": action["vendor_email"],
            "is_rag_draft": action.get("is_rag_draft", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-all")
async def run_all_escalations():
    """Run escalation check on all overdue invoices."""
    try:
        response = supabase.table("invoices").select("*").in_("status", ["PENDING", "MATCHED", "OVERDUE"]).lt("collections_stage", 3).execute()
        results = []
        for invoice in (response.data or []):
            result = execute_escalation(invoice, supabase)
            if result:
                results.append(result)
        return {"success": True, "checked": len(response.data or []), "actions_taken": len(results), "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue")
async def list_overdue_invoices():
    """List all overdue invoices."""
    try:
        response = supabase.table("invoices").select("*").in_("status", ["PENDING", "MATCHED", "OVERDUE"]).order("due_date", desc=False).execute()
        today = date.today().isoformat()
        overdue = [inv for inv in (response.data or []) if inv.get("due_date") and inv["due_date"] < today]
        return {"invoices": overdue, "total": len(overdue)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flagged")
async def list_flagged_invoices():
    """List invoices flagged for human review (Stage 3)."""
    try:
        response = supabase.table("invoices").select("*").eq("flagged_for_human", True).order("created_at", desc=True).execute()
        return {"invoices": response.data or [], "total": len(response.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
