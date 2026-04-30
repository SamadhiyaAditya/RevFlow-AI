import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, Search, Filter } from 'lucide-react';
import { listAuditLogs } from '../api/client';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;

  const [agentFilter, setAgentFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit, offset: page * limit };
      if (agentFilter) params.agent = agentFilter;
      if (actionFilter) params.action = actionFilter;
      if (search) params.invoice_id = search; // In a real app this would search by multiple fields

      const res = await listAuditLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.count || 0); // Simplified for demo
    } catch (err) {
      toast.error('Failed to load audit logs');
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, agentFilter, actionFilter]);

  const handleExport = () => {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    window.open(`${API_BASE}/api/audit-logs/export?format=csv`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Immutable record of all agent actions and manual overrides</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-surface-800 hover:bg-surface-700 border border-surface-700 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(0); }}
          className="px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
          <option value="">All Agents</option>
          <option value="RECONCILIATION">Reconciliation Agent</option>
          <option value="COLLECTIONS">Collections Agent</option>
          <option value="MANUAL">Manual Action</option>
        </select>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
          <option value="">All Actions</option>
          <option value="RECONCILED">RECONCILED</option>
          <option value="ESCALATED">ESCALATED</option>
          <option value="EMAIL_SENT">EMAIL_SENT</option>
          <option value="PAYMENT_PLAN_PROPOSED">PAYMENT_PLAN_PROPOSED</option>
          <option value="FINAL_NOTICE_SENT">FINAL_NOTICE_SENT</option>
        </select>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {loading && page === 0 ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50 bg-surface-900/40">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Agent</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Invoice Ref</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Action Taken</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500">No logs found.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="border-b border-surface-800/50 hover:bg-surface-800/20 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.agent === 'RECONCILIATION' ? 'bg-brand-500/10 text-brand-400' :
                        log.agent === 'COLLECTIONS' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>{log.agent}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {log.invoices ? `${log.invoices.invoice_number} (${log.invoices.vendor_name})` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-200">{log.action_taken}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-md truncate" title={log.reasoning}>{log.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Basic Pagination */}
      <div className="flex justify-between items-center px-2">
        <p className="text-sm text-slate-500">Showing {logs.length} entries</p>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-sm bg-surface-800 text-slate-300 hover:bg-surface-700 disabled:opacity-50">Prev</button>
          <button onClick={() => setPage(p => p + 1)} disabled={logs.length < limit}
            className="px-3 py-1.5 rounded-lg text-sm bg-surface-800 text-slate-300 hover:bg-surface-700 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
