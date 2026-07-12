import React from 'react';

export function StatusPill({ status }) {
  const map = {
    ACTIVE: 'bg-mint-400/15 text-mint-400 border border-mint-400/20',
    INACTIVE: 'bg-graphite-600/40 text-graphite-300 border border-graphite-500/30',
    PENDING: 'bg-amber-400/15 text-amber-400 border border-amber-400/20',
    APPROVED: 'bg-mint-400/15 text-mint-400 border border-mint-400/20',
    REJECTED: 'bg-clay/15 text-clay border border-clay/25',
    OPEN: 'bg-amber-400/15 text-amber-400 border border-amber-400/20',
    IN_PROGRESS: 'bg-sky-400/15 text-sky-300 border border-sky-400/20',
    RESOLVED: 'bg-mint-400/15 text-mint-400 border border-mint-400/20',
    FLAGGED_OVERDUE: 'bg-clay/15 text-clay border border-clay/25',
    DRAFT: 'bg-graphite-600/40 text-graphite-300 border border-graphite-500/30',
    PUBLISHED: 'bg-mint-400/15 text-mint-400 border border-mint-400/20',
    ARCHIVED: 'bg-graphite-600/40 text-graphite-300 border border-graphite-500/30',
    COMPLETED: 'bg-mint-400/15 text-mint-400 border border-mint-400/20',
    UNDER_REVIEW: 'bg-amber-400/15 text-amber-400 border border-amber-400/20',
    ACKNOWLEDGED: 'bg-mint-400/15 text-mint-400 border border-mint-400/20',
    SCHEDULED: 'bg-sky-400/15 text-sky-300 border border-sky-400/20'
  };
  return (
    <span className={`pill ${map[status] || 'bg-graphite-600/40 text-graphite-300 border border-graphite-500/30'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function StatCard({ label, value, sub, accent = 'mint' }) {
  const accents = {
    mint: 'text-mint-400 bg-mint-400/10',
    forest: 'text-mint-400 bg-mint-400/10',
    amber: 'text-amber-400 bg-amber-400/12',
    clay: 'text-clay bg-clay/10'
  };
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</span>
      <span className="font-display text-3xl font-semibold text-ink">{value}</span>
      {sub && <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit mt-1 ${accents[accent]}`}>{sub}</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`glass-strong rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-mint-400 text-xl leading-none focus-ring rounded transition-colors">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', sub = 'Data will show up once records are added.' }) {
  return (
    <div className="text-center py-14 text-ink/50">
      <div className="text-3xl mb-2">🌱</div>
      <p className="font-semibold text-ink/70">{title}</p>
      <p className="text-sm">{sub}</p>
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-mint-400/20 border-t-mint-400 rounded-full animate-spin" />
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-mint-400/10 mb-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors focus-ring ${
            active === t.key
              ? 'border-mint-400 text-mint-400'
              : 'border-transparent text-ink/45 hover:text-ink/80'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {sub && <p className="text-ink/50 text-sm mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Select({ value, onChange, children, className = '' }) {
  return (
    <select className={`input ${className}`} value={value} onChange={onChange}>
      {children}
    </select>
  );
}