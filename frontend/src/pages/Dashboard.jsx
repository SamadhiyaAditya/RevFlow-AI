import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText, CheckCircle, AlertTriangle, Clock, Mail, Flag,
  Upload, Zap, Activity, ArrowRight, Loader2
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { StatusBadge, StageBadge } from '../components/StatusBadge';
import { getStats, listAuditLogs, loadDemoData, clearDemoData, runAllEscalations } from '../api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [clearingDemo, setClearingDemo] = useState(false);
  const [runningCollections, setRunningCollections] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        getStats(),
        listAuditLogs({ limit: 8 }),
      ]);
      setStats(statsRes.data);
      setRecentLogs(logsRes.data.logs || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await loadDemoData();
      toast.success('Demo data loaded successfully!');
      fetchData();
    } catch (err) {
      toast.error('Failed to load demo data');
    }
    setLoadingDemo(false);
  };

  const handleClearDemo = async () => {
    if (!confirm('Are you sure you want to clear all data? This will wipe all invoices and POs.')) return;
    setClearingDemo(true);
    try {
      await clearDemoData();
      toast.success('All data cleared.');
      fetchData();
    } catch (err) {
      toast.error('Failed to clear data');
    }
    setClearingDemo(false);
  };

  const handleRunCollections = async () => {
    setRunningCollections(true);
    try {
      const res = await runAllEscalations();
      toast.success(`Collections run complete: ${res.data.actions_taken} actions taken`);
      fetchData();
    } catch (err) {
      toast.error('Collections run failed');
    }
    setRunningCollections(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your finance agent activity</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearDemo}
            disabled={clearingDemo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
          >
            {clearingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Clear Data
          </button>
          <button
            onClick={handleLoadDemo}
            disabled={loadingDemo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-surface-800 hover:bg-surface-700 border border-surface-700 transition-colors disabled:opacity-50"
          >
            {loadingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Load Demo Data
          </button>
          <button
            onClick={handleRunCollections}
            disabled={runningCollections}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-surface-800 hover:bg-surface-700 border border-surface-700 transition-colors disabled:opacity-50"
          >
            {runningCollections ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Force Run
          </button>
          <button
            onClick={() => navigate('/reconcile')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/25"
          >
            <Upload className="w-4 h-4" />
            Upload Invoice
          </button>
        </div>
      </div>

      {/* Stats Grid — clickable for drill-down */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Invoices" value={s.total_invoices || 0} icon={FileText} color="brand" onClick="/invoices" />
        <StatCard title="Matched" value={s.matched || 0} icon={CheckCircle} color="emerald" onClick="/invoices?status=MATCHED" />
        <StatCard title="Discrepancies" value={s.discrepancies || 0} icon={AlertTriangle} color="amber" onClick="/invoices?status=DISCREPANCY" />
        <StatCard title="Overdue" value={s.overdue || 0} icon={Clock} color="orange" onClick="/collections" />
        <StatCard title="Flagged" value={s.flagged_for_human || 0} icon={Flag} color="red" onClick="/invoices?flagged=true" />
        <StatCard title="Failed Emails" value={s.failed_emails_count || 0} icon={AlertTriangle} color="red" />
      </div>

      {/* Collections Stage Breakdown */}
      {s.collections_stages && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Collections Pipeline</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Stage 1 — Reminder', count: s.collections_stages.stage_1, color: 'bg-yellow-500' },
              { label: 'Stage 2 — Payment Plan', count: s.collections_stages.stage_2, color: 'bg-orange-500' },
              { label: 'Stage 3 — Final Notice', count: s.collections_stages.stage_3, color: 'bg-red-500' },
            ].map((stage) => (
              <div key={stage.label} className="flex items-center gap-3 p-4 rounded-xl bg-surface-800/40">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <div>
                  <p className="text-xs text-slate-500">{stage.label}</p>
                  <p className="text-lg font-bold text-slate-200">{stage.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-400" />
            Recent Agent Activity
          </h2>
          <button onClick={() => navigate('/audit-logs')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No activity yet. Upload an invoice or load demo data to get started.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800/40 transition-colors group">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  log.agent === 'RECONCILIATION' ? 'bg-brand-400' : log.agent === 'COLLECTIONS' ? 'bg-amber-400' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{log.reasoning}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{log.agent}</span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">{log.action_taken}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-600 flex-shrink-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
