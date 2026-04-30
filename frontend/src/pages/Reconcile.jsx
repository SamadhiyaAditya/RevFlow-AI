import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Loader2, ChevronDown, ChevronUp, Copy, Brain } from 'lucide-react';
import FileUploadZone from '../components/FileUploadZone';
import { StatusBadge } from '../components/StatusBadge';
import { reconcileInvoice } from '../api/client';

export default function Reconcile() {
  const [pdfFile, setPdfFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [threshold, setThreshold] = useState(80);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const handleReconcile = async () => {
    if (!pdfFile || !csvFile) {
      toast.error('Please upload both a PDF invoice and a CSV of Purchase Orders.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('pdf_file', pdfFile);
    formData.append('csv_file', csvFile);
    formData.append('vendor_name', vendorName || 'Vendor');
    formData.append('vendor_email', vendorEmail);
    formData.append('fuzzy_threshold', threshold);

    try {
      const res = await reconcileInvoice(formData);
      setReport(res.data);
      if (res.data.duplicate) {
        toast('⚠️ Duplicate invoice detected!', { icon: '🔁' });
      } else {
        toast.success(`Reconciliation complete: ${res.data.total_items} items processed`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reconciliation failed');
    }
    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Upload & Reconcile</h1>
        <p className="text-sm text-slate-500 mt-1">Upload a PDF invoice and CSV of Purchase Orders for AI-powered matching</p>
      </div>

      {/* Upload Section */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">PDF Invoice</label>
            <FileUploadZone
              onFileDrop={setPdfFile} file={pdfFile} onClear={() => setPdfFile(null)}
              accept={{ 'application/pdf': ['.pdf'] }} label="Drop PDF invoice here"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">PO CSV File</label>
            <FileUploadZone
              onFileDrop={setCsvFile} file={csvFile} onClear={() => setCsvFile(null)}
              accept={{ 'text/csv': ['.csv'] }} label="Drop PO CSV here"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Vendor Name</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. TechSupply Co."
              className="w-full px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Vendor Email</label>
            <input value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} placeholder="billing@vendor.com"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Confidence Threshold: {threshold}%</label>
            <input type="range" min="50" max="100" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full mt-2 accent-brand-500" />
          </div>
        </div>

        <button onClick={handleReconcile} disabled={loading || !pdfFile || !csvFile}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {loading ? 'Processing...' : 'Run Reconciliation'}
        </button>
      </div>

      {/* Results */}
      {report && !report.duplicate && (
        <div className="glass rounded-2xl p-6 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">Reconciliation Report</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Invoice #{report.invoice_number} • {report.total_items} items • Overall: <StatusBadge status={report.overall_status} />
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">{report.matched} matched</span>
              <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400">{report.discrepancies} discrepancies</span>
              <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400">{report.unknown} unknown</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">Matched To</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 uppercase">Confidence</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 uppercase">Billed Qty</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 uppercase">Expected Qty</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 uppercase">Billed Price</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 uppercase">Expected Price</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item, i) => (
                  <>
                    <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                      <td className="py-3 px-3 text-slate-300 font-medium">{item.item_name}</td>
                      <td className="py-3 px-3 text-slate-400">{item.matched_to || '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono text-xs ${item.confidence_score >= 80 ? 'text-emerald-400' : item.confidence_score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                          {item.confidence_score}%
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-center ${item.billed_qty !== item.expected_qty ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>{item.billed_qty}</td>
                      <td className="py-3 px-3 text-center text-slate-400">{item.expected_qty}</td>
                      <td className={`py-3 px-3 text-right ${Math.abs(item.billed_price - item.expected_price) > 0.01 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>${item.billed_price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-slate-400">${item.expected_price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={item.status} /></td>
                      <td className="py-3 px-3">
                        {(item.reasoning || item.email_draft) && (
                          <button onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-400 hover:bg-surface-800 transition-colors">
                            {expandedRow === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr key={`${i}-detail`} className="bg-surface-800/20">
                        <td colSpan={9} className="p-4">
                          {item.reasoning && (
                            <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10">
                              <Brain className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-brand-400 mb-1">Agent Reasoning</p>
                                <p className="text-sm text-slate-300">{item.reasoning}</p>
                              </div>
                            </div>
                          )}
                          {item.email_draft && (
                            <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-700/30">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-slate-400">AI-Generated Email Draft</p>
                                <button onClick={() => copyToClipboard(item.email_draft)}
                                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                              </div>
                              <p className="text-sm text-slate-300 whitespace-pre-wrap">{item.email_draft}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
