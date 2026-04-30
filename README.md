# 🚀 RevFlow-Ai

### **Agentic AI Finance Agent — Automated Invoice Reconciliation & Collections**

RevFlow-Ai is a production-ready, full-stack autonomous finance pipeline designed to automate the most tedious parts of Accounts Receivable (AR). Built with **FastAPI**, **React**, and **Groq-powered LLMs**, it intelligently handles invoice matching, discrepancy detection, and multi-stage payment collections using **RAG (Retrieval-Augmented Generation)** for historically-aware communication.

[![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Supabase-blue)](https://revflow-ai.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🌟 Key Features

### 1. 🧠 Intelligent Reconciliation (The "Eyes")
- **3-Stage PDF Extraction**: Uses `pdfplumber` with a fallback hierarchy (Table → Text → Manual) to handle unstructured invoices.
- **Fuzzy Semantic Matching**: Employs `thefuzz` (Levenshtein distance) to match invoice items to Purchase Orders even with typos, abbreviations, or shorthand.
- **Automated Audit**: Instantly flags discrepancies in quantity, price, or item existence with detailed reasoning logs.

### 2. 🤖 RAG-Powered Communication (The "Brain")
- **Vendor History RAG**: Uses a local vector engine (`sentence-transformers`) and Supabase `pgvector` to retrieve past dispute history and vendor behavior.
- **Contextual Groq Drafting**: Generates professional, firm-but-polite emails using **Llama 3**. Every email is historically aware (e.g., *"This is the second time this item has been overbilled..."*).
- **Interactive Previews**: Users can edit, approve, or copy AI-generated drafts before they are sent.

### 3. 📈 Escalating Collections Pipeline (The "Voice")
- **Autonomous Staging**: Automatically moves overdue invoices through three stages:
  - **Stage 1**: Polite automated payment reminders.
  - **Stage 2**: AI-suggested payment plan proposals (validated math).
  - **Stage 3**: Final notice and human escalation flag.
- **Smart Exclusion**: Invoices with active discrepancies are automatically paused from collections to prevent professional friction.

### 4. 📊 Real-Time Dashboard
- **Metric-Driven UI**: Clickable stat cards for Invoices, Overdue amounts, and Flagged items.
- **Audit Logs**: Complete, exportable CSV logs of every action taken by the AI agents.
- **PO Manager**: Centralized database for managing Purchase Orders and bulk CSV imports.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.12+)
- **Frontend**: React + Tailwind CSS + Vite
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI/LLM**: Groq (Llama 3 8B/70B)
- **Embeddings**: Sentence-Transformers (`all-MiniLM-L6-v2`)
- **Parsing**: pdfplumber
- **Scheduler**: APScheduler + Cron-job.org fallback
- **Email**: Gmail SMTP (smtplib)

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your GROQ_API_KEY, SUPABASE_URL, and GMAIL_APP_PASSWORD
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Live Demo
- **Frontend (Vercel)**: [https://revflowai.vercel.app](https://revflowai.vercel.app)
- **Backend API (Render)**: [https://revflow-ai.onrender.com/api/health](https://revflow-ai.onrender.com/api/health)

---

## 📖 Documentation & Guides

- **User Guide (Start Here)**: [appGuide.md](appGuide.md)
- **Technical Documentation**: [doc.md](doc.md)

---

**Built by Aditya Samadhiya** | *Automating Finance, One Invoice at a Time.*
