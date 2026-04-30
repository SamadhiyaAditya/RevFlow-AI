"""
Audit Log Router.
Provides paginated audit log viewing and CSV export.
"""

import io
import csv
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from db.supabase_client import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


@router.get("")
async def list_audit_logs(
    agent: Optional[str] = Query(None, description="Filter by agent: RECONCILIATION, COLLECTIONS, MANUAL"),
    action: Optional[str] = Query(None, description="Filter by action_taken"),
    invoice_id: Optional[str] = Query(None, description="Filter by invoice ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List audit logs with optional filters and pagination."""
    try:
        query = supabase.table("audit_logs").select("*, invoices(invoice_number, vendor_name)").order("timestamp", desc=True)
        if agent:
            query = query.eq("agent", agent.upper())
        if action:
            query = query.eq("action_taken", action.upper())
        if invoice_id:
            query = query.eq("invoice_id", invoice_id)
        query = query.range(offset, offset + limit - 1)
        response = query.execute()
        return {"logs": response.data or [], "count": len(response.data or []), "offset": offset, "limit": limit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_audit_logs(format: str = Query("csv", description="Export format: csv")):
    """Export all audit logs as a downloadable CSV file."""
    try:
        response = supabase.table("audit_logs").select("*").order("timestamp", desc=True).execute()
        logs = response.data or []

        if format.lower() == "csv":
            output = io.StringIO()
            if logs:
                writer = csv.DictWriter(output, fieldnames=logs[0].keys())
                writer.writeheader()
                writer.writerows(logs)
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
            )
        else:
            raise HTTPException(status_code=400, detail="Only CSV export is currently supported.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{invoice_id}")
async def get_audit_logs_for_invoice(invoice_id: str):
    """Get all audit log entries for a specific invoice."""
    try:
        response = supabase.table("audit_logs").select("*").eq("invoice_id", invoice_id).order("timestamp", desc=True).execute()
        return {"invoice_id": invoice_id, "logs": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
