"""
Reconciliation Agent (v3).
Enhanced with 3-stage parsing, RAG-powered dispute emails, and vendor history tracking.
"""

import re
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

import pdfplumber
import pandas as pd
from thefuzz import process as fuzz_process
from thefuzz import fuzz

from utils.groq_client import call_groq
from utils.rag_engine import query_vendor_history, store_vendor_history

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# PDF Parsing
# ---------------------------------------------------------------------------

def parse_invoice_pdf(pdf_path: str) -> dict:
    """
    3-Stage Parsing Strategy:
    1. extract_table() for structured tabular PDFs.
    2. Fall back to text parsing with regex/pipe-delimiter patterns.
    3. Return PARSE_FAILED if both fail.
    """
    result = {
        "success": False,
        "invoice_number": None,
        "po_reference": None,
        "vendor_name": None,
        "items": [],
        "error": None,
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                result["error"] = "PDF has no pages"
                return result

            all_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                all_text += text + "\n"
                
                # Try Strategy 1: Table Extraction per page
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        items = _parse_table_rows(table)
                        if items:
                            result["items"].extend(items)

            # Try Strategy 2: Text Line Parsing if no items found yet
            if not result["items"]:
                result["items"] = _parse_text_lines(all_text)

            # Extract Metadata (Invoice #, PO Ref, Vendor)
            result["invoice_number"] = _extract_field(all_text, r"INVOICE\s*#?\s*([A-Za-z0-9\-]+)")
            result["po_reference"] = _extract_field(all_text, r"PO\s*(?:Reference|Ref|#)?\s*:?\s*([A-Za-z0-9\-]+)")
            result["vendor_name"] = _extract_field(all_text, r"(?:Vendor|From|Supplier)\s*:?\s*(.+)")

            if result["items"]:
                result["success"] = True
            else:
                result["error"] = "PARSE_FAILED: Could not extract line items. Please use a text-based PDF."

    except Exception as e:
        logger.error(f"PDF parsing error: {e}")
        result["error"] = f"PARSE_FAILED: {str(e)}"

    return result


def _parse_table_rows(table: list) -> list:
    items = []
    if not table or len(table) < 2:
        return items
    
    headers = [str(h).lower().strip() if h else "" for h in table[0]]
    for row in table[1:]:
        if not row or all(c is None or str(c).strip() == "" for c in row):
            continue
        try:
            item = {"item_id": "N/A", "item_name": None, "quantity": 0, "unit_price": 0.0}
            for i, header in enumerate(headers):
                if i < len(row):
                    val = str(row[i]).strip() if row[i] else ""
                    if any(x in header for x in ["name", "item", "description"]):
                        item["item_name"] = val
                    elif any(x in header for x in ["qty", "quantity"]):
                        item["quantity"] = int(re.sub(r"[^\d]", "", val)) if val else 0
                    elif any(x in header for x in ["price", "rate", "cost"]):
                        item["unit_price"] = float(re.sub(r"[^\d.]", "", val)) if val else 0.0
            if item["item_name"]:
                items.append(item)
        except: continue
    return items


def _parse_text_lines(text: str) -> list:
    items = []
    for line in text.split("\n"):
        if "|" in line:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 4:
                try:
                    items.append({
                        "item_id": parts[0],
                        "item_name": parts[1],
                        "quantity": int(re.sub(r"[^\d]", "", parts[2])),
                        "unit_price": float(re.sub(r"[^\d.]", "", parts[3])),
                    })
                except: continue
    return items


def _extract_field(text: str, pattern: str) -> Optional[str]:
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip() if match else None


# ---------------------------------------------------------------------------
# RAG-Powered Reconciliation
# ---------------------------------------------------------------------------

def reconcile_invoice(invoice_items: list, po_data: pd.DataFrame, fuzzy_threshold: int = 80, vendor_name: str = "Vendor") -> list:
    results = []
    po_names = po_data["item_name"].tolist() if "item_name" in po_data.columns else []

    for inv_item in invoice_items:
        inv_name = inv_item.get("item_name", "Unknown")
        inv_qty = inv_item.get("quantity", 0)
        inv_price = inv_item.get("unit_price", 0.0)

        best_match, confidence = fuzz_process.extractOne(inv_name, po_names) if po_names else (None, 0)

        result = {
            "item_name": inv_name,
            "matched_to": best_match,
            "confidence_score": confidence,
            "billed_qty": inv_qty,
            "expected_qty": 0,
            "billed_price": inv_price,
            "expected_price": 0.0,
            "status": "UNKNOWN",
            "reasoning": "",
            "email_draft": None,
        }

        if confidence >= fuzzy_threshold and best_match:
            po_row = po_data[po_data["item_name"] == best_match].iloc[0]
            expected_qty = int(po_row["quantity"])
            expected_price = float(po_row["unit_price"])

            result["expected_qty"] = expected_qty
            result["expected_price"] = expected_price

            qty_match = inv_qty == expected_qty
            price_match = abs(inv_price - expected_price) < 0.01

            if qty_match and price_match:
                result["status"] = "MATCH"
                result["reasoning"] = f"Matched to '{best_match}' ({confidence}%). Qty and Price match PO."
            else:
                result["status"] = "DISCREPANCY"
                diff_reason = f"{'Qty mismatch' if not qty_match else ''} {'Price mismatch' if not price_match else ''}".strip()
                result["reasoning"] = f"Matched to '{best_match}' ({confidence}%). {diff_reason}."

                # --- RAG Integration ---
                query = f"{vendor_name} {inv_name} dispute price quantity pattern"
                history = query_vendor_history(vendor_name, query)
                
                prompt = f"""
                Draft a professional dispute email for {vendor_name} regarding '{inv_name}'.
                Billed: {inv_qty} @ ${inv_price} | Expected: {expected_qty} @ ${expected_price}
                {history}
                Tone: Firm but professional. Reference historical patterns if provided.
                Sign off as: RevFlow-Ai - Automated Finance Agent
                """
                result["email_draft"] = call_groq(prompt)

                # Store event in RAG
                store_vendor_history(vendor_name, f"Discrepancy on {inv_name}: Billed ${inv_price} vs Expected ${expected_price}.", {"invoice_item": inv_name})
        else:
            result["reasoning"] = f"No confidence match above {fuzzy_threshold}%."

        results.append(result)
    return results


def run_reconciliation(pdf_path: str, csv_path: str, fuzzy_threshold: int = 80, vendor_name: str = "Vendor") -> dict:
    parsed = parse_invoice_pdf(pdf_path)
    if not parsed["success"]:
        return {"success": False, "error": parsed["error"], "items": []}

    try:
        po_data = pd.read_csv(csv_path)
        po_data.columns = [c.lower().strip() for c in po_data.columns]
    except Exception as e:
        return {"success": False, "error": f"PO Load Error: {e}"}

    results = reconcile_invoice(parsed["items"], po_data, fuzzy_threshold, vendor_name)
    
    statuses = [r["status"] for r in results]
    overall = "MATCHED" if all(s == "MATCH" for s in statuses) else "DISCREPANCY" if "DISCREPANCY" in statuses else "UNKNOWN"

    return {
        "success": True,
        "invoice_number": parsed["invoice_number"],
        "po_reference": parsed["po_reference"],
        "vendor_name": parsed["vendor_name"] or vendor_name,
        "overall_status": overall,
        "items": results,
        "total_items": len(results),
        "matched": statuses.count("MATCH"),
        "discrepancies": statuses.count("DISCREPANCY"),
        "unknown": statuses.count("UNKNOWN"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
