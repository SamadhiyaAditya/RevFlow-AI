"""
RevFlow-Ai — FastAPI Backend Entry Point.
Configures CORS, mounts all routers, starts the scheduler, and provides
the health check + stats + demo data endpoints.
"""

import os
import uuid
import logging
from datetime import datetime, date, timedelta, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Import routers
from routers.reconcile import router as reconcile_router
from routers.invoices import router as invoices_router
from routers.collections import router as collections_router
from routers.audit import router as audit_router

# Import DB and scheduler
from db.supabase_client import supabase
from scheduler.jobs import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 RevFlow-Ai backend starting up...")
    start_scheduler()
    yield
    logger.info("👋 RevFlow-Ai backend shutting down...")
    stop_scheduler()


app = FastAPI(
    title="RevFlow-Ai",
    description="Agentic AI Finance Agent — Invoice Reconciliation & Collections Automation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://revflowai.vercel.app",
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(reconcile_router)
app.include_router(invoices_router)
app.include_router(collections_router)
app.include_router(audit_router)


# ---------------------------------------------------------------------------
# Health Check (for UptimeRobot)
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "RevFlow-Ai", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Dashboard Stats
# ---------------------------------------------------------------------------

@app.get("/api/stats", tags=["Stats"])
async def get_stats():
    """Dashboard summary statistics including failed emails."""
    try:
        all_inv = supabase.table("invoices").select("id, status, collections_stage, flagged_for_human").execute()
        invoices = all_inv.data or []

        today = date.today().isoformat()
        emails_today = supabase.table("email_logs").select("id").gte("sent_at", today).execute()
        failed_emails = supabase.table("email_logs").select("id").eq("status", "FAILED").execute()

        total = len(invoices)
        matched = sum(1 for i in invoices if i["status"] == "MATCHED")
        discrepancies = sum(1 for i in invoices if i["status"] == "DISCREPANCY")
        overdue = sum(1 for i in invoices if i["status"] == "OVERDUE")
        paid = sum(1 for i in invoices if i["status"] == "PAID")
        pending = sum(1 for i in invoices if i["status"] == "PENDING")
        flagged = sum(1 for i in invoices if i.get("flagged_for_human"))
        
        stages = {"stage_1": 0, "stage_2": 0, "stage_3": 0}
        for i in invoices:
            stage = i.get("collections_stage")
            if stage in [1, 2, 3]:
                stages[f"stage_{stage}"] += 1

        return {
            "total_invoices": total,
            "matched": matched,
            "discrepancies": discrepancies,
            "overdue": overdue,
            "paid": paid,
            "pending": pending,
            "flagged_for_human": flagged,
            "emails_sent_today": len(emails_today.data or []),
            "failed_emails_count": len(failed_emails.data or []),
            "collections_stages": stages,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/demo/clear", tags=["Demo"])
async def clear_demo_data():
    """Wipe all demo-seeded records."""
    try:
        # Cascading delete handles related records if schema is set correctly
        # But for safety, we'll clear invoices
        supabase.table("invoices").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        supabase.table("purchase_orders").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        supabase.table("vendor_history").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        return {"success": True, "message": "All records cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/demo/load", tags=["Demo"])
async def load_demo_data():
    """Populate the database with sample data for demos."""
    try:
        today = date.today()

        # Sample Purchase Orders
        pos = [
            {"po_number": "PO-2026-001", "item_id": "HW-01", "item_name": "MacBook Pro 14-inch", "quantity": 5, "unit_price": 1999.00},
            {"po_number": "PO-2026-001", "item_id": "HW-02", "item_name": "Magic Mouse", "quantity": 10, "unit_price": 79.00},
            {"po_number": "PO-2026-001", "item_id": "HW-03", "item_name": "USB-C Hub Adapter", "quantity": 15, "unit_price": 49.00},
            {"po_number": "PO-2026-002", "item_id": "SW-01", "item_name": "Adobe Creative Suite License", "quantity": 3, "unit_price": 599.00},
            {"po_number": "PO-2026-002", "item_id": "SW-02", "item_name": "Microsoft 365 Business", "quantity": 20, "unit_price": 12.50},
            {"po_number": "PO-2026-003", "item_id": "OF-01", "item_name": "Ergonomic Office Chair", "quantity": 8, "unit_price": 450.00},
            {"po_number": "PO-2026-003", "item_id": "OF-02", "item_name": "Standing Desk", "quantity": 4, "unit_price": 699.00},
        ]
        for po in pos:
            supabase.table("purchase_orders").insert(po).execute()

        # Sample Invoices at different stages
        invoices_data = [
            {"invoice_number": "INV-2026-101", "vendor_name": "TechSupply Co.", "vendor_email": "billing@techsupply.demo", "po_reference": "PO-2026-001", "total_amount": 12775.00, "due_date": (today - timedelta(days=3)).isoformat(), "status": "MATCHED", "collections_stage": 0, "reminder_count": 0, "flagged_for_human": False, "response_received": False},
            {"invoice_number": "INV-2026-102", "vendor_name": "SoftLicense Inc.", "vendor_email": "ar@softlicense.demo", "po_reference": "PO-2026-002", "total_amount": 2147.00, "due_date": (today - timedelta(days=12)).isoformat(), "status": "OVERDUE", "collections_stage": 1, "reminder_count": 2, "flagged_for_human": False, "response_received": False, "last_reminder_sent": (today - timedelta(days=5)).isoformat()},
            {"invoice_number": "INV-2026-103", "vendor_name": "OfficeFurnish Ltd.", "vendor_email": "accounts@officefurnish.demo", "po_reference": "PO-2026-003", "total_amount": 6996.00, "due_date": (today - timedelta(days=35)).isoformat(), "status": "OVERDUE", "collections_stage": 2, "reminder_count": 3, "flagged_for_human": False, "response_received": False, "last_reminder_sent": (today - timedelta(days=18)).isoformat()},
            {"invoice_number": "INV-2026-104", "vendor_name": "TechSupply Co.", "vendor_email": "billing@techsupply.demo", "po_reference": "PO-2026-001", "total_amount": 11500.00, "due_date": (today + timedelta(days=10)).isoformat(), "status": "DISCREPANCY", "collections_stage": 0, "reminder_count": 0, "flagged_for_human": False, "response_received": False},
            {"invoice_number": "INV-2026-105", "vendor_name": "CloudHost Services", "vendor_email": "finance@cloudhost.demo", "total_amount": 2400.00, "due_date": (today - timedelta(days=60)).isoformat(), "status": "OVERDUE", "collections_stage": 3, "reminder_count": 4, "flagged_for_human": True, "response_received": False},
        ]
        invoice_ids = []
        for inv in invoices_data:
            resp = supabase.table("invoices").insert(inv).execute()
            if resp.data:
                invoice_ids.append(resp.data[0]["id"])

        # Sample audit logs
        if invoice_ids:
            logs = [
                {"invoice_id": invoice_ids[0], "agent": "RECONCILIATION", "action_taken": "RECONCILED", "reasoning": "3 items checked. All matched PO-2026-001."},
                {"invoice_id": invoice_ids[1], "agent": "COLLECTIONS", "action_taken": "EMAIL_SENT", "reasoning": "Stage 1 reminder. Invoice 12 days overdue."},
                {"invoice_id": invoice_ids[3], "agent": "RECONCILIATION", "action_taken": "ESCALATED", "reasoning": "Price discrepancy on MacBook Pro. Billed $2199 vs PO $1999."},
            ]
            for log in logs:
                supabase.table("audit_logs").insert(log).execute()

        return {"success": True, "message": "Demo data loaded.", "purchase_orders": len(pos), "invoices": len(invoices_data)}
    except Exception as e:
        logger.error(f"Demo load failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
