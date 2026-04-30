# 🚀 RevFlow-Ai

### **Agentic AI Finance Agent — Autonomous Invoice Reconciliation & Collections Pipeline**

RevFlow-Ai is a production-ready, full-stack Accounts Receivable (AR) automation platform. It replaces manual spreadsheet validation and generic email templates with an **Agentic AI** pipeline. Built with **FastAPI**, **React**, and **Groq-powered LLMs**, it intelligently handles invoice parsing, mathematical auditing, discrepancy detection, and multi-stage payment collections.

Most importantly, it utilizes **RAG (Retrieval-Augmented Generation)** to ensure every piece of communication the AI generates is contextually aware of the vendor's history.

[![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Supabase-blue)](https://revflowai.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🌐 Live Demo & Environments

The application is deployed and configured to support seamless cross-origin communication between the live frontend and backend.

- **Frontend Application (Vercel)**: [https://revflowai.vercel.app](https://revflowai.vercel.app)
- **Backend API API (Render)**: [https://revflow-ai.onrender.com/api/health](https://revflow-ai.onrender.com/api/health)

---

## 🌟 Architecture & Core Features

RevFlow-Ai is divided into three distinct intelligent pipelines that work autonomously.

### 1. 🧠 The Reconciliation Agent (The "Eyes")
*   **3-Stage PDF Extraction Resilience**: Unstructured vendor invoices are parsed using `pdfplumber` through a strict hierarchy (Digital Table → Raw Text Regex → Manual Fallback). It does not hallucinate missing data.
*   **Fuzzy Semantic Matching**: Employs `thefuzz` (Levenshtein distance) to match invoice line items to internal Purchase Orders. (e.g., matching "MBP 14-inch" to "MacBook Pro" via an 80% confidence threshold).
*   **Automated Mathematical Audit**: The agent instantly checks `billed_qty == expected_qty` and `billed_price == expected_price`, flagging discrepancies with detailed, human-readable reasoning logs.

### 2. 🤖 RAG-Powered Communication (The "Brain")
*   **Vendor History RAG Store**: Uses a local vector engine (`sentence-transformers` via `all-MiniLM-L6-v2`) and Supabase `pgvector` to store and retrieve past dispute history and vendor behavior.
*   **Contextual Groq Drafting**: Generates professional, firm-but-polite emails using the ultra-fast **Llama-3.1-8b-instant**. Every email is historically aware (e.g., *"This is the second time this item has been overbilled this quarter..."*).
*   **Interactive Previews (Human-in-the-Loop)**: Users can preview, edit, approve, or copy AI-generated drafts before they are dispatched via SMTP.

### 3. 📈 Escalating Collections Pipeline (The "Voice")
*   **Autonomous Staging**: Automatically moves overdue invoices through three stages via an intelligent Cron scheduler:
    *   **Stage 1**: Polite automated payment reminders (assumes oversight).
    *   **Stage 2**: AI-suggested payment plan proposals (validates math constraints: 25% down, max 3 months).
    *   **Stage 3**: Final notice and human escalation flag.
*   **Smart Exclusion Logic**: Invoices with active discrepancies are immediately and automatically paused from the collections pipeline to prevent demanding payment on a disputed bill.

### 4. 📊 Real-Time Metric Dashboard
*   **Metric-Driven React UI**: Clickable stat cards for Total Invoices, Discrepancies, Overdue amounts, and Failed SMTP Email alerts.
*   **Immutable Audit Logs**: Complete, exportable CSV ledgers of every action taken by the AI agents, ensuring the AI is never a "black box".
*   **PO Manager**: Centralized database for managing Purchase Orders, acting as the absolute source of truth.

---

## 🛠️ The Technology Stack

- **Backend / API**: FastAPI (Python 3.12+)
- **Frontend SPA**: React + Tailwind CSS + Vite + Lucide Icons
- **Database & Storage**: Supabase (PostgreSQL + `pgvector`)
- **AI Inference Engine**: Groq API (`llama-3.1-8b-instant`)
- **Embeddings**: Sentence-Transformers (`all-MiniLM-L6-v2`)
- **Document Parsing**: `pdfplumber`
- **Scheduler**: APScheduler (Internal) + Cron-job.org (External Redundancy)
- **SMTP Transport**: Python `smtplib` via Gmail App Passwords

---

## 📖 Comprehensive Documentation

To deeply understand the product, workflows, and code architecture, refer to our extended markdown documentation:

- **[appGuide.md](appGuide.md)**: The definitive user manual. Explains what every button does, how to read the dashboard, and the logic behind the collections pipeline. *(Start Here if you are a user)*
- **[doc.md](doc.md)**: The technical blueprint. Contains database schemas, detailed API endpoints, Mermaid architecture diagrams, and RAG configuration specifics. *(Start Here if you are a developer)*

---

## 🚀 Local Development Quick Start

The project is pre-configured so that local development seamlessly integrates with the production backend if desired.

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your GROQ_API_KEY, SUPABASE_URL, and GMAIL_APP_PASSWORD
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8000
npm run dev
```

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Built by Aditya Samadhiya** | *Automating Finance, One Invoice at a Time.*
