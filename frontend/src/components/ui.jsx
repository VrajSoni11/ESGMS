import React from 'react';

export function StatusPill({ status }) {
  const map = {
    ACTIVE: 'bg-forest-100 text-forest-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    PENDING: 'bg-amber-400/20 text-amber-700',
    APPROVED: 'bg-forest-100 text-forest-700',
    REJECTED: 'bg-clay/15 text-clay',
    OPEN: 'bg-amber-400/20 text-amber-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-forest-100 text-forest-700',
    FLAGGED_OVERDUE: 'bg-clay/15 text-clay',
    DRAFT: 'bg-gray-100 text-gray-600',
    PUBLISHED: 'bg-forest-100 text-forest-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
    COMPLETED: 'bg-forest-100 text-forest-700',
    UNDER_REVIEW: 'bg-amber-400/20 text-amber-700',
    ACKNOWLEDGED: 'bg-forest-100 text-forest-700',
    SCHEDULED: 'bg-blue-100 text-blue-700'
  };
  return (
    <span className={`pill ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function StatCard({ label, value, sub, accent = 'forest' }) {
  const accents = {
    forest: 'text-forest-700 bg-forest-50',
    amber: 'text-amber-700 bg-amber-400/15',
    clay: 'text-clay bg-clay/10'
  };
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</span>
      <span className="font-display text-3xl font-semibold text-ink">{value}</span>
      {sub && <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit mt-1 ${accents[accent]}`}>{sub}</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`bg-panel rounded-2xl shadow-card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl leading-none focus-ring rounded">&times;</button>
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
      <div className="w-8 h-8 border-2 border-forest-300 border-t-forest-500 rounded-full animate-spin" />
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line mb-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors focus-ring ${
            active === t.key
              ? 'border-forest-500 text-forest-700'
              : 'border-transparent text-ink/50 hover:text-ink'
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
