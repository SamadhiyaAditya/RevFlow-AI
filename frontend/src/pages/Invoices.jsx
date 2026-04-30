import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Loader2, Trash2, CreditCard, Mail, Eye, AlertTriangle } from 'lucide-react';
import { StatusBadge, StageBadge } from '../components/StatusBadge';
import { listInvoices, updateInvoiceStatus, deleteInvoice } from '../api/client';

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [stageFilter, setStageFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState(searchParams.get('flagged') === 'true');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (stageFilter !== '') params.collections_stage = Number(stageFilter);
      if (flaggedFilter) params.flagged = true;
      const res = await listInvoices(params);
      setInvoices(res.data.invoices || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, [statusFilter, stageFilter, flaggedFilter]);

  const handleMarkPaid = async (id) => {
    try {
      await updateInvoiceStatus(id, 'PAID');
      toast.success('Invoice marked as paid');
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice and all related records?')) return;
    try {
      await deleteInvoice(id);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filtered = invoices.filter((inv) =>
    !search || inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">Manage all invoices and their reconciliation status</p>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
          <option value="">All Statuses</option>
          {['PENDING', 'MATCHED', 'DISCREPANCY', 'OVERDUE', 'PAID'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
          <option value="">All Stages</option>
          {[0, 1, 2, 3].map((s) => <option key={s} value={s}>Stage {s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={flaggedFilter} onChange={(e) => setFlaggedFilter(e.target.checked)}
            className="rounded border-surface-700 text-brand-500 focus:ring-brand-500/50" />
          Flagged Only
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50 bg-surface-900/40">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Invoice #</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Vendor</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Due Date</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Stage</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500">No invoices found.</td></tr>
                ) : filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-surface-800/50 hover:bg-surface-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {inv.flagged_for_human && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-slate-200 font-medium">{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{inv.vendor_name}</td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">${inv.total_amount?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center text-slate-400">{inv.due_date || '—'}</td>
                    <td className="py-3 px-4 text-center"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 px-4 text-center"><StageBadge stage={inv.collections_stage} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-surface-800 transition-colors"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleMarkPaid(inv.id)} title="Mark as Paid"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"><CreditCard className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(inv.id)} title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
