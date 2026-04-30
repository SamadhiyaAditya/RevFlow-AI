import { useState } from 'react';
import { X, Send, Edit3, Zap } from 'lucide-react';

export default function EmailPreviewModal({ isOpen, onClose, email, onSend, title = 'Email Preview' }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(email?.email_subject || email?.subject || '');
  const [body, setBody] = useState(email?.email_body || email?.body || '');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend({ email_subject: subject, email_body: body });
      onClose();
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl mx-4 rounded-2xl bg-surface-900 border border-surface-700/50 shadow-2xl shadow-black/50 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
          <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
          <div className="flex items-center gap-2">
            {email?.is_rag_draft && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 text-[10px] font-bold uppercase tracking-wider border border-brand-500/20">
                <Zap className="w-3 h-3" /> RAG Optimized
              </span>
            )}
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-surface-800 transition-colors"
              title="Edit email"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">To</label>
            <p className="text-sm text-slate-300">{email?.vendor_email || email?.recipient_email || '—'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
            {editing ? (
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            ) : (
              <p className="text-sm text-slate-200 font-medium">{subject}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Body</label>
            {editing ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-y"
              />
            ) : (
              <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/30 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {body}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
