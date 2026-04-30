import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Clock, CheckCircle, AlertTriangle, User, Loader2 } from 'lucide-react';
import { StatusBadge, StageBadge } from '../components/StatusBadge';
import EmailPreviewModal from '../components/EmailPreviewModal';
import {
  getInvoice,
  updateInvoiceStatus,
  updateResponseReceived,
  updateFlaggedAsResponded,
  previewCollectionsEmail,
  sendCollectionsEmail
} from '../api/client';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewEmail, setPreviewEmail] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await getInvoice(id);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load invoice details');
      navigate('/invoices');
    }
    setLoading(false);
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateInvoiceStatus(id, newStatus);
      toast.success('Status updated');
      fetchDetail();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleResponseChange = async (e) => {
    try {
      await updateResponseReceived(id, e.target.checked);
      toast.success(e.target.checked ? 'Response marked. Auto-escalation paused.' : 'Response unmarked. Auto-escalation resumed.');
      fetchDetail();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handlePreviewNextStage = async () => {
    setPreviewLoading(true);
    try {
      const res = await previewCollectionsEmail(id);
      if (res.data.has_next_action) {
        setPreviewEmail(res.data);
        setShowPreview(true);
      } else {
        toast('No escalation action available for this stage/status.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('Failed to preview email');
    }
    setPreviewLoading(false);
  };

  const handleSendEmail = async (edits) => {
    try {
      await sendCollectionsEmail(id, edits);
      toast.success('Email sent successfully');
      fetchDetail();
    } catch (err) {
      toast.error('Failed to send email');
    }
  };

  if (loading || !data) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-brand-400 animate-spin" /></div>;

  const { invoice, reconciliation_report, email_history, audit_logs } = data;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/invoices')} className="p-2 rounded-xl bg-surface-800 text-slate-400 hover:text-brand-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            Invoice {invoice.invoice_number}
            {invoice.flagged_for_human && <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-lg"><AlertTriangle className="w-3.5 h-3.5" /> Flagged</span>}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Uploaded {new Date(invoice.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Details & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass rounded-2xl p-6 space-y-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Vendor</p>
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <User className="w-4 h-4 text-slate-400" /> {invoice.vendor_name}
              </div>
              <p className="text-sm text-slate-400 mt-1">{invoice.vendor_email || 'No email provided'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Amount</p>
                <p className="text-xl font-mono text-slate-200">${invoice.total_amount?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Due Date</p>
                <p className="text-slate-200 font-medium">{invoice.due_date || '—'}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-surface-700/50 space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Status</p>
                <select value={invoice.status} onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
                  {['PENDING', 'MATCHED', 'DISCREPANCY', 'OVERDUE', 'PAID'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Collections Stage</p>
                <StageBadge stage={invoice.collections_stage} />
                <p className="text-xs text-slate-500 mt-2">{invoice.reminder_count} reminders sent</p>
              </div>
              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={invoice.response_received} onChange={handleResponseChange}
                    className="w-4 h-4 rounded border-surface-700 text-brand-500 focus:ring-brand-500/50" />
                  Response Received (Auto-Tracked)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={invoice.flagged_as_responded} onChange={async (e) => {
                    try {
                      await updateFlaggedAsResponded(id, e.target.checked);
                      toast.success(e.target.checked ? 'Manual guard active.' : 'Manual guard removed.');
                      fetchDetail();
                    } catch (err) { toast.error('Update failed'); }
                  }}
                    className="w-4 h-4 rounded border-surface-700 text-brand-500 focus:ring-brand-500/50" />
                  Flagged as Responded (Manual Guard)
                </label>
              </div>
              <button onClick={handlePreviewNextStage} disabled={previewLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50">
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Next Stage Email
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Tabs (Recon, Emails, Audit) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Reconciliation Report</h2>
            {reconciliation_report.length === 0 ? (
              <p className="text-sm text-slate-500">No reconciliation data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700/50 text-slate-500 text-left">
                      <th className="py-2 px-3 font-medium">Item</th>
                      <th className="py-2 px-3 font-medium">Billed</th>
                      <th className="py-2 px-3 font-medium">Expected</th>
                      <th className="py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation_report.map((item, i) => (
                      <tr key={i} className="border-b border-surface-800/50">
                        <td className="py-3 px-3 text-slate-300">{item.item_name}</td>
                        <td className="py-3 px-3 text-slate-400">{item.billed_qty} @ ${item.billed_price}</td>
                        <td className="py-3 px-3 text-slate-400">{item.expected_qty} @ ${item.expected_price}</td>
                        <td className="py-3 px-3"><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6 max-h-[400px] overflow-y-auto">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-brand-400" /> Email History</h2>
              <div className="space-y-4">
                {email_history.length === 0 ? <p className="text-xs text-slate-500">No emails sent yet.</p> :
                  email_history.map(email => (
                    <div key={email.id} className="p-3 rounded-xl bg-surface-800/40 border border-surface-700/30">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-slate-300">{email.subject}</p>
                        <span className="text-[10px] text-slate-500">{new Date(email.sent_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{email.body}</p>
                      <div className="mt-2 flex gap-2">
                        <span className="px-2 py-0.5 rounded bg-surface-700/50 text-[10px] text-slate-400">Stage {email.stage}</span>
                        <span className="px-2 py-0.5 rounded bg-surface-700/50 text-[10px] text-slate-400">{email.trigger}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 max-h-[400px] overflow-y-auto">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-400" /> Audit Trail</h2>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-700 before:to-transparent">
                {audit_logs.length === 0 ? <p className="text-xs text-slate-500">No audit logs.</p> :
                  audit_logs.map(log => (
                    <div key={log.id} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-brand-500 border border-surface-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl bg-surface-800/40 border border-surface-700/30">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-brand-400">{log.action_taken}</p>
                          <time className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</time>
                        </div>
                        <p className="text-xs text-slate-300">{log.reasoning}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmailPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        email={previewEmail}
        onSend={handleSendEmail}
        title={`Review Next Stage Email (Stage ${previewEmail?.stage})`}
      />
    </div>
  );
}
