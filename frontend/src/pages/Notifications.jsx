import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { PageHeader, Loader, EmptyState } from '../components/ui';

export default function Notifications() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.get('/notifications').then((r) => setRows(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  const ICONS = {
    COMPLIANCE_ISSUE_RAISED: '⚖️', CSR_APPROVAL_DECISION: '🤝', CHALLENGE_APPROVAL_DECISION: '🏆',
    POLICY_ACK_REMINDER: '📄', BADGE_UNLOCKED: '🏅', ISSUE_OVERDUE: '⏰'
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Notifications"
        sub="Badge unlocks, approval decisions, and compliance alerts."
        action={rows.some((r) => !r.isRead) && <button className="btn-secondary" onClick={markAllRead}>Mark all as read</button>}
      />
      <div className="card">
        {rows.length === 0 ? <EmptyState title="No notifications" sub="You're all caught up." /> : (
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 py-3 ${!n.isRead ? 'bg-mint-400/[0.06] -mx-5 px-5' : ''}`}>
                <span className="text-xl">{ICONS[n.eventType] || '🔔'}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-ink/50 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-ink/30 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && <button onClick={() => markRead(n.id)} className="text-xs font-semibold text-mint-400 hover:underline shrink-0">Mark read</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}