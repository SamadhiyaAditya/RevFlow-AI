import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Reconcile from './pages/Reconcile';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Collections from './pages/Collections';
import AuditLogs from './pages/AuditLogs';
import PurchaseOrders from './pages/PurchaseOrders';

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reconcile" element={<Reconcile />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
        </Routes>
      </main>
    </div>
  );
}
