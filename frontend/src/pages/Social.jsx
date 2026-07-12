import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader, Tabs, Loader, EmptyState, Modal, StatusPill, StatCard } from '../components/ui';

export default function Social() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const isReviewer = user.role === 'ADMIN' || user.role === 'MANAGER';
  const [tab, setTab] = useState('activities');

  const tabs = [
    { key: 'activities', label: 'CSR Activities' },
    { key: 'participations', label: 'Participations' },
    { key: 'trainings', label: 'Trainings' },
    { key: 'diversity', label: 'Diversity Metrics' }
  ];

  return (
    <div>
      <PageHeader title="Social" sub="CSR activities, employee participation, training, and diversity metrics." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'activities' && <CsrActivities isAdmin={isAdmin} />}
      {tab === 'participations' && <Participations isReviewer={isReviewer} user={user} />}
      {tab === 'trainings' && <Trainings isReviewer={isReviewer} />}
      {tab === 'diversity' && <Diversity isAdmin={isAdmin} />}
    </div>
  );
}

function CsrActivities({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', categoryId: '', description: '', activityDate: '', pointsReward: 10, status: 'ACTIVE' });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/social/csr-activities'), api.get('/masterdata/categories?type=CSR_ACTIVITY')])
      .then(([a, c]) => { setRows(a.data); setCats(c.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/social/csr-activities', form);
      toast.push('CSR activity created');
      setOpen(false);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const join = async (activityId) => {
    try {
      await api.post('/social/participations', { activityId });
      toast.push('Joined activity — submit proof from the Participations tab');
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">CSR Activities</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ New Activity</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Points</th><th>Status</th><th>Participants</th>{!isAdmin && <th></th>}</tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.title}</td>
                <td>{a.category?.name || '—'}</td>
                <td>{a.activityDate ? new Date(a.activityDate).toLocaleDateString() : '—'}</td>
                <td>{a.pointsReward}</td>
                <td><StatusPill status={a.status} /></td>
                <td>{a._count?.participations ?? 0}</td>
                {!isAdmin && <td><button onClick={() => join(a.id)} className="text-forest-700 text-xs font-semibold hover:underline">Join</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New CSR Activity">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Title</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">— None —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input className="input" type="date" value={form.activityDate} onChange={(e) => setForm({ ...form, activityDate: e.target.value })} /></div>
            <div><label className="label">Points Reward</label><input className="input" type="number" value={form.pointsReward} onChange={(e) => setForm({ ...form, pointsReward: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn-primary mt-2">Save Activity</button>
        </form>
      </Modal>
    </div>
  );
}

function Participations({ isReviewer, user }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.get('/social/participations').then((r) => setRows(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const review = async (id, decision) => {
    try {
      await api.put(`/social/participations/${id}/review`, { decision });
      toast.push(`Submission ${decision.toLowerCase()}`);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const uploadProof = async (id, file) => {
    try {
      const fd = new FormData();
      fd.append('proof', file);
      await api.put(`/social/participations/${id}/proof`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.push('Proof uploaded successfully');
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <h3 className="font-display font-semibold mb-4">Employee Participations</h3>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Employee</th><th>Activity</th><th>Proof</th><th>Status</th><th>Points</th>{isReviewer && <th>Review</th>}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.employee?.name}</td>
                <td>{p.activity?.title}</td>
                <td>
                  {p.proofUrl ? (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-forest-700 underline text-xs">View</a>
                  ) : (
                    user && user.id === p.employeeId && p.approvalStatus === 'PENDING' ? (
                      <label className="text-xs text-forest-700 font-semibold cursor-pointer hover:underline">
                        Upload Proof
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) uploadProof(p.id, e.target.files[0]);
                          }}
                        />
                      </label>
                    ) : (
                      <span className="text-ink/30 text-xs">None</span>
                    )
                  )}
                </td>
                <td><StatusPill status={p.approvalStatus} /></td>
                <td>{p.pointsEarned}</td>
                {isReviewer && (
                  <td className="flex gap-2 py-2">
                    {p.approvalStatus === 'PENDING' && (
                      <>
                        <button onClick={() => review(p.id, 'APPROVED')} className="text-forest-700 text-xs font-semibold hover:underline">Approve</button>
                        <button onClick={() => review(p.id, 'REJECTED')} className="text-clay text-xs font-semibold hover:underline">Reject</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Trainings({ isReviewer }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', trainingName: '', completedDate: '' });

  const load = () => {
    api.get('/social/trainings').then((r) => setRows(r.data));
    if (isReviewer) api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  };
  useEffect(load, [isReviewer]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/social/trainings', form);
      toast.push('Training recorded');
      setOpen(false);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Training Completions</h3>
        {isReviewer && <button className="btn-primary" onClick={() => setOpen(true)}>+ Record Training</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Employee</th><th>Training</th><th>Completed</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.employee?.name}</td>
                <td>{t.trainingName}</td>
                <td>{t.completedDate ? new Date(t.completedDate).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record Training Completion">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Employee</label>
            <select className="input" required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Select employee</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div><label className="label">Training Name</label><input className="input" required value={form.trainingName} onChange={(e) => setForm({ ...form, trainingName: e.target.value })} /></div>
          <div><label className="label">Completed Date</label><input className="input" type="date" value={form.completedDate} onChange={(e) => setForm({ ...form, completedDate: e.target.value })} /></div>
          <button className="btn-primary mt-2">Save</button>
        </form>
      </Modal>
    </div>
  );
}

function Diversity({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [depts, setDepts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ departmentId: '', metricName: '', metricValue: '' });

  const load = () => {
    Promise.all([api.get('/social/diversity-metrics'), api.get('/masterdata/departments')])
      .then(([m, d]) => { setRows(m.data); setDepts(d.data); });
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/social/diversity-metrics', form);
      toast.push('Metric recorded');
      setOpen(false);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Diversity Metrics</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ Add Metric</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Department</th><th>Metric</th><th>Value</th><th>Recorded</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.department?.name || '—'}</td>
                <td>{m.metricName}</td>
                <td>{Number(m.metricValue)}</td>
                <td>{new Date(m.recordedDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Diversity Metric">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">— Org-wide —</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Metric Name</label><input className="input" required value={form.metricName} onChange={(e) => setForm({ ...form, metricName: e.target.value })} placeholder="Gender Ratio %" /></div>
          <div><label className="label">Value</label><input className="input" required type="number" step="0.01" value={form.metricValue} onChange={(e) => setForm({ ...form, metricValue: e.target.value })} /></div>
          <button className="btn-primary mt-2">Save</button>
        </form>
      </Modal>
    </div>
  );
}
