# 📘 RevFlow-Ai: The Complete User Guide

Welcome to the definitive user manual for **RevFlow-Ai**. This guide is designed to take you from a first-time user to a power user of the platform. It explains every button, status badge, workflow, and automated decision made by the Agentic AI.

---

## 🎯 1. Core Concepts: How the AI Works for You

RevFlow-Ai is not just a standard software application; it acts as an autonomous digital employee. It has three core capabilities:

1. **Vision (PDF Parsing)**: It can read and extract tabular and raw text data from PDF invoices, even if they aren't perfectly formatted.
2. **Reasoning (Fuzzy Matching & Auditing)**: It understands that "MBP 14" and "MacBook Pro 14-inch" are the same thing. It does the mathematical heavy lifting to ensure you are never overcharged.
3. **Communication (RAG-Powered LLMs)**: It writes emails. But unlike static templates, the AI uses **Retrieval-Augmented Generation (RAG)** to search through past interactions with a vendor, allowing it to write context-aware emails (e.g., *"As we discussed last month regarding shipping fees..."*).

---

## 🖥️ 2. The Main Dashboard (`/`)

The Dashboard is your command center. It provides a real-time overview of the financial health of your Accounts Receivable.

### 📊 Top Metric Cards
*   **Total Invoices**: A raw count of all invoices currently tracked by the system.
*   **Matched**: The number of invoices that perfectly matched their Purchase Orders and are ready for payment.
*   **Discrepancies**: The number of invoices currently in the 🔴 `DISCREPANCY` state. **Action Required**: You should review these, as the AI has flagged a billing error and halted any automatic collections.
*   **Overdue**: The number of invoices in the 🟡 `OVERDUE` state. The AI is actively managing these through the collections pipeline.
*   **Flagged**: The number of invoices where the AI has reached the final escalation stage (Stage 3) and stopped automation. **Action Required**: A human must review these accounts.
*   **Failed Emails**: If the AI attempts to send an email but the SMTP server rejects it (e.g., due to an invalid email address or temporary Google server outage), it is flagged here.

### 📈 Collections Pipeline Chart
This visual breakdown shows where your overdue invoices are in the escalation process:
*   **Stage 1**: The vendor has received a friendly reminder.
*   **Stage 2**: The vendor has been offered an AI-generated Payment Plan.
*   **Stage 3**: The AI has sent a final notice and stopped automated follow-ups. A human must step in.

### 🛠️ "Load Demo Data" Button
Located in the top right. Clicking this will populate your database with fake Purchase Orders, Invoices at various stages, and historical RAG events. **Use this to safely test the AI's capabilities** without risking real financial data. To remove the data, click it again or manually delete the records.

---

## 📤 3. Reconcile: Processing New Invoices (`/reconcile`)

This is where you upload new vendor invoices to be audited against your internal Purchase Orders (POs).

### Step-by-Step Upload Flow:
1. **Drag and Drop Zone**: Drop your PDF invoice here. The system accepts standard `.pdf` files.
2. **Vendor Name**: Must exactly match the name you use in your communications.
3. **Vendor Email**: The address the AI will use if it needs to send a dispute email.
4. **PO Reference**: The internal Purchase Order number (e.g., `PO-2026-001`). **Crucial Step**: The system will pull expected items, quantities, and prices linked to this PO from the database to compare against the invoice.
5. **Fuzzy Match Threshold (Slider)**: 
    *   *What it is*: Controls how strict the AI is when matching item names.
    *   *Setting it to 100%*: The invoice item must perfectly match the PO item letter-for-letter.
    *   *Setting it to 80% (Recommended)*: Allows for abbreviations, missing words, and minor typos.
6. **Click "Run AI Reconciliation"**: The AI takes over. It parses the PDF, runs the math, and generates a report.

### The Discrepancy Modal
If the AI finds an error (e.g., Billed $50, Expected $40), it will instantly pop up a modal.
*   **The AI Draft**: You will see an email already written by the AI, explaining the exact error to the vendor.
*   **Editable Text**: You can click into the email and edit it manually before sending.
*   **Send to Vendor**: Dispatches the email immediately and saves the log.

---

## 🗂️ 4. Invoices Management (`/invoices`)

A tabular view of every invoice. The most important column is the **Status Badge**:

| Badge | Meaning | AI Behavior |
| :--- | :--- | :--- |
| 🔵 **PENDING** | Uploaded and valid, but not yet due. | The AI ignores this invoice. |
| 🟢 **MATCHED** | The invoice perfectly matched the Purchase Order. | The AI tracks its due date to see if it becomes overdue. |
| 🟢 **PAID** | The invoice has been settled. | The AI ignores this invoice. |
| 🟡 **OVERDUE** | The due date has passed. | The AI actively monitors this and will send escalating collection emails based on the timeline. |
| 🔴 **DISCREPANCY** | A billing error was found during reconciliation. | **The AI halts all collections.** It will never ask for payment on an invoice that has an active dispute. |
| ⚪ **UNKNOWN** | An item on the invoice could not be matched to any Purchase Order. | Same as discrepancy; requires human review to map the item. |

**Manual Override**: Click the `✓` icon next to any invoice to instantly mark it as **PAID**.

---

## 🔔 5. Collections: The Autonomous Pipeline (`/collections`)

This page manages invoices that are in the `OVERDUE` state.

### The "Run Daily Collections" Button
In production, the system runs this automatically every morning at 9:00 AM. However, you can click this button to force the AI to do a manual sweep. 
When clicked, the AI checks every overdue invoice. If enough days have passed since the last communication, it will autonomously draft and send the next stage's email.

### The Escalation Stages Explained
*   **Stage 1 (Polite Reminder)**: Triggered 1-7 days after the due date. The AI assumes the vendor just forgot.
*   **Stage 2 (Payment Plan)**: Triggered if the vendor ignores two Stage 1 reminders. The AI will do the math and propose two options (e.g., "Pay 50% now, remainder in 30 days" or "3 equal monthly installments").
*   **Stage 3 (Final Notice)**: Triggered 14 days after Stage 2. The AI sends a firm final warning and flags the account `flagged_for_human = True`. The AI will not send any more automated emails after this point.

### 👀 The "Preview Next Email" Button (Eye Icon)
Next to each overdue invoice is an Eye Icon. If you want to see what the AI *plans* to say before it actually sends it, click this. It will generate the exact email text based on the current stage and historical RAG context, allowing you to review and send it manually.

---

## 📜 6. Audit Logs (`/audit-logs`)

Agentic AI systems need oversight. The Audit Logs page is an immutable, chronological ledger of everything the AI does.

*   **Action Taken**: Shows exactly what happened (e.g., `EMAIL_SENT`, `RECONCILED`, `ESCALATED`).
*   **Reasoning**: The most important column. The AI explains *why* it did what it did. (e.g., *"Invoice 15 days overdue. Escalating from Stage 1 to Stage 2 and proposing payment plan."*)
*   **Export to CSV**: Click the top right button to download the entire ledger for compliance or accounting purposes.

---

## 📦 7. Purchase Orders (`/purchase-orders`)

This is your master database of expected billing. 
Before the AI can reconcile an invoice, the corresponding PO must exist here. 

*   **PO Number**: The unique identifier.
*   **Item Name / Qty / Price**: The exact terms you agreed to with the vendor.

If the AI flags everything as a discrepancy, ensure your PO data is up-to-date and matches the vendor's billing terminology reasonably well!
