import { useNavigate } from 'react-router-dom';

export default function StatCard({ title, value, icon: Icon, color = 'brand', trend, onClick, subtitle }) {
  const navigate = useNavigate();

  const colorMap = {
    brand: { bg: 'from-brand-500/20 to-brand-600/10', border: 'border-brand-500/20', text: 'text-brand-400', icon: 'text-brand-400', glow: 'shadow-brand-500/10' },
    emerald: { bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    amber: { bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-400', glow: 'shadow-amber-500/10' },
    red: { bg: 'from-red-500/20 to-red-600/10', border: 'border-red-500/20', text: 'text-red-400', icon: 'text-red-400', glow: 'shadow-red-500/10' },
    blue: { bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-400', glow: 'shadow-blue-500/10' },
    orange: { bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: 'text-orange-400', glow: 'shadow-orange-500/10' },
  };

  const c = colorMap[color] || colorMap.brand;

  const handleClick = () => {
    if (onClick) {
      if (typeof onClick === 'string') navigate(onClick);
      else onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} p-5 card-hover ${
        onClick ? 'cursor-pointer' : ''
      } shadow-lg ${c.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from yesterday
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-surface-900/40 ${c.icon}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {/* Decorative gradient orb */}
      <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${c.bg} opacity-50 blur-2xl`} />
    </div>
  );
}
