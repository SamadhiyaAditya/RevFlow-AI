import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, FileText, Bell, ScrollText, Database, Zap
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reconcile', label: 'Reconcile', icon: Upload },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/collections', label: 'Collections', icon: Bell },
  { path: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: Database },
];

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-surface-900/80 backdrop-blur-xl border-r border-surface-700/50 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">RevFlow-Ai</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Finance Agent</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400 shadow-sm shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/60'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-700/50">
        <div className="px-4 py-3 rounded-xl bg-surface-800/40 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Agentic AI</p>
          <p className="text-xs text-slate-400 mt-0.5">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
