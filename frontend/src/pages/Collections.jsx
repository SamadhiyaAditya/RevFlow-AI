import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Clock, AlertTriangle, PlayCircle, Loader2 } from 'lucide-react';
import { StageBadge, StatusBadge } from '../components/StatusBadge';
import EmailPreviewModal from '../components/EmailPreviewModal';
import { listOverdueInvoices, listFlaggedInvoices, runAllEscalations, previewCollectionsEmail, sendCollectionsEmail } from '../api/client';

export default function Collections() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overdue');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [previewEmail, setPreviewEmail] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = activeTab === 'overdue' ? await listOverdueInvoices() : await listFlaggedInvoices();
      setInvoices(res.data.invoices || []);
    } catch (err) {
      toast.error('Failed to load collections data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      const res = await runAllEscalations();
      toast.success(`Collections run complete: ${res.data.actions_taken} actions taken`);
      fetchData();
    } catch (err) {
      toast.error('Failed to run escalations');
    }
    setRunningAll(false);
  };

  const handlePreview = async (id) => {
    setPreviewLoadingId(id);
    try {
      const res = await previewCollectionsEmail(id);
      if (res.data.has_next_action) {
        setPreviewEmail(res.data);
        setSelectedInvoiceId(id);
        setShowPreview(true);
      } else {
        toast('No escalation action available. Check response flag or status.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('Failed to preview email');
    }
    setPreviewLoadingId(null);
  };

  const handleSendEmail = async (edits) => {
    try {
      await sendCollectionsEmail(selectedInvoiceId, edits);
      toast.success('Email sent successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to send email');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Collections Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">Manage overdue invoices and AI escalation stages</p>
        </div>
        <button onClick={handleRunAll} disabled={runningAll}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50">
          {runningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Run All Escalations
        </button>
      </div>

      <div className="flex gap-4 border-b border-surface-700">
        <button onClick={() => setActiveTab('overdue')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overdue' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Overdue ({activeTab === 'overdue' ? invoices.length : '...'})</div>
        </button>
        <button onClick={() => setActiveTab('flagged')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'flagged' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Flagged for Human ({activeTab === 'flagged' ? invoices.length : '...'})</div>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-brand-400 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">No invoices in this view.</div>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="glass rounded-2xl p-5 space-y-4 relative overflow-hidden group">
                {inv.flagged_for_human && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 blur-2xl" />}
                <div className="flex justify-between items-start relative">
                  <div>
                    <h3 className="text-base font-semibold text-slate-200 cursor-pointer hover:text-brand-400 transition-colors" onClick={() => navigate(`/invoices/${inv.id}`)}>{inv.invoice_number}</h3>
                    <p className="text-sm text-slate-400">{inv.vendor_name}</p>
                  </div>
                  <p className="text-lg font-mono font-bold text-slate-200">${inv.total_amount?.toFixed(2)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-surface-800/50 p-2 rounded-lg">
                    <p className="text-slate-500 uppercase">Due Date</p>
                    <p className="font-medium text-slate-300">{inv.due_date}</p>
                  </div>
                  <div className="bg-surface-800/50 p-2 rounded-lg">
                    <p className="text-slate-500 uppercase">Reminders</p>
                    <p className="font-medium text-slate-300">{inv.reminder_count}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <StageBadge stage={inv.collections_stage} />
                  {inv.response_received && <span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-1 rounded">Paused</span>}
                </div>

                <div className="pt-4 border-t border-surface-700/50 flex justify-end gap-2">
                  <button onClick={() => navigate(`/invoices/${inv.id}`)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-surface-800 hover:text-slate-200 transition-colors">
                    View Details
                  </button>
                  {!inv.flagged_for_human && !inv.response_received && (
                    <button onClick={() => handlePreview(inv.id)} disabled={previewLoadingId === inv.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 transition-colors disabled:opacity-50">
                      {previewLoadingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      Review Next
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <EmailPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        email={previewEmail}
        onSend={handleSendEmail}
        title={`Review Escalation Email (Stage ${previewEmail?.stage})`}
      />
    </div>
  );
}
