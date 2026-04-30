"""
Invoice Management Router.
CRUD operations for invoices.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db.supabase_client import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


class InvoiceStatusUpdate(BaseModel):
    status: str


class InvoiceResponseUpdate(BaseModel):
    response_received: bool


@router.get("")
async def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, MATCHED, DISCREPANCY, OVERDUE, PAID"),
    collections_stage: Optional[int] = Query(None, description="Filter by collections stage: 0, 1, 2, 3"),
    flagged: Optional[bool] = Query(None, description="Filter by flagged_for_human"),
):
    """List all invoices with optional filters."""
    try:
        query = supabase.table("invoices").select("*").order("created_at", desc=True)
        if status:
            query = query.eq("status", status.upper())
        if collections_stage is not None:
            query = query.eq("collections_stage", collections_stage)
        if flagged is not None:
            query = query.eq("flagged_for_human", flagged)
        response = query.execute()
        return {"invoices": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get full invoice detail including reconciliation report and email history."""
    try:
        # Fetch invoice
        inv_resp = supabase.table("invoices").select("*").eq("id", invoice_id).execute()
        if not inv_resp.data:
            raise HTTPException(status_code=404, detail="Invoice not found")

        invoice = inv_resp.data[0]

        # Fetch reconciliation report
        recon_resp = supabase.table("reconciliation_reports").select("*").eq("invoice_id", invoice_id).execute()

        # Fetch email history
        email_resp = supabase.table("email_logs").select("*").eq("invoice_id", invoice_id).order("sent_at", desc=True).execute()

        # Fetch audit logs
        audit_resp = supabase.table("audit_logs").select("*").eq("invoice_id", invoice_id).order("timestamp", desc=True).execute()

        return {
            "invoice": invoice,
            "reconciliation_report": recon_resp.data or [],
            "email_history": email_resp.data or [],
            "audit_logs": audit_resp.data or [],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, body: InvoiceStatusUpdate):
    """Update an invoice's status (e.g. mark as PAID)."""
    valid_statuses = ["PENDING", "MATCHED", "DISCREPANCY", "OVERDUE", "PAID"]
    if body.status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    try:
        response = supabase.table("invoices").update(
            {"status": body.status.upper()}
        ).eq("id", invoice_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Audit log
        supabase.table("audit_logs").insert({
            "invoice_id": invoice_id,
            "agent": "MANUAL",
            "action_taken": f"STATUS_CHANGED_TO_{body.status.upper()}",
            "reasoning": f"Invoice status manually updated to {body.status.upper()}.",
        }).execute()

        return {"success": True, "invoice": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FlagRespondedRequest(BaseModel):
    flagged: bool


@router.patch("/{invoice_id}/flag-responded")
async def flag_as_responded(invoice_id: str, body: FlagRespondedRequest):
    """Manually flag an invoice as responded to stop auto-escalation."""
    try:
        response = supabase.table("invoices").update(
            {"flagged_as_responded": body.flagged}
        ).eq("id", invoice_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")

        supabase.table("audit_logs").insert({
            "invoice_id": invoice_id,
            "agent": "MANUAL",
            "action_taken": "FLAGGED_AS_RESPONDED" if body.flagged else "UNFLAGGED_AS_RESPONDED",
            "reasoning": f"Manual response flag set to {body.flagged}.",
        }).execute()

        return {"success": True, "invoice": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{invoice_id}/response")
async def update_response_received(invoice_id: str, body: InvoiceResponseUpdate):
    """Mark an invoice as having received a response (stops auto-escalation)."""
    try:
        response = supabase.table("invoices").update(
            {"response_received": body.response_received}
        ).eq("id", invoice_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")

        supabase.table("audit_logs").insert({
            "invoice_id": invoice_id,
            "agent": "MANUAL",
            "action_taken": "RESPONSE_RECEIVED" if body.response_received else "RESPONSE_UNMARKED",
            "reasoning": f"Response received flag set to {body.response_received}. Auto-escalation {'stopped' if body.response_received else 'resumed'}.",
        }).execute()

        return {"success": True, "invoice": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Delete an invoice and all related records."""
    try:
        # Delete related records first
        supabase.table("reconciliation_reports").delete().eq("invoice_id", invoice_id).execute()
        supabase.table("email_logs").delete().eq("invoice_id", invoice_id).execute()
        supabase.table("audit_logs").delete().eq("invoice_id", invoice_id).execute()

        # Delete invoice
        response = supabase.table("invoices").delete().eq("id", invoice_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")

        return {"success": True, "message": "Invoice and related records deleted."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
