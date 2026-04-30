"""
APScheduler daily collections escalation job.
Includes cold-start protection: checks for missed jobs on startup.
"""

import os
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler

from db.supabase_client import supabase
from agents.collections import execute_escalation

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def run_collections_escalation():
    """
    Fetch all overdue invoices from Supabase and run the collections
    escalation check on each one.
    """
    logger.info("🔄 Running scheduled collections escalation check...")

    try:
        # Fetch invoices that are overdue and not yet fully escalated (stage < 3)
        # Also exclude PAID and DISCREPANCY statuses
        response = supabase.table("invoices").select("*").in_(
            "status", ["PENDING", "MATCHED", "OVERDUE"]
        ).lt("collections_stage", 3).execute()

        invoices = response.data or []
        logger.info(f"Found {len(invoices)} invoices to check for escalation.")

        results = []
        for invoice in invoices:
            result = execute_escalation(invoice, supabase)
            if result:
                results.append(result)
                logger.info(f"  → {result['action']} for invoice #{result['invoice_number']}")

        logger.info(f"✅ Escalation complete. {len(results)} actions taken.")
        return results

    except Exception as e:
        logger.error(f"❌ Collections escalation job failed: {e}")
        return []


def start_scheduler():
    """
    Start the APScheduler with the daily collections job.
    Also runs a missed-job check immediately on startup (cold-start protection).
    """
    run_time = os.getenv("COLLECTIONS_RUN_TIME", "09:00")
    hour, minute = run_time.split(":")

    scheduler.add_job(
        run_collections_escalation,
        "cron",
        hour=int(hour),
        minute=int(minute),
        id="daily_collections",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"📅 Scheduler started. Daily collections run at {run_time}.")

    # Cold-start protection: check if we missed today's run
    now = datetime.now(timezone.utc)
    scheduled_hour = int(hour)
    if now.hour > scheduled_hour:
        logger.info("⚡ Detected possible missed job (server woke up late). Running now...")
        run_collections_escalation()


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped.")
