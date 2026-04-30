# 📖 RevFlow-Ai — Technical Documentation

## 1. Project Overview
RevFlow-Ai is an Agentic AI system designed to automate Accounts Receivable operations. It replaces manual spreadsheet-based invoice matching and collection follow-ups with an autonomous pipeline that uses LLMs and Vector Search (RAG).

## 2. System Architecture

### 2.1 Backend (FastAPI)
The backend is structured into modular routers:
- `routers/reconcile`: Handles PDF upload, parsing, fuzzy matching, and discrepancy report generation.
- `routers/collections`: Manages the escalation logic, email previews, and automated sending.
- `routers/invoices`: CRUD operations for the invoice database.
- `routers/pos`: Management of Purchase Orders.
- `routers/audit`: Action logging and CSV export.

### 2.2 RAG Pipeline
The RAG (Retrieval-Augmented Generation) engine is the core intelligence of RevFlow-Ai:
1. **Embedding**: When a dispute or collection event occurs, the context is converted into a vector using the `all-MiniLM-L6-v2` model.
2. **Retrieval**: Supabase `pgvector` performs a similarity search against the `vendor_history` table.
3. **Augmentation**: The top 3 historical events are injected into the Groq LLM prompt.
4. **Generation**: Groq (Llama 3) generates a response that acknowledges past interactions.

### 2.3 PDF Parsing Strategy
We use a 3-stage resilient strategy:
1. **`extract_table()`**: Primary attempt for clean, digital PDFs.
2. **`extract_text()`**: Fallback Regex-based parsing for less structured documents.
3. **Manual Flag**: If parsing fails, the status is set to `PARSE_FAILED` and the user is notified.

## 3. Database Schema

### 3.1 Tables
- **`purchase_orders`**: The "source of truth" for expected billing.
- **`invoices`**: Main registry of received bills and their lifecycle status.
- **`reconciliation_reports`**: Detailed row-by-row audit results.
- **`vendor_history`**: Vector store for RAG context.
- **`audit_logs`**: Immutable record of every AI agent action.
- **`email_logs`**: Tracking for SMTP deliveries (Sent vs. Failed).

## 4. Agent Logic

### 4.1 Reconciliation Agent
- **Fuzzy Matching**: Matches "MBP 14" to "MacBook Pro" using an 80% confidence threshold.
- **Audit Logic**: Compares `billed_qty` vs `expected_qty` and `billed_price` vs `expected_price`.
- **Reasoning**: Generates human-readable explanations for every flag.

### 4.2 Collections Agent
- **Stage 1 (Reminder)**: Sent 1-7 days post due-date.
- **Stage 2 (Payment Plan)**: Proposed after 2 ignored Stage 1 reminders.
- **Stage 3 (Final Notice)**: Flagged for human review after Stage 2 is ignored for 14 days.

## 5. API Reference

### Reconciliation
- `POST /api/reconcile`: Upload PDF and run agent.
- `GET /api/reconcile/{id}`: Retrieve report.

### Collections
- `POST /api/collections/run-all`: Trigger daily escalation.
- `GET /api/collections/preview/{id}`: Preview next AI email.

### Stats
- `GET /api/stats`: Dashboard metrics.

## 6. Security & Best Practices
- **Environment Variables**: All API keys and DB credentials must be stored in `.env`.
- **CORS**: Configured to only allow requests from the React frontend URL.
- **SMTP Safety**: All email calls are wrapped in failure logs to prevent silent crashes.

---
*Last Updated: April 2026*
