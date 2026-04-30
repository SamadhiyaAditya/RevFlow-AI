-- RevFlow-Ai Database Schema
-- Optimized for RAG context retrieval and collections escalation

-- Enable UUID and Vector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    po_number TEXT NOT NULL,
    item_id TEXT,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    unit_price FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    vendor_email TEXT,
    po_reference TEXT,
    total_amount FLOAT DEFAULT 0.0,
    due_date DATE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHED', 'DISCREPANCY', 'OVERDUE', 'PAID', 'PARSE_FAILED')),
    collections_stage INT DEFAULT 0 CHECK (collections_stage BETWEEN 0 AND 3),
    reminder_count INT DEFAULT 0,
    last_reminder_sent DATE,
    stage2_sent_at DATE,
    flagged_as_responded BOOLEAN DEFAULT FALSE,
    flagged_for_human BOOLEAN DEFAULT FALSE,
    pdf_path TEXT,
    response_received BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Reconciliation Reports
CREATE TABLE IF NOT EXISTS reconciliation_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_name TEXT,
    matched_to TEXT,
    confidence_score INT DEFAULT 0,
    billed_qty INT DEFAULT 0,
    expected_qty INT DEFAULT 0,
    billed_price FLOAT DEFAULT 0.0,
    expected_price FLOAT DEFAULT 0.0,
    status TEXT CHECK (status IN ('MATCH', 'DISCREPANCY', 'UNKNOWN', 'PARSE_FAILED')),
    reasoning TEXT,
    email_draft TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vendor History (RAG Store)
CREATE TABLE IF NOT EXISTS vendor_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_name TEXT NOT NULL,
    event_description TEXT NOT NULL,
    metadata JSONB,
    embedding VECTOR(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    agent TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    reasoning TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    recipient_email TEXT,
    subject TEXT,
    body TEXT,
    stage INT,
    status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED')),
    failure_reason TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    trigger TEXT DEFAULT 'AUTO' CHECK (trigger IN ('AUTO', 'MANUAL'))
);

-- 7. Vector Search RPC Function
CREATE OR REPLACE FUNCTION match_vendor_history(
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT,
  v_name TEXT
)
RETURNS TABLE (
  id UUID,
  event_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vh.id,
    vh.event_description,
    vh.metadata,
    vh.created_at,
    1 - (vh.embedding <=> query_embedding) AS similarity
  FROM vendor_history vh
  WHERE vh.vendor_name = v_name
    AND 1 - (vh.embedding <=> query_embedding) > match_threshold
  ORDER BY vh.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_vendor_history_name ON vendor_history(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_history_embedding ON vendor_history USING ivfflat (embedding vector_cosine_ops);
