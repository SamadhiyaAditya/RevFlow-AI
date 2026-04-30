export function StatusBadge({ status }) {
  const map = {
    MATCH: 'badge-match',
    MATCHED: 'badge-match',
    DISCREPANCY: 'badge-discrepancy',
    UNKNOWN: 'badge-unknown',
    PENDING: 'badge-pending',
    PAID: 'badge-paid',
    OVERDUE: 'badge-overdue',
  };
  const cls = map[status?.toUpperCase()] || 'badge-pending';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export function StageBadge({ stage }) {
  const stageMap = {
    0: { label: 'Not Started', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    1: { label: 'Stage 1 — Reminder', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    2: { label: 'Stage 2 — Payment Plan', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    3: { label: 'Stage 3 — Final Notice', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };
  const s = stageMap[stage] || stageMap[0];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}
