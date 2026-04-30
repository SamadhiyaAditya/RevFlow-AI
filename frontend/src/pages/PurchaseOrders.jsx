import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, Loader2, Database, AlertCircle } from 'lucide-react';
import FileUploadZone from '../components/FileUploadZone';
import { listPurchaseOrders, uploadPurchaseOrders } from '../api/client';

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchPos = async () => {
    setLoading(true);
    try {
      const res = await listPurchaseOrders();
      setPos(res.data.items || []);
    } catch (err) {
      toast.error('Failed to load purchase orders');
    }
    setLoading(false);
  };

  useEffect(() => { fetchPos(); }, []);

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    try {
      const res = await uploadPurchaseOrders(formData);
      toast.success(`Uploaded ${res.data.inserted} PO records successfully`);
      setCsvFile(null);
      fetchPos();
    } catch (err) {
      toast.error('Failed to upload PO data');
    }
    setUploading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Master Purchase Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Manage the central database of expected purchase order values</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Batch Upload</h2>
            <FileUploadZone
              onFileDrop={setCsvFile} file={csvFile} onClear={() => setCsvFile(null)}
              accept={{ 'text/csv': ['.csv'] }} label="Upload Master PO CSV"
            />
            <button onClick={handleUpload} disabled={!csvFile || uploading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Processing...' : 'Upload Data'}
            </button>
          </div>
          
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-300 leading-relaxed">
              Uploading a master CSV allows the Reconciliation Agent to run without requiring a CSV upload every time. It uses the invoice's PO reference to find the matching records here.
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="glass rounded-2xl overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between bg-surface-900/40">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Database className="w-4 h-4" /> Database Records</h2>
              <span className="text-xs text-slate-500">{pos.length} total items</span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-brand-400 animate-spin" /></div>
              ) : pos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Database className="w-12 h-12 mb-3 opacity-20" />
                  <p>No PO records found. Upload a CSV to begin.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-900/90 backdrop-blur border-b border-surface-700/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">PO Number</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Item ID</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Item Name</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Qty</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.map((item) => (
                      <tr key={item.id} className="border-b border-surface-800/50 hover:bg-surface-800/20">
                        <td className="py-2.5 px-4 text-slate-300 font-medium">{item.po_number}</td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{item.item_id || '—'}</td>
                        <td className="py-2.5 px-4 text-slate-300">{item.item_name}</td>
                        <td className="py-2.5 px-4 text-center text-slate-400">{item.quantity}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">${item.unit_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
