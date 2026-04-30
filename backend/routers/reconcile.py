"""
Reconciliation Router.
Handles PDF + CSV upload, reconciliation execution, and report retrieval.
Also includes PO management endpoints.
"""

import os
import shutil
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
import pandas as pd

from db.supabase_client import supabase
from agents.reconciliation import run_reconciliation, parse_invoice_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Reconciliation"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/reconcile")
async def reconcile_invoice(
    pdf_file: UploadFile = File(..., description="PDF invoice file"),
    csv_file: UploadFile = File(..., description="CSV file of Purchase Orders"),
    vendor_name: str = Form("Vendor"),
    vendor_email: str = Form(""),
    fuzzy_threshold: int = Form(80),
):
    """
    Upload a PDF invoice and CSV of Purchase Orders.
    Runs the full reconciliation pipeline and returns the report.
    """
    # Save uploaded files temporarily
    run_id = str(uuid.uuid4())[:8]
    pdf_path = os.path.join(UPLOAD_DIR, f"{run_id}_{pdf_file.filename}")
    csv_path = os.path.join(UPLOAD_DIR, f"{run_id}_{csv_file.filename}")

    try:
        with open(pdf_path, "wb") as f:
            shutil.copyfileobj(pdf_file.file, f)
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(csv_file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded files: {str(e)}")

    # Run reconciliation (items extraction)
    report = run_reconciliation(
        pdf_path=pdf_path,
        csv_path=csv_path,
        fuzzy_threshold=fuzzy_threshold,
        vendor_name=vendor_name,
    )

    if not report["success"]:
        # Specific handling for PARSE_FAILED from agent
        if report.get("overall_status") == "PARSE_FAILED":
            return report
        raise HTTPException(status_code=422, detail=report.get("error", "Reconciliation failed"))

    # Extract or Generate Invoice Number for deduplication
    # (Agent should ideally extract this, fallback to run_id)
    invoice_number = report.get("invoice_number") or f"INV-{run_id}"

    # Deduplication check via DB query (redundant to UNIQUE constraint but cleaner response)
    existing = supabase.table("invoices").select("id, created_at").eq(
        "invoice_number", invoice_number
    ).execute()
    
    if existing.data:
        _cleanup_files(pdf_path, csv_path)
        return {
            "success": False,
            "duplicate": True,
            "message": f"Invoice #{invoice_number} already exists.",
            "existing_invoice_id": existing.data[0]["id"],
            "processed_at": existing.data[0]["created_at"],
        }

    # Save invoice to DB
    try:
        invoice_data = {
            "invoice_number": invoice_number or f"INV-{run_id}",
            "vendor_name": report.get("vendor_name", vendor_name),
            "vendor_email": vendor_email,
            "po_reference": report.get("po_reference"),
            "total_amount": sum(item["billed_price"] * item["billed_qty"] for item in report["items"]),
            "status": report["overall_status"],
            "collections_stage": 0,
            "reminder_count": 0,
            "flagged_for_human": False,
            "response_received": False,
            "pdf_path": pdf_path,
        }
        invoice_resp = supabase.table("invoices").insert(invoice_data).execute()
        invoice_id = invoice_resp.data[0]["id"] if invoice_resp.data else None
    except Exception as e:
        logger.error(f"Failed to save invoice: {e}")
        invoice_id = None

    # Save reconciliation results to DB
    if invoice_id:
        for item in report["items"]:
            try:
                supabase.table("reconciliation_reports").insert({
                    "invoice_id": invoice_id,
                    "item_name": item["item_name"],
                    "matched_to": item["matched_to"],
                    "confidence_score": item["confidence_score"],
                    "billed_qty": item["billed_qty"],
                    "expected_qty": item["expected_qty"],
                    "billed_price": item["billed_price"],
                    "expected_price": item["expected_price"],
                    "status": item["status"],
                    "reasoning": item["reasoning"],
                    "email_draft": item.get("email_draft"),
                }).execute()
            except Exception as e:
                logger.error(f"Failed to save reconciliation item: {e}")

        # Audit log
        try:
            supabase.table("audit_logs").insert({
                "invoice_id": invoice_id,
                "agent": "RECONCILIATION",
                "action_taken": "RECONCILED" if report["overall_status"] == "MATCH" else "ESCALATED",
                "reasoning": (
                    f"Processed {report['total_items']} items. "
                    f"{report['matched']} matched, {report['discrepancies']} discrepancies, "
                    f"{report['unknown']} unknown. Overall: {report['overall_status']}."
                ),
            }).execute()
        except Exception as e:
            logger.error(f"Failed to insert audit log: {e}")

    report["invoice_id"] = invoice_id
    _cleanup_files(pdf_path, csv_path)
    return report


@router.get("/reconcile/{invoice_id}")
async def get_reconciliation_report(invoice_id: str):
    """Get the reconciliation report for a specific invoice."""
    try:
        response = supabase.table("reconciliation_reports").select("*").eq(
            "invoice_id", invoice_id
        ).execute()
        return {"invoice_id": invoice_id, "items": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reconcile")
async def list_reconciliation_reports(status: Optional[str] = Query(None)):
    """List all reconciliation reports, optionally filtered by status."""
    try:
        query = supabase.table("reconciliation_reports").select("*").order("created_at", desc=True)
        if status:
            query = query.eq("status", status.upper())
        response = query.execute()
        return {"items": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# PO Management
# ---------------------------------------------------------------------------

@router.post("/pos/upload")
async def upload_purchase_orders(csv_file: UploadFile = File(...)):
    """Batch upload Purchase Orders from a CSV file into the master PO database."""
    csv_path = os.path.join(UPLOAD_DIR, f"po_{uuid.uuid4().hex[:8]}_{csv_file.filename}")
    try:
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(csv_file.file, f)

        df = pd.read_csv(csv_path)

        # Normalize column names
        col_map = {}
        for col in df.columns:
            lower = col.lower().strip()
            if "id" in lower or "code" in lower:
                col_map[col] = "item_id"
            elif "name" in lower or "item" in lower or "description" in lower:
                col_map[col] = "item_name"
            elif "qty" in lower or "quantity" in lower:
                col_map[col] = "quantity"
            elif "price" in lower or "cost" in lower or "rate" in lower:
                col_map[col] = "unit_price"
            elif "po" in lower and ("number" in lower or "no" in lower or "ref" in lower):
                col_map[col] = "po_number"
        df = df.rename(columns=col_map)

        inserted = 0
        for _, row in df.iterrows():
            try:
                supabase.table("purchase_orders").insert({
                    "po_number": str(row.get("po_number", f"PO-{uuid.uuid4().hex[:6]}")),
                    "item_id": str(row.get("item_id", "")),
                    "item_name": str(row.get("item_name", "")),
                    "quantity": int(row.get("quantity", 0)),
                    "unit_price": float(row.get("unit_price", 0.0)),
                }).execute()
                inserted += 1
            except Exception as e:
                logger.warning(f"Skipped PO row: {e}")

        os.remove(csv_path)
        return {"success": True, "inserted": inserted, "total_rows": len(df)}

    except Exception as e:
        if os.path.exists(csv_path):
            os.remove(csv_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pos")
async def list_purchase_orders():
    """List all Purchase Orders in the master database."""
    try:
        response = supabase.table("purchase_orders").select("*").order("created_at", desc=True).execute()
        return {"items": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _cleanup_files(*paths):
    """Remove temporary files."""
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
