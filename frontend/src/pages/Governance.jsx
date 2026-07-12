import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader, Tabs, Loader, EmptyState, Modal, StatusPill, StatCard } from '../components/ui';

export default function Governance() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const isReviewer = user.role === 'ADMIN' || user.role === 'MANAGER';
  const [tab, setTab] = useState('policies');

  const tabs = [
    { key: 'policies', label: 'ESG Policies' },
    { key: 'acks', label: 'Acknowledgements' },
    { key: 'audits', label: 'Audits' },
    { key: 'issues', label: 'Compliance Issues' }
  ];

  return (
    <div>
      <PageHeader title="Governance" sub="Policies, acknowledgements, audits, and compliance tracking." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'policies' && <Policies isAdmin={isAdmin} />}
      {tab === 'acks' && <Acknowledgements user={user} isAdmin={isAdmin} />}
      {tab === 'audits' && <Audits isAdmin={isAdmin} />}
      {tab === 'issues' && <ComplianceIssues isReviewer={isReviewer} />}
    </div>
  );
}

function Policies({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Environmental', version: '1.0', status: 'DRAFT' });

  const load = () => { setLoading(true); api.get('/governance/policies').then((r) => setRows(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/governance/policies', form);
      toast.push('Policy created');
      setOpen(false);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const publish = async (id) => {
    try { await api.put(`/governance/policies/${id}`, { status: 'PUBLISHED' }); toast.push('Policy published'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">ESG Policies</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ New Policy</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Title</th><th>Category</th><th>Version</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.title}</td>
                <td>{p.category}</td>
                <td>{p.version}</td>
                <td><StatusPill status={p.status} /></td>
                {isAdmin && <td>{p.status !== 'PUBLISHED' && <button onClick={() => publish(p.id)} className="text-mint-400 text-xs font-semibold hover:underline">Publish</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New ESG Policy" wide>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Title</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['Environmental', 'Social', 'Governance'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Version</label><input className="input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['DRAFT', 'PUBLISHED'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-ink/40">Publishing immediately creates a pending acknowledgement for every active employee.</p>
          <button className="btn-primary mt-2">Save Policy</button>
        </form>
      </Modal>
    </div>
  );
}

function Acknowledgements({ user, isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.get('/governance/acknowledgements').then((r) => setRows(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const acknowledge = async (id) => {
    try { await api.put(`/governance/acknowledgements/${id}/acknowledge`); toast.push('Policy acknowledged'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const sendReminders = async () => {
    try { const res = await api.post('/governance/acknowledgements/send-reminders'); toast.push(res.data.message); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Policy Acknowledgements</h3>
        {isAdmin && <button className="btn-secondary" onClick={sendReminders}>Send Reminders</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr>{isAdmin && <th>Employee</th>}<th>Policy</th><th>Status</th><th>Acknowledged</th>{!isAdmin && <th></th>}</tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                {isAdmin && <td>{a.employee?.name}</td>}
                <td>{a.policy?.title}</td>
                <td><StatusPill status={a.status} /></td>
                <td>{a.acknowledgedDate ? new Date(a.acknowledgedDate).toLocaleDateString() : '—'}</td>
                {!isAdmin && a.employeeId === user.id && (
                  <td>{a.status === 'PENDING' && <button onClick={() => acknowledge(a.id)} className="text-mint-400 text-xs font-semibold hover:underline">Acknowledge</button>}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Audits({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', scope: '', auditDate: '', auditor: '', status: 'SCHEDULED' });

  const load = () => {
    setLoading(true);
    api.get('/governance/audits')
      .then((r) => setRows(r.data))
      .catch((err) => toast.push(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/governance/audits', form); toast.push('Audit scheduled'); setOpen(false); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Audits</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ Schedule Audit</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Title</th><th>Scope</th><th>Auditor</th><th>Date</th><th>Status</th><th>Issues</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.title}</td>
                <td>{a.scope}</td>
                <td>{a.auditor}</td>
                <td>{a.auditDate ? new Date(a.auditDate).toLocaleDateString() : '—'}</td>
                <td><StatusPill status={a.status} /></td>
                <td>{a._count?.complianceIssues ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule Audit">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Title</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Scope</label><input className="input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} /></div>
          <div><label className="label">Auditor</label><input className="input" value={form.auditor} onChange={(e) => setForm({ ...form, auditor: e.target.value })} /></div>
          <div><label className="label">Date</label><input className="input" type="date" value={form.auditDate} onChange={(e) => setForm({ ...form, auditDate: e.target.value })} /></div>
          <button className="btn-primary mt-2">Save Audit</button>
        </form>
      </Modal>
    </div>
  );
}

function ComplianceIssues({ isReviewer }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [audits, setAudits] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ auditId: '', severity: 'MEDIUM', description: '', ownerId: '', dueDate: '' });

  const load = () => {
    api.get('/governance/compliance-issues').then((r) => setRows(r.data));
    if (isReviewer) {
      api.get('/governance/audits').then((r) => setAudits(r.data));
      api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
    }
  };
  useEffect(load, [isReviewer]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/governance/compliance-issues', form);
      toast.push('Compliance issue raised');
      setOpen(false);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const resolve = async (id) => {
    try { await api.put(`/governance/compliance-issues/${id}`, { status: 'RESOLVED' }); toast.push('Issue resolved'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Compliance Issues</h3>
        {isReviewer && <button className="btn-primary" onClick={() => setOpen(true)}>+ Raise Issue</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Description</th><th>Severity</th><th>Owner</th><th>Due Date</th><th>Status</th>{isReviewer && <th></th>}</tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="max-w-xs truncate" title={i.description}>{i.description}</td>
                <td>{i.severity}</td>
                <td>{i.owner?.name || 'Unassigned'}</td>
                <td>{new Date(i.dueDate).toLocaleDateString()}</td>
                <td><StatusPill status={i.status} /></td>
                {isReviewer && <td>{i.status !== 'RESOLVED' && <button onClick={() => resolve(i.id)} className="text-mint-400 text-xs font-semibold hover:underline">Mark Resolved</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Raise Compliance Issue" wide>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Audit</label>
            <select className="input" value={form.auditId} onChange={(e) => setForm({ ...form, auditId: e.target.value })}>
              <option value="">— None —</option>
              {audits.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div><label className="label">Description</label><textarea className="input" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Owner *</label>
              <select className="input" required value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                <option value="">Select owner</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div><label className="label">Due Date *</label><input className="input" required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <p className="text-xs text-ink/40">Owner and Due Date are mandatory — issues left Open past due date auto-flag as overdue.</p>
          <button className="btn-primary mt-2">Raise Issue</button>
        </form>
      </Modal>
    </div>
  );
}