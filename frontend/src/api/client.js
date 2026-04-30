import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Stats
export const getStats = () => api.get('/api/stats');

// Reconciliation
export const reconcileInvoice = (formData) =>
  api.post('/api/reconcile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getReconciliationReport = (invoiceId) => api.get(`/api/reconcile/${invoiceId}`);
export const listReconciliationReports = (status) =>
  api.get('/api/reconcile', { params: status ? { status } : {} });

// Invoices
export const listInvoices = (params = {}) => api.get('/api/invoices', { params });
export const getInvoice = (id) => api.get(`/api/invoices/${id}`);
export const updateInvoiceStatus = (id, status) => api.patch(`/api/invoices/${id}/status`, { status });
export const updateResponseReceived = (id, received) => api.patch(`/api/invoices/${id}/response`, { response_received: received });
export const deleteInvoice = (id) => api.delete(`/api/invoices/${id}`);

// Collections
export const sendCollectionsEmail = (invoiceId, edits) => api.post(`/api/collections/send/${invoiceId}`, edits || {});
export const previewCollectionsEmail = (invoiceId) => api.post(`/api/collections/preview/${invoiceId}`);
export const runAllEscalations = () => api.post('/api/collections/run-all');
export const listOverdueInvoices = () => api.get('/api/collections/overdue');
export const listFlaggedInvoices = () => api.get('/api/collections/flagged');

// Audit Logs
export const listAuditLogs = (params = {}) => api.get('/api/audit-logs', { params });
export const exportAuditLogs = () => api.get('/api/audit-logs/export', { responseType: 'blob' });
export const getAuditLogsForInvoice = (invoiceId) => api.get(`/api/audit-logs/${invoiceId}`);

// POs
export const uploadPurchaseOrders = (formData) =>
  api.post('/api/pos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const listPurchaseOrders = () => api.get('/api/pos');

// Demo
export const loadDemoData = () => api.post('/api/demo/load');
export const clearDemoData = () => api.post('/api/demo/clear');

// Flag as Responded (Manual Guard)
export const updateFlaggedAsResponded = (id, flagged) => 
  api.patch(`/api/invoices/${id}/flag-responded`, { flagged });

export default api;
