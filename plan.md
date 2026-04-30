# RevFlow-Ai — Full Project Plan
### Agentic AI Finance Agent | End-to-End Web Application for Small Business AR Automation

| Status | Target User | Budget |
|---|---|---|
| Active — In Development | Small Business Finance Teams | 100% Free Tier Stack |

> **v3 — Updated with critical fixes + RAG:** scheduler resilience, response tracking, DISCREPANCY collection exclusion, PDF parse failure handling, file storage, deduplication, editable email previews, clickable stat cards, demo mode, PO management page, and RAG-powered email generation for reconciliation disputes and all 3 collections stages using pgvector on Supabase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Tooling Decisions](#2-tech-stack--tooling-decisions)
3. [System Architecture](#3-system-architecture)
4. [Backend — FastAPI Endpoints](#4-backend--fastapi-endpoints)
5. [Frontend — React Dashboard](#5-frontend--react-dashboard)
6. [Agent Logic — Detailed Specifications](#6-agent-logic--detailed-specifications)
7. [Development Phases & Task Breakdown](#7-development-phases--task-breakdown)
8. [Project Folder Structure](#8-project-folder-structure)
9. [Environment Variables](#9-environment-variables)
10. [Deployment Guide](#10-deployment-guide)
11. [What Needs to Be Built vs What Exists](#11-what-needs-to-be-built-vs-what-exists)
12. [Known Risks & Mitigations](#12-known-risks--mitigations)
13. [RAG Implementation](#13-rag-implementation)

---

## 1. Project Overview

### 1.1 The Problem Being Solved

Small businesses face two painful, time-consuming problems in their finance operations every month:

- **Manual invoice matching is error-prone** — staff compare PDFs against spreadsheets line by line, missing overcharges and quantity errors.
- **Collections follow-up is uncomfortable and time-consuming** — chasing late payments via phone or manual emails takes hours and is often avoided entirely.

These two problems compound each other. Businesses lose money on both ends: paying wrong invoices and not collecting money owed to them.

### 1.2 What This Agent Does

This project is a full-stack Agentic AI web application with two autonomous pipelines:

| Pipeline | What It Does |
|---|---|
| **Reconciliation Agent** | Accepts a PDF invoice and a CSV of Purchase Orders. Parses the invoice, performs fuzzy matching against PO data, and flags every discrepancy in quantity and price with a confidence score. Uses RAG to retrieve the vendor's full PO and dispute history before generating AI-drafted dispute emails — making each email historically aware and specific. |
| **Collections Agent** | Tracks invoice due dates and autonomously escalates through 3 stages — reminder email, AI-suggested payment plan, and final notice with human escalation flag. Uses RAG to retrieve the vendor's full payment behaviour history before generating each stage email — adjusting tone and urgency based on their track record. Excludes invoices in DISCREPANCY status. |

### 1.3 What Already Exists (From Partner's Work)

The Google Colab notebook contains solid proof-of-concept logic that will be migrated into the production app:

- ✅ **PDF invoice parsing** using `pdfplumber` — extracts item names, quantities, and prices from structured PDF invoices
- ✅ **PO matching — exact and fuzzy** using `thefuzz` (Levenshtein distance) with configurable confidence threshold (default 80%)
- ✅ **Multi-item reconciliation engine** — handles invoices with multiple line items, checks each independently
- ✅ **Discrepancy detection** — catches quantity mismatches and price mismatches per line item
- ✅ **Email draft generation** — template-based drafting built, but LLM is never actually called (commented out)
- ✅ **Audit log generation** — records timestamp, agent action, and reasoning per item

> **Key Gap Identified:** The LangChain prompt template is built but the LLM is never actually invoked — it is commented out with a `NOTE`. This is the single most critical fix in Phase 1. We will replace LangChain + Gemini with a direct Groq API call.

---

## 2. Tech Stack & Tooling Decisions

> Every tool selected is on the free tier. No paid services are required to build, run, or deploy this application.

| Layer | Tool | Purpose | Cost |
|---|---|---|---|
| **AI / LLM** | Groq API | Generate intelligent email drafts for discrepancies, payment reminders, and payment plan proposals | Free tier |
| **RAG — Embeddings** | sentence-transformers (Python) | Convert vendor history text into vector embeddings locally — no external embedding API needed | Free / Open Source |
| **RAG — Vector Store** | Supabase pgvector | Store and query vector embeddings inside the existing Supabase PostgreSQL database | Free tier |
| **PDF Parsing** | pdfplumber (Python) | Extract structured text from uploaded invoice PDFs | Free / Open Source |
| **Fuzzy Matching** | thefuzz + python-Levenshtein | Match invoice item names to PO item names even with typos or abbreviations | Free / Open Source |
| **Backend** | FastAPI (Python) | REST API serving all agent logic, file uploads, scheduling | Free / Open Source |
| **Database** | Supabase (PostgreSQL) | Store invoices, POs, reconciliation reports, audit logs, email records, escalation stages | Free tier |
| **File Storage** | Supabase Storage | Store uploaded PDF invoices persistently — survives server restarts | Free tier (1GB) |
| **Email Sending** | Gmail SMTP (smtplib) | Send automated reminder and escalation emails — no third-party service needed | Free |
| **Scheduler** | APScheduler + cron-job.org | APScheduler inside FastAPI + external HTTP cron as redundant trigger | Free |
| **Frontend** | React + Tailwind CSS | Dashboard UI for uploads, reports, email triggers, escalation tracking, audit logs | Free / Open Source |
| **Backend Hosting** | Render | Deploy FastAPI backend on free tier | Free tier |
| **Frontend Hosting** | Vercel | Deploy React app on free tier with automatic GitHub deploys | Free tier |
| **Auth** | Supabase Auth | Simple login/logout for the dashboard | Free tier |

### 2.1 Why Groq Over LangChain + Gemini

- The existing code uses LangChain only for prompt templating — it never calls a real LLM.
- Groq offers extremely fast inference on open-source models (Llama 3) for free.
- Direct Groq API calls are simpler, faster, and remove an unnecessary abstraction layer.
- LangChain adds complexity with no benefit at this project's scale.

### 2.2 Why Gmail SMTP Over SendGrid / Nodemailer

- Gmail SMTP via Python's built-in `smtplib` requires zero setup beyond a Gmail App Password.
- Nodemailer is Node.js only — this project's backend is Python/FastAPI.
- SendGrid free tier has monthly limits and requires domain verification.
- All SMTP calls are wrapped in try/except with failure logging so silent failures are caught.

### 2.3 Why Supabase Storage for PDFs

- Render's free tier has an **ephemeral filesystem** — files saved locally are wiped on every deploy or server restart.
- Supabase Storage is part of the same free Supabase project already being used for the database.
- Uploaded PDFs are stored once at ingest time; the public URL is saved in `pdf_path`. Files persist independently of the server.

### 2.4 Scheduler Resilience: APScheduler + cron-job.org

- Render's free tier spins down after 15 minutes of inactivity. When the server restarts, APScheduler restarts too — any missed scheduled runs are lost silently.
- Solution: APScheduler runs inside FastAPI as primary scheduler. Additionally, `POST /api/collections/run-all` is exposed as a public endpoint that [cron-job.org](https://cron-job.org) (free) hits once daily at the configured time.
- This means collections escalation runs reliably even if the server was asleep.

### 2.5 Why RAG for Email Generation

Without RAG, every Groq email is generated from scratch using only the current invoice's data. The result is a generic, context-free email that treats every vendor the same.

With RAG, before calling Groq, the agent retrieves relevant historical context for that vendor from the vector store — past disputes, previous prices agreed, how many times they've been late, whether they've responded to reminders before. This context is injected into the Groq prompt, so the generated email is historically aware.

**Concrete examples of what RAG enables:**
- Reconciliation email: *"This is the second time in three months that MacBook Pro units have been overbilled. Our PO from [date] confirmed the agreed price of $2,000."* — instead of a generic dispute email.
- Collections Stage 1: A vendor who has always paid on time gets a softer, more apologetic-tone reminder. A vendor who has been late on 4 of the last 6 invoices gets a firmer, more direct reminder.
- Collections Stage 3: The final notice references the full contact history — *"We have sent 3 reminders across 28 days with no response."*

**Why `sentence-transformers` over OpenAI embeddings:**
- OpenAI embeddings cost money. `sentence-transformers` runs locally on the Render server for free.
- The `all-MiniLM-L6-v2` model is small (22MB), fast, and accurate enough for this use case.
- No extra API key or service — just a Python library.

**Why Supabase `pgvector` over Pinecone / ChromaDB:**
- `pgvector` is a PostgreSQL extension that Supabase supports for free — no new infrastructure.
- All data (invoices, POs, embeddings) lives in the same Supabase project, simplifying queries.
- Vector similarity search runs as a standard SQL query alongside regular DB queries.

---

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vercel)                  │
│   Dashboard, Upload, PO Manager, Collections, Audit Logs     │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼────────────────────────────────────┐
│                  FastAPI Backend (Render)                     │
│                                                              │
│  ┌─────────────────┐   ┌──────────────────────────────────┐ │
│  │ Reconciliation  │   │       Collections Agent           │ │
│  │     Agent       │   │  Stage 1 → Stage 2 → Stage 3     │ │
│  └────────┬────────┘   └───────────┬──────────────────────┘ │
│           │                        │                         │
│  ┌────────▼────────────────────────▼──────────────────────┐ │
│  │                   RAG Pipeline                          │ │
│  │  1. Embed query  →  2. Vector search  →  3. Inject ctx  │ │
│  │     (sentence-transformers, local)                      │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │    APScheduler (primary) + cron-job.org (fallback)      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────┬─────────────┬──────────────┬───────────┬────────────┘
       │             │              │           │
┌──────▼──────┐ ┌────▼──────┐ ┌────▼─────┐ ┌──▼───────────┐
│  Supabase   │ │ Supabase  │ │ Groq API │ │  Gmail SMTP  │
│ (PostgreSQL │ │ (Storage) │ │(Llama 3) │ │  (smtplib)   │
│ + pgvector) │ │           │ │          │ │              │
└─────────────┘ └───────────┘ └──────────┘ └──────────────┘
```

### 3.2 Data Flow — Reconciliation Pipeline

1. User fills in vendor name, vendor email (optional), and uploads a PDF invoice via the dashboard. The upload form checks if this invoice number already exists in the DB — if so, shows a warning: *"This invoice was already processed on [date]. View existing report?"* preventing duplicate records.
2. React sends the form data to `POST /api/reconcile` as multipart form data.
3. FastAPI uploads the PDF to Supabase Storage and gets back a persistent URL.
4. The Reconciliation Agent attempts PDF parsing in order: `extract_table()` first, then `extract_text()` fallback, then returns `PARSE_FAILED` with a clear user message if both fail.
5. For each extracted line item, `thefuzz` performs fuzzy name matching against the stored PO database.
6. If confidence >= threshold, the agent compares quantity and price against the matched PO row.
7. If confidence < threshold, the item is flagged `UNKNOWN`.
8. The agent produces a structured report: `MATCH` / `DISCREPANCY` / `UNKNOWN` per item.
9. For every `DISCREPANCY`, the **RAG pipeline** runs before calling Groq:
   - A query string is constructed from the discrepancy details (vendor name + item name + issue type).
   - `sentence-transformers` embeds this query into a vector locally.
   - Supabase `pgvector` performs a similarity search on the `vendor_history_embeddings` table, retrieving the top 3–5 most relevant historical records for this vendor (past disputes, agreed prices, previous overcharges).
   - The retrieved context chunks are formatted into a readable summary and injected into the Groq prompt.
   - Groq generates a historically-aware dispute email that references past patterns if any exist.
10. The full report, email drafts, and audit log are saved to Supabase.
11. New vendor history record is embedded and stored in `vendor_history_embeddings` for future RAG retrieval.
12. FastAPI returns the report JSON to the React dashboard for display, including the agent's reasoning text per item.

### 3.3 Data Flow — Collections Pipeline (Escalating Stages)

The collections agent runs on a daily schedule AND can be triggered manually. It **only targets invoices with status `PENDING` or `OVERDUE`** — invoices in `DISCREPANCY` status are explicitly excluded because they represent billing disputes, not outstanding payments.

#### Stage 1 — Reminder Email (1–7 days overdue)
1. Agent queries Supabase for invoices: `status IN ('PENDING','OVERDUE')` AND `due_date` 1–7 days past AND `collections_stage = 0`.
2. Groq generates a polite, personalised payment reminder email.
3. Gmail SMTP attempts to send. If it fails, the failure is logged to `email_logs` with `status = FAILED` and a dashboard alert is shown.
4. Invoice updated: `collections_stage = 1`, `reminder_count += 1`, `last_reminder_sent = today`.
5. Action logged to audit log.

#### Stage 2 — Payment Plan Proposal (after 2 ignored Stage 1 reminders)
1. Agent checks: `collections_stage = 1` AND `reminder_count >= 2` AND `flagged_as_responded = false` AND `status != 'PAID'`.
2. Groq generates a payment plan proposal email with 2–3 concrete options, calculated from the invoice total. Rules passed to Groq: minimum 25% upfront, maximum 3 equal instalments. Groq output is validated before sending — if the plan doesn't match the rules, a fallback template is used.
3. Gmail SMTP sends with failure logging.
4. Invoice updated: `collections_stage = 2`, `stage2_sent_at = today`.
5. Action logged to audit log.

#### Stage 3 — Final Notice + Human Escalation Flag (payment plan ignored)
1. Agent checks: `collections_stage = 2` AND `days_since_stage2 >= 14` AND `flagged_as_responded = false` AND `status != 'PAID'`.
2. Groq generates a firm final notice email stating the account will be reviewed by a human team member.
3. Gmail SMTP sends with failure logging.
4. Invoice updated: `collections_stage = 3`, `flagged_for_human = true`.
5. Dashboard shows a red alert badge on the invoice card.
6. Action logged to audit log.

### 3.4 Database Schema

#### Table: `purchase_orders`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| po_number | TEXT | Unique PO reference e.g. PO-MULTI-999 |
| item_id | TEXT | Item code e.g. LIT-01 |
| item_name | TEXT | Full item name e.g. MacBook Pro |
| quantity | INT | Expected quantity per PO |
| unit_price | FLOAT | Agreed unit price per PO |
| created_at | TIMESTAMP | When this PO was entered |

#### Table: `invoices`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| invoice_number | TEXT | **Unique** invoice reference — duplicate check runs on upload |
| vendor_name | TEXT | Name of the vendor who sent the invoice |
| vendor_email | TEXT | Email address for sending reminders (optional at upload, required before sending) |
| po_reference | TEXT | PO number this invoice claims to be against |
| total_amount | FLOAT | Total billed amount |
| due_date | DATE | Payment due date |
| status | TEXT | PENDING / MATCHED / DISCREPANCY / OVERDUE / PAID |
| collections_stage | INT | 0 = not started, 1 = reminder sent, 2 = plan proposed, 3 = final notice |
| reminder_count | INT | How many Stage 1 reminders have been sent |
| last_reminder_sent | DATE | Date the last reminder email was sent |
| stage2_sent_at | DATE | Date Stage 2 payment plan email was sent |
| flagged_as_responded | BOOLEAN | Set to true manually via "Mark as Responded" button — prevents Stage 2/3 escalation |
| flagged_for_human | BOOLEAN | True when Stage 3 is reached |
| pdf_path | TEXT | Supabase Storage URL of the uploaded PDF |
| created_at | TIMESTAMP | When invoice was uploaded |

#### Table: `purchase_orders`
*(See above — managed via the PO Manager page, not per-reconciliation CSV upload)*

#### Table: `reconciliation_reports`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| invoice_id | UUID | Foreign key → invoices |
| item_name | TEXT | Item name as it appeared on the invoice |
| matched_to | TEXT | PO item name it was fuzzy-matched to |
| confidence_score | INT | Fuzzy match confidence 0–100 |
| billed_qty | INT | Quantity on the invoice |
| expected_qty | INT | Quantity on the PO |
| billed_price | FLOAT | Price on the invoice |
| expected_price | FLOAT | Price on the PO |
| status | TEXT | MATCH / DISCREPANCY / UNKNOWN / PARSE_FAILED |
| reasoning | TEXT | Agent's human-readable reasoning e.g. "Matched 'Apple Mackbook' to 'MacBook Pro' at 87% confidence. Price differs by $10." |
| email_draft | TEXT | AI-generated vendor email if discrepancy found |
| created_at | TIMESTAMP | When reconciliation was run |

#### Table: `audit_logs`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| invoice_id | UUID | Foreign key → invoices |
| agent | TEXT | RECONCILIATION or COLLECTIONS |
| action_taken | TEXT | APPROVED / ESCALATED / EMAIL_SENT / EMAIL_FAILED / FLAGGED_FOR_HUMAN / PAYMENT_PLAN_PROPOSED / FINAL_NOTICE_SENT / PARSE_FAILED |
| reasoning | TEXT | Human-readable reasoning for the action |
| timestamp | TIMESTAMP | When the action occurred |

#### Table: `email_logs`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| invoice_id | UUID | Foreign key → invoices |
| recipient_email | TEXT | Who the email was sent to |
| subject | TEXT | Email subject line |
| body | TEXT | Full email body text (after any user edits) |
| stage | INT | Collections stage (1, 2, or 3) or 0 for reconciliation dispute emails |
| status | TEXT | SENT or FAILED |
| failure_reason | TEXT | Error message if status = FAILED |
| sent_at | TIMESTAMP | When the send was attempted |
| trigger | TEXT | AUTO (scheduler) or MANUAL (dashboard button) |

---

## 4. Backend — FastAPI Endpoints

All endpoints are prefixed with `/api`. The backend is organised into routers by feature.

### 4.1 Reconciliation Endpoints

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/api/reconcile` | PDF invoice + vendor name + vendor email (optional) + confidence threshold override (optional) as multipart form | Full reconciliation report JSON with per-item status, confidence scores, reasoning text, and AI email drafts. Returns `409 Conflict` if invoice number already exists. |
| GET | `/api/reconcile/{invoice_id}` | Invoice UUID | Previously saved reconciliation report |
| GET | `/api/reconcile` | Optional query param: status filter | List of all reconciliation reports |

### 4.2 Invoice Management Endpoints

| Method | Endpoint | Input | Output |
|---|---|---|---|
| GET | `/api/invoices` | Optional filters: status, collections_stage, date range | List of all invoices |
| GET | `/api/invoices/{id}` | Invoice UUID | Full invoice detail including reconciliation report, email history, and collections timeline |
| PATCH | `/api/invoices/{id}/status` | `{ "status": "PAID" }` | Updated invoice object |
| PATCH | `/api/invoices/{id}/responded` | None | Sets `flagged_as_responded = true` — stops further escalation |
| PATCH | `/api/invoices/{id}/vendor-email` | `{ "vendor_email": "..." }` | Updates vendor email if not provided at upload |
| DELETE | `/api/invoices/{id}` | Invoice UUID | Confirmation of deletion |

### 4.3 PO Management Endpoints

| Method | Endpoint | Input | Output |
|---|---|---|---|
| GET | `/api/pos` | None | List of all stored POs |
| POST | `/api/pos/upload` | CSV file (multipart form) | Bulk upsert all PO rows — existing PO numbers are updated, new ones inserted |
| POST | `/api/pos` | JSON body: single PO row | Create one PO record |
| PATCH | `/api/pos/{id}` | JSON body: fields to update | Update one PO record |
| DELETE | `/api/pos/{id}` | PO UUID | Confirmation of deletion |

### 4.4 Collections Endpoints

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/api/collections/send/{invoice_id}` | Invoice UUID + optional edited email body | Sends appropriate stage email using edited body if provided, returns email log entry |
| POST | `/api/collections/run-all` | None | Runs full escalation check on all eligible invoices, returns count per stage |
| GET | `/api/collections/overdue` | None | List of all overdue invoices with current stage |
| GET | `/api/collections/flagged` | None | List of Stage 3 invoices flagged for human review |
| GET | `/api/collections/preview/{invoice_id}` | Invoice UUID | Returns AI-generated email draft for the next stage — does NOT send |

### 4.5 Audit & Stats Endpoints

| Method | Endpoint | Output |
|---|---|---|
| GET | `/api/audit-logs` | Paginated audit log, filterable by agent and date range |
| GET | `/api/audit-logs/{invoice_id}` | All audit entries for a specific invoice |
| GET | `/api/audit-logs/export` | Downloadable CSV or PDF |
| GET | `/api/stats` | Total invoices, matched, discrepancies, overdue, stage breakdown, flagged, emails sent today, failed emails |

### 4.6 Demo & Utility Endpoints

| Method | Endpoint | Output |
|---|---|---|
| POST | `/api/demo/load` | Seeds the DB with the Colab sample data (MacBook Pro, Magic Mouse, USB-C Hub invoice with mismatches) — clears existing demo data first |
| DELETE | `/api/demo/clear` | Removes all demo-seeded records |

---

## 5. Frontend — React Dashboard

Single-page application with sidebar navigation. All pages are responsive. Tailwind CSS for all styling. Product name: **RevFlow-Ai**.

### Page 1: Dashboard Home — `/`

- Stat cards: Total Invoices, Matched, Discrepancies, Overdue, Emails Sent Today, Flagged for Human
- **Every stat card is a clickable link** that navigates to the relevant filtered view (e.g. clicking "5 Discrepancies" opens Invoice List filtered to DISCREPANCY status)
- Collections Stage breakdown bar showing how many invoices are at Stage 1 / 2 / 3
- Failed Emails alert banner if any emails have `status = FAILED` — links to the email_logs for those invoices
- Recent Activity feed — last 10 agent actions from audit logs
- Quick Actions: Upload Invoice button, Run Collections Now button, **Load Demo Data button**

### Page 2: Upload & Reconcile — `/reconcile`

- Form fields: Vendor Name (required), Vendor Email (optional), Confidence Threshold slider (default 80, range 60–95 — visible and adjustable by user)
- Drag-and-drop file upload zone — accepts PDF for invoice. PO data comes from the stored PO database (no CSV upload needed per-reconciliation). Option to override with a fresh CSV upload if needed.
- Duplicate invoice check — if invoice number already exists, shows warning before proceeding
- Upload button triggers `POST /api/reconcile`
- Loading state with spinner while agent runs
- Results table after processing:
  - Columns: Item Name | Matched To | Confidence | Billed Qty | Expected Qty | Billed Price | Expected Price | Status
  - Status shown as colour-coded badge: green for MATCH, amber for DISCREPANCY, red for UNKNOWN, grey for PARSE_FAILED
  - **Reasoning text shown per row** — e.g. *"Matched 'Apple Mackbook' to 'MacBook Pro' at 87% confidence. Quantity matches. Price differs by $10."*
- Expandable row for DISCREPANCY items — shows the editable AI-generated vendor email draft
- **Edit + Send modal** on each email draft: user can edit the text, then click Send to deliver via Gmail SMTP or Copy to Clipboard for manual use

### Page 3: PO Manager — `/pos`

- Table of all stored Purchase Orders with columns: PO Number, Item ID, Item Name, Quantity, Unit Price, Actions
- **Upload Master CSV button** — bulk upsert POs from a CSV file
- Add Single PO button — inline form to add one PO manually
- Edit and Delete per row
- This page replaces the need to re-upload a PO CSV on every reconciliation

### Page 4: Invoice List — `/invoices`

- Searchable, filterable table of all invoices
- Filter by status: All / Pending / Matched / Discrepancy / Overdue / Paid
- Filter by collections stage: All / Stage 1 / Stage 2 / Stage 3 / Flagged
- Each row: Invoice Number, Vendor, Amount, Due Date, Status badge, Collections Stage badge, Actions
- Actions per row: View Details, Mark as Paid, Mark as Responded, Send Next Stage Email, Delete
- Flagged for Human invoices shown with red alert indicator
- DISCREPANCY invoices show a "Dispute — not in collections" label instead of a collections stage

### Page 5: Invoice Detail — `/invoices/:id`

- Full invoice information at the top — vendor name, email (editable inline if missing), amount, due date, status
- Reconciliation report table for that invoice with reasoning text per row
- Collections timeline — all escalation emails sent, with timestamps, stage labels, and SENT/FAILED status badges
- **Email Preview + Edit Modal** for the next collections stage — user clicks "Preview Next Email", edits the AI draft if needed, then clicks Send
- "Mark as Responded" button — sets `flagged_as_responded = true`, stops further escalation, updates the collections stage indicator
- "Mark as Paid" button
- Human escalation alert banner if `flagged_for_human = true`

### Page 6: Collections — `/collections`

- Three tabs: Stage 1 | Stage 2 | Stage 3 / Flagged
- Each tab lists invoices at that stage with: days overdue, vendor, amount, last email sent date
- DISCREPANCY invoices are not shown on this page at all
- Run All Escalations button at the top — triggers `POST /api/collections/run-all`
- Individual Preview + Send button per invoice — opens the Email Preview + Edit Modal
- Scheduler status indicator showing next scheduled run time and last run time
- Failed Emails section at the bottom — invoices where the last email attempt failed, with retry button

### Page 7: Audit Logs — `/audit-logs`

- Full paginated table of all agent actions
- Filter by: Agent (Reconciliation / Collections), Action Type, Date Range
- Each row: Timestamp, Agent, Invoice Reference, Action Taken, Reasoning
- Export button — downloads audit log as CSV or PDF

---

## 6. Agent Logic — Detailed Specifications

### 6.1 Reconciliation Agent

#### Step 1: PDF Parsing (with graceful failure)
Tool: `pdfplumber`. Three-stage parsing strategy:

1. **Attempt `extract_table()`** — works on PDFs with structured tables. Returns structured rows if successful.
2. **Fallback to `extract_text()` + line parsing** — searches for keyword patterns and structured rows. Used when extract_table returns nothing.
3. **PARSE_FAILED** — if both methods return no usable data, the agent returns a `PARSE_FAILED` result with the message: *"Could not extract line items from this PDF. Please ensure it is a text-based PDF, not a scanned image. Scanned PDFs are not currently supported."* This is saved to the reconciliation report and shown clearly on the dashboard — no silent failures.

#### Step 2: Duplicate Check
Before running the full reconciliation, the agent checks if `invoice_number` already exists in the `invoices` table. If it does, the endpoint returns `409 Conflict` with the date of the existing report. The frontend shows a warning to the user.

#### Step 3: Fuzzy Matching
Tool: `thefuzz` `process.extractOne()`. For each invoice line item name, the agent finds the single best match from the stored PO item names. Confidence threshold is configurable per-reconciliation via the Upload form (default: 80, range 60–95). Items scoring below threshold are flagged `UNKNOWN`.

#### Step 4: Discrepancy Detection
For each matched item the agent checks two conditions independently: quantity match and price match. An item is `DISCREPANCY` if either fails. An item is `MATCH` only if both are exactly equal. The agent records a reasoning string per item explaining what matched and what differed.

#### Step 5: Groq Email Generation
For each `DISCREPANCY` item, the agent calls Groq. The prompt passes: vendor name, item name, billed values, expected values, and the calculated difference. Groq returns a professional 3–4 sentence email draft. The draft is stored in `reconciliation_reports` and shown as an editable field in the dashboard.

**Groq prompt strategy:**
- System prompt: sets the agent as a professional finance assistant for the company (signed off as "RevFlow-Ai — Automated Finance Agent")
- User prompt: passes structured discrepancy details
- Instructions: firm but polite tone, under 4 sentences, specific numbers included
- Model: `llama-3.1-8b-instant` (free, fast, high quality for this task)

---

### 6.2 Collections Agent — Escalating Stages

#### Stage Detection Logic

```
Is invoice status PENDING or OVERDUE? (DISCREPANCY excluded)
  └── NO  → Skip entirely
  └── YES →
        Is flagged_as_responded = true OR status = PAID?
          └── YES → Skip (client responded or paid)
        Is collections_stage = 0 AND days_overdue between 1–7?
          └── YES → Run Stage 1 (send reminder email)
        Is collections_stage = 1 AND reminder_count >= 2
             AND flagged_as_responded = false?
          └── YES → Run Stage 2 (send payment plan proposal)
        Is collections_stage = 2
             AND days_since_stage2 >= 14
             AND flagged_as_responded = false?
          └── YES → Run Stage 3 (send final notice, flag for human)
        Is collections_stage = 3?
          └── Skip (already at final stage, human must act)
```

#### Stage 1 — Reminder Email
- **Trigger:** 1–7 days overdue, `collections_stage = 0`, status is PENDING or OVERDUE
- **Groq prompt inputs:** vendor name, invoice number, original due date, days overdue, amount owed
- **Tone:** Polite, friendly, assumes it may be an oversight
- **DB update:** `collections_stage = 1`, `reminder_count += 1`, `last_reminder_sent = today`

#### Stage 2 — Payment Plan Proposal
- **Trigger:** `collections_stage = 1`, `reminder_count >= 2`, `flagged_as_responded = false`, `status != PAID`
- **Groq prompt inputs:** all Stage 1 data + total amount + explicit plan constraints
- **Plan constraints passed to Groq:** minimum 25% upfront, maximum 3 equal instalments, no deferral beyond 90 days
- **Validation:** After Groq returns the plan, backend validates that the numbers in the email add up to the total invoice amount ± 1%. If validation fails, a safe fallback template is used instead.
- **Tone:** Understanding but firm
- **DB update:** `collections_stage = 2`, `stage2_sent_at = today`

#### Stage 3 — Final Notice + Human Flag
- **Trigger:** `collections_stage = 2`, `days_since_stage2 >= 14`, `flagged_as_responded = false`, `status != PAID`
- **Groq prompt inputs:** full invoice history, number of previous contacts, total days overdue
- **Tone:** Formal and firm, states account will be escalated to human review
- **DB update:** `collections_stage = 3`, `flagged_for_human = true`
- **Dashboard:** Red alert badge on the invoice card

#### Gmail SMTP — With Failure Handling
```python
# utils/email_sender.py
import smtplib
from email.mime.text import MIMEText

def send_email(to_address, subject, body, invoice_id, stage, trigger):
    status = "SENT"
    failure_reason = None
    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = GMAIL_ADDRESS
        msg['To'] = to_address
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, to_address, msg.as_string())
    except Exception as e:
        status = "FAILED"
        failure_reason = str(e)
    finally:
        # Always log the attempt regardless of outcome
        log_email(invoice_id, to_address, subject, body,
                  stage, status, failure_reason, trigger)
    return status
```

#### APScheduler + cron-job.org Dual Trigger
```python
# scheduler/jobs.py — APScheduler runs inside FastAPI (primary)
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(run_collections_escalation, 'cron',
                  hour=int(RUN_TIME.split(':')[0]),
                  minute=int(RUN_TIME.split(':')[1]))
scheduler.start()
```

Additionally: configure [cron-job.org](https://cron-job.org) (free) to send a POST request to `https://your-app.onrender.com/api/collections/run-all` once daily at the same time. This acts as a reliable external fallback in case the Render server was asleep when APScheduler's trigger fired.

---

## 7. Development Phases & Task Breakdown

### Phase 1 — Fix & Complete the Core Agent
> Goal: Get existing Colab logic running as clean, tested Python modules.

- [ ] Create project folder structure (see Section 8)
- [ ] Migrate PDF parsing logic into `agents/reconciliation.py`
- [ ] Add `extract_table()` → `extract_text()` → `PARSE_FAILED` three-stage parsing
- [ ] Add file validation (PDF only, max 10MB) before parsing
- [ ] Migrate fuzzy matching logic — make threshold a parameter, not a hardcoded value
- [ ] **Replace LangChain prompt template with direct Groq API call** ← most critical fix
- [ ] Add reasoning string generation per reconciliation item
- [ ] Build `utils/groq_client.py` — reusable Groq wrapper with try/except
- [ ] Build `utils/email_sender.py` — Gmail SMTP with failure logging
- [ ] Build `agents/collections.py` — full stage detection logic with all guard conditions
- [ ] Add payment plan validation logic in Stage 2
- [ ] Write unit tests for reconciliation and collections logic using pytest
- [ ] Test with existing sample PDFs and CSVs from Colab

### Phase 2 — FastAPI Backend
> Goal: Wrap all agent logic in a REST API with database persistence.

- [ ] Set up FastAPI project with routers: reconcile, invoices, pos, collections, audit, demo
- [ ] Integrate Supabase Python client for DB and Storage
- [ ] Create all 5 tables in Supabase — add `UNIQUE` constraint on `invoices.invoice_number`
- [ ] Set up Supabase Storage bucket for PDF uploads
- [ ] Implement `POST /api/reconcile` — duplicate check, file upload to Storage, agent run, save to DB
- [ ] Implement all invoice management endpoints including `/responded` and `/vendor-email`
- [ ] Implement all PO management endpoints (GET, POST, PATCH, DELETE, bulk upload)
- [ ] Implement `GET /api/collections/preview/:id` — returns AI draft without sending
- [ ] Implement `POST /api/collections/send/:id` — accepts optional edited body
- [ ] Implement `POST /api/collections/run-all` — with all stage guard conditions
- [ ] Implement APScheduler job + configure cron-job.org to hit run-all endpoint
- [ ] Implement audit log endpoints with CSV export
- [ ] Implement `GET /api/stats` including failed email count
- [ ] Implement demo seed and clear endpoints
- [ ] Add CORS middleware for React frontend
- [ ] Test all endpoints using FastAPI's `/docs` Swagger UI

### Phase 3 — React Frontend
> Goal: Clean, functional dashboard connecting to the FastAPI backend.

- [ ] Scaffold React app with Vite + Tailwind CSS, set product name to RevFlow-Ai
- [ ] Build sidebar layout with navigation to all 7 pages
- [ ] Dashboard Home — clickable stat cards, stage breakdown bar, failed emails alert, demo data button
- [ ] Upload page — vendor form fields, confidence threshold slider, drag-and-drop, reasoning display, edit+send modal for discrepancy emails
- [ ] PO Manager page — PO table, bulk CSV upload, add/edit/delete single PO
- [ ] Invoice list page — searchable/filterable, DISCREPANCY shows "Dispute" label not collections stage
- [ ] Invoice detail page — editable vendor email, email preview+edit modal, mark as responded, collections timeline
- [ ] Collections page — three tabs, no DISCREPANCY invoices, failed emails section with retry
- [ ] Audit log page — full log table, export button
- [ ] Connect all pages to FastAPI via Axios
- [ ] Add loading states, error handling, and success/failure toasts throughout

### Phase 4 — Deployment
> Goal: Live, publicly accessible URLs for both frontend and backend.

- [ ] Push code to GitHub (monorepo with `/frontend` and `/backend` folders)
- [ ] Add `.gitignore` entries for both `.env` files immediately
- [ ] Deploy FastAPI to Render — connect GitHub, set all environment variables, deploy
- [ ] Deploy React to Vercel — connect GitHub, set `VITE_API_URL`, deploy
- [ ] Configure Supabase Storage bucket permissions (public read for PDFs)
- [ ] Configure cron-job.org to POST to `/api/collections/run-all` daily
- [ ] Set up UptimeRobot to ping backend every 10 minutes to minimise cold starts
- [ ] Verify APScheduler is running on Render (check Render logs tab)
- [ ] Load demo data and test full reconciliation flow on live URLs
- [ ] Test escalation: advance invoice through Stage 1 → 2 → 3 and verify emails
- [ ] Test failure handling: temporarily use wrong Gmail credentials, verify failure is logged and shown on dashboard

---

## 8. Project Folder Structure

```
project-root/
├── backend/
│   ├── main.py                     # FastAPI entry point, CORS, scheduler start
│   ├── routers/
│   │   ├── reconcile.py            # Reconciliation endpoints
│   │   ├── invoices.py             # Invoice CRUD + responded + vendor-email
│   │   ├── pos.py                  # PO management endpoints
│   │   ├── collections.py          # Preview, send, run-all, overdue, flagged
│   │   ├── audit.py                # Audit log endpoints + export
│   │   └── demo.py                 # Demo seed and clear endpoints
│   ├── agents/
│   │   ├── reconciliation.py       # 3-stage parsing, fuzzy match, discrepancy, Groq
│   │   └── collections.py          # Stage detection with all guards, Groq per stage
│   ├── db/
│   │   └── supabase_client.py      # Supabase DB + Storage client initialisation
│   ├── scheduler/
│   │   └── jobs.py                 # APScheduler daily job
│   ├── utils/
│   │   ├── groq_client.py          # Groq API wrapper with try/except
│   │   └── email_sender.py         # Gmail SMTP with failure logging
│   ├── .env                        # API keys — never committed to git
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── Reconcile.jsx
    │   │   ├── POManager.jsx
    │   │   ├── Invoices.jsx
    │   │   ├── InvoiceDetail.jsx
    │   │   ├── Collections.jsx
    │   │   └── AuditLogs.jsx
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── StatCard.jsx           # Clickable — navigates to filtered view
    │   │   ├── StatusBadge.jsx
    │   │   ├── StageBadge.jsx
    │   │   ├── FileUploadZone.jsx
    │   │   ├── EmailPreviewModal.jsx  # Editable draft + Send / Copy buttons
    │   │   └── FailedEmailAlert.jsx
    │   ├── api/
    │   │   └── client.js             # Axios instance with base URL from .env
    │   └── App.jsx
    ├── .env                          # VITE_API_URL=https://your-render-url.com
    └── package.json
```

---

## 9. Environment Variables

All secrets are stored as environment variables — never hardcoded. Both `.env` files are added to `.gitignore` before the first commit.

### 9.1 Backend `.env`

| Variable | What It Stores |
|---|---|
| `GROQ_API_KEY` | Your Groq API key from console.groq.com |
| `SUPABASE_URL` | Your Supabase project URL from the Supabase dashboard |
| `SUPABASE_KEY` | Supabase service role key (not anon — needs write access to Storage) |
| `GMAIL_ADDRESS` | The Gmail address used to send all emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password — Google Account > Security > 2FA > App Passwords |
| `COLLECTIONS_RUN_TIME` | Time to run daily escalation job, format `HH:MM`, default `09:00` |
| `FUZZY_THRESHOLD` | Default minimum confidence score for fuzzy matching, default `80` |
| `PAYMENT_PLAN_MIN_UPFRONT_PCT` | Minimum upfront percentage for payment plans, default `25` |
| `PAYMENT_PLAN_MAX_MONTHS` | Maximum instalments for a payment plan, default `3` |
| `STAGE2_WAIT_DAYS` | Days after Stage 2 before Stage 3 triggers, default `14` |

### 9.2 Frontend `.env`

| Variable | What It Stores |
|---|---|
| `VITE_API_URL` | Full URL of deployed FastAPI backend e.g. `https://your-app.onrender.com` |

---

## 10. Deployment Guide

### 10.1 Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project — choose the free tier, pick a region close to your users
3. Go to the SQL Editor and create all 5 tables using the schema from Section 3.4
4. Add a `UNIQUE` constraint to `invoices.invoice_number`:
   ```sql
   ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
   ```
5. Go to **Storage** → create a bucket named `invoice-pdfs` → set to Public
6. Copy the Project URL and **service role key** (not anon key) from **Settings > API** into your backend `.env`

### 10.2 Groq API Setup

1. Create a free account at [console.groq.com](https://console.groq.com)
2. Generate an API key from the Keys section
3. Add it to backend `.env` as `GROQ_API_KEY`
4. Default model: `llama3-8b-8192` — fast, free, high quality for email generation

### 10.3 Gmail App Password Setup

1. Log into the Gmail account that will send reminder emails
2. Go to **Google Account > Security > 2-Step Verification** (must be enabled first)
3. Scroll to **App Passwords**, create a new one named `RevFlow-Ai`
4. Copy the 16-character password into backend `.env` as `GMAIL_APP_PASSWORD`

### 10.4 Render — Backend Deployment

1. Push backend folder to a GitHub repository
2. Create a free account at [render.com](https://render.com)
3. New > Web Service > Connect your GitHub repo
4. Set **Build Command:** `pip install -r requirements.txt`
5. Set **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add all backend environment variables in the **Environment** section
7. Deploy — Render gives you a public URL like `https://your-app.onrender.com`

### 10.5 Vercel — Frontend Deployment

1. Push frontend folder to a GitHub repository
2. Create a free account at [vercel.com](https://vercel.com)
3. New Project > Import GitHub repo
4. Add environment variable: `VITE_API_URL` = your Render backend URL
5. Deploy — Vercel gives you a URL like `https://your-app.vercel.app`

### 10.6 cron-job.org — Scheduler Redundancy

1. Create a free account at [cron-job.org](https://cron-job.org)
2. Create a new cron job: `POST https://your-app.onrender.com/api/collections/run-all`
3. Set schedule to match `COLLECTIONS_RUN_TIME` (e.g. daily at 09:00)
4. This acts as a reliable external trigger even if the Render server was asleep

### 10.7 UptimeRobot — Cold Start Prevention

1. Create a free account at [uptimerobot.com](https://uptimerobot.com)
2. Add a new HTTP monitor pointing to `https://your-app.onrender.com/api/stats`
3. Set check interval to every 5 minutes
4. This keeps the Render server warm and prevents cold starts during demo

---

## 11. What Needs to Be Built vs What Exists

| Feature | Status | Source | Action Required |
|---|---|---|---|
| PDF invoice parsing | ✅ EXISTS | Colab | Migrate to `agents/reconciliation.py`, add 3-stage strategy |
| PO CSV loading | ✅ EXISTS | Colab | Replace per-reconciliation CSV with stored PO database |
| Single-item exact match | ✅ EXISTS | Colab | Migrate as-is |
| Multi-item fuzzy match | ✅ EXISTS | Colab | Migrate, make threshold a parameter not env var |
| Discrepancy detection | ✅ EXISTS | Colab | Migrate as-is |
| Reasoning text per item | ❌ MISSING | Not in Colab | Build into reconciliation agent |
| Email draft generation | ⚠️ PARTIAL | Colab | Remove LangChain, replace with direct Groq call |
| Audit log generation | ✅ EXISTS | Colab | Migrate, save to Supabase instead of printing |
| PARSE_FAILED handling | ❌ MISSING | Not in Colab | Build graceful failure with clear user message |
| Duplicate invoice detection | ❌ MISSING | Not in Colab | DB unique constraint + 409 response + frontend warning |
| PDF file storage | ❌ MISSING | Not in Colab | Build Supabase Storage upload on ingest |
| Actual email sending | ❌ MISSING | Not in Colab | Build `utils/email_sender.py` with failure logging |
| Email failure handling | ❌ MISSING | Not in Colab | Log failures, show dashboard alerts, retry button |
| "Mark as Responded" flow | ❌ MISSING | Not in Colab | DB field + PATCH endpoint + UI button |
| DISCREPANCY exclusion from collections | ❌ MISSING | Not in Colab | Add status guard in collections stage detection |
| Payment plan validation | ❌ MISSING | Not in Colab | Backend validation of Groq output before sending |
| PO Manager page | ❌ MISSING | Not in Colab | Build full CRUD + bulk CSV upload |
| Collections Stage 1 | ❌ MISSING | Not in Colab | Build in `agents/collections.py` |
| Collections Stage 2 | ❌ MISSING | Not in Colab | Build in `agents/collections.py` |
| Collections Stage 3 | ❌ MISSING | Not in Colab | Build in `agents/collections.py` |
| FastAPI backend | ❌ MISSING | Not in Colab | Build all 6 routers |
| Supabase database + storage | ❌ MISSING | Not in Colab | Set up tables with constraints, Storage bucket |
| APScheduler + cron-job.org | ❌ MISSING | Not in Colab | Build scheduler with external fallback |
| React dashboard (7 pages) | ❌ MISSING | Not in Colab | Build all pages |
| Clickable stat cards | ❌ MISSING | Not in Colab | StatCard component navigates to filtered view |
| Editable email preview modal | ❌ MISSING | Not in Colab | EmailPreviewModal with edit + send + copy |
| Demo data loader | ❌ MISSING | Not in Colab | Seed endpoint + Load Demo Data button on dashboard |
| Deployment | ❌ MISSING | Not in Colab | Render + Vercel + cron-job.org + UptimeRobot |

---

## 12. Known Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Render server asleep when scheduler fires | High (free tier) | Collections job never runs | cron-job.org external HTTP trigger as redundant fallback |
| Gmail SMTP blocked or failing silently | Medium | No emails sent, no visibility | try/except on every send, failure logged to DB, dashboard alert |
| Real invoice PDFs don't match expected format | High | Parser returns nothing | 3-stage parse strategy + PARSE_FAILED state with clear user message |
| Duplicate invoice uploaded accidentally | Medium | Double reports and double emails | Unique constraint on invoice_number, 409 response, frontend warning |
| Ephemeral Render filesystem loses PDFs | High (free tier) | PDF links broken after redeploy | All PDFs stored in Supabase Storage, never on local disk |
| Groq generates invalid payment plan numbers | Low | Sends financially incorrect email | Backend validates plan totals before sending; fallback template used if invalid |
| Collections runs on disputed invoices | Certain without fix | Sends payment demands on overbilling disputes | DISCREPANCY status explicitly excluded from all collections queries |

---

*RevFlow-Ai — Agentic AI Finance Agent | Invoice & Collection Autonomy Project*