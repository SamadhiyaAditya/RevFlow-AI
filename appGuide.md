# 📘 RevFlow-Ai User Guide

Welcome to **RevFlow-Ai**, your automated Agentic Finance Assistant! 
This guide will walk you through what the product does, what the buttons mean, and how to use the system on a daily basis.

---

## 🎯 What does RevFlow-Ai do?
RevFlow-Ai replaces the manual work of reading invoices, comparing them to Purchase Orders (POs), and chasing clients for late payments. 
1. **It Reads**: You upload a PDF invoice.
2. **It Audits**: It compares the invoice items against your PO database to find missing items or price differences.
3. **It Escalates**: It automatically tracks due dates and sends polite (but escalating) emails to vendors who haven't paid.

---

## 🖥️ The Dashboard (Home)
When you log in, you are greeted by the main Dashboard. 

### 📊 The Metric Cards
At the top, you will see four summary cards:
*   **Total Invoices**: The total number of invoices in the system.
*   **Discrepancies**: Invoices where the billed amount did *not* match the expected Purchase Order.
*   **Overdue**: Invoices that have passed their due date and have not been paid.
*   **Failed Emails**: If our AI tried to send an email but the SMTP server failed, it will show up here as an alert.

### 📈 Collections Escalation Chart
This bar chart shows where your overdue invoices currently sit in the "Collections Pipeline":
*   **Stage 1**: They received a polite reminder.
*   **Stage 2**: They received a proposed payment plan.
*   **Stage 3**: Final notice sent; flagged for a human to review.

*(Note: The **Load Demo Data** button at the top right will populate the system with fake data so you can test how everything looks!)*

---

## 📤 Reconcile (Uploading Invoices)
This is where the magic happens. 

1. **Upload Zone**: Drag and drop a PDF invoice here.
2. **Vendor Name & Email**: Enter the vendor's details.
3. **PO Reference**: Provide the Purchase Order number (e.g., `PO-2026-001`) that this invoice is billing against.
4. **Fuzzy Match Threshold**: A slider that determines how strict the AI should be when matching item names. (e.g., at 80%, "MacBook 14" will successfully match "MacBook Pro 14-inch").

**What happens when you click "Run AI Reconciliation"?**
The AI extracts the text from the PDF, cross-references it with your database, and generates a report. 
*   If it matches exactly, the invoice is saved as `MATCHED`.
*   If there is a difference, the AI will generate a professional email draft explaining the discrepancy. You can edit this email directly on the screen and click **Send to Vendor**.

---

## 🗂️ Invoices Page
A master list of all invoices. You can see their current status:
*   🟢 **PAID**: The invoice is settled.
*   🔵 **MATCHED**: The invoice is valid, but payment is pending.
*   🟡 **OVERDUE**: The due date has passed.
*   🔴 **DISCREPANCY**: The invoice has an error (wrong price/qty).

**Action Button**: You can manually mark an invoice as "Paid" using the checkmark button next to it.

---

## 🔔 Collections Page
This is the command center for the automated follow-up system. 

*   **The "Run Daily Collections" Button**: Clicking this triggers the AI to scan all `OVERDUE` invoices. If an invoice is ready for a reminder, the AI will draft and send a context-aware email immediately.
*   **The "Preview Next Email" Button (Eye Icon)**: Don't want the AI to send emails blindly? Click this icon next to any overdue invoice. The AI will generate what it *plans* to send next, allowing you to read it, edit it, or send it manually.

---

## 📜 Audit Logs
Every single action taken by the AI is permanently recorded here. 
If the AI sends an email, flags a discrepancy, or escalates a collection, it logs the action and its **Reasoning** (e.g., *"Invoice 12 days overdue, escalating to Stage 2"*). This ensures the AI is never a "black box."

## 📦 Purchase Orders
This is your internal source of truth. Before you upload an invoice, the corresponding PO items must exist in this database so the AI has something to check the invoice against. 
