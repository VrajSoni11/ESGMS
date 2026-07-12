import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader, Tabs, Loader, EmptyState, Modal, StatCard } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#B8F7E4', '#F0C177', '#E38A78', '#7FE0BE', '#3C8F73'];

export default function Environmental() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [tab, setTab] = useState('dashboard');

  const tabs = [
    { key: 'dashboard', label: 'Overview' },
    { key: 'transactions', label: 'Carbon Transactions' },
    { key: 'factors', label: 'Emission Factors' },
    { key: 'goals', label: 'Sustainability Goals' }
  ];

  return (
    <div>
      <PageHeader title="Environmental" sub="Emissions, carbon transactions, and sustainability goals." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'dashboard' && <EnvOverview />}
      {tab === 'transactions' && <CarbonTransactions isAdmin={isAdmin} />}
      {tab === 'factors' && <EmissionFactors isAdmin={isAdmin} />}
      {tab === 'goals' && <Goals isAdmin={isAdmin} />}
    </div>
  );
}

function EnvOverview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/environmental/dashboard').then((r) => setData(r.data)); }, []);
  if (!data) return <Loader />;

  const sourceData = Object.entries(data.bySource).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  const deptData = Object.entries(data.byDepartment).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <StatCard label="Total CO2e" value={`${data.totalCo2e} kg`} accent="clay" />
        <StatCard label="Sustainability Goals" value={data.goals.length} />
        <StatCard label="Source Types Tracked" value={sourceData.length} accent="forest" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-display font-semibold mb-4">Emissions by Source</h3>
          {sourceData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#25272C', border: '1px solid rgba(184,247,228,0.15)', borderRadius: 12, color: '#EAF6F2' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h3 className="font-display font-semibold mb-4">Emissions by Department</h3>
          {deptData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,247,228,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9498A3' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9498A3' }} />
                <Tooltip contentStyle={{ background: '#25272C', border: '1px solid rgba(184,247,228,0.15)', borderRadius: 12, color: '#EAF6F2' }} />
                <Bar dataKey="value" fill="#B8F7E4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function CarbonTransactions({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [factors, setFactors] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sourceType: 'PURCHASE', sourceRecord: '', emissionFactorId: '', quantity: 1, departmentId: '', txnDate: '', co2eValue: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/environmental/carbon-transactions'),
      api.get('/environmental/emission-factors'),
      api.get('/masterdata/departments')
    ]).then(([t, f, d]) => { setRows(t.data); setFactors(f.data); setDepts(d.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/environmental/carbon-transactions', {
        ...form,
        emissionFactorId: form.emissionFactorId || undefined,
        departmentId: form.departmentId || undefined,
        co2eValue: form.co2eValue || undefined
      });
      toast.push('Carbon transaction recorded');
      setOpen(false);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try { await api.delete(`/environmental/carbon-transactions/${id}`); toast.push('Deleted'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Carbon Transactions</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ Record Transaction</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Date</th><th>Source</th><th>Department</th><th>Qty</th><th>CO2e</th><th>Auto</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.txnDate).toLocaleDateString()}</td>
                <td>{t.sourceType}</td>
                <td>{t.department?.name || '—'}</td>
                <td>{Number(t.quantity)}</td>
                <td className="font-semibold">{Number(t.co2eValue).toFixed(2)} kg</td>
                <td>{t.autoCalculated ? '✓' : '—'}</td>
                {isAdmin && <td><button onClick={() => remove(t.id)} className="text-clay text-xs font-semibold hover:underline">Delete</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record Carbon Transaction">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Source Type</label>
            <select className="input" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
              {['PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET', 'MANUAL'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Source Record (label)</label>
            <input className="input" value={form.sourceRecord} onChange={(e) => setForm({ ...form, sourceRecord: e.target.value })} placeholder="e.g. PO-1023" />
          </div>
          <div>
            <label className="label">Emission Factor (auto-calc if selected)</label>
            <select className="input" value={form.emissionFactorId} onChange={(e) => setForm({ ...form, emissionFactorId: e.target.value })}>
              <option value="">— Manual entry —</option>
              {factors.map((f) => <option key={f.id} value={f.id}>{f.activityType} · {f.unit} ({f.co2eFactor})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="label">Manual CO2e (if no factor)</label>
              <input className="input" type="number" step="0.01" value={form.co2eValue} onChange={(e) => setForm({ ...form, co2eValue: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">— None —</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.txnDate} onChange={(e) => setForm({ ...form, txnDate: e.target.value })} />
          </div>
          <button className="btn-primary mt-2">Save Transaction</button>
        </form>
      </Modal>
    </div>
  );
}

function EmissionFactors({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ activityType: 'PURCHASE', unit: '', co2eFactor: '', description: '' });

  const load = () => api.get('/environmental/emission-factors').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/environmental/emission-factors', form);
      toast.push('Emission factor created');
      setOpen(false);
      setForm({ activityType: 'PURCHASE', unit: '', co2eFactor: '', description: '' });
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this emission factor?')) return;
    try { await api.delete(`/environmental/emission-factors/${id}`); toast.push('Deleted'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Emission Factors</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ Add Factor</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Activity</th><th>Unit</th><th>CO2e Factor</th><th>Description</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <td>{f.activityType}</td>
                <td>{f.unit}</td>
                <td className="font-semibold">{f.co2eFactor}</td>
                <td className="text-ink/50">{f.description}</td>
                <td>{f.status}</td>
                {isAdmin && <td><button onClick={() => remove(f.id)} className="text-clay text-xs font-semibold hover:underline">Delete</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Emission Factor">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Activity Type</label>
            <select className="input" value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}>
              {['PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET', 'MANUAL'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Unit</label><input className="input" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg material" /></div>
          <div><label className="label">CO2e Factor</label><input className="input" required type="number" step="0.0001" value={form.co2eFactor} onChange={(e) => setForm({ ...form, co2eFactor: e.target.value })} /></div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <button className="btn-primary mt-2">Save Factor</button>
        </form>
      </Modal>
    </div>
  );
}

function Goals({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [depts, setDepts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ departmentId: '', metric: '', targetValue: '', deadline: '' });

  const load = () => {
    Promise.all([api.get('/environmental/goals'), api.get('/masterdata/departments')])
      .then(([g, d]) => { setRows(g.data); setDepts(d.data); });
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/environmental/goals', form);
      toast.push('Goal created');
      setOpen(false);
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try { await api.delete(`/environmental/goals/${id}`); toast.push('Deleted'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Sustainability Goals</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ Add Goal</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Department</th><th>Metric</th><th>Target</th><th>Deadline</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td>{g.department?.name || '—'}</td>
                <td>{g.metric}</td>
                <td>{Number(g.targetValue)}</td>
                <td>{new Date(g.deadline).toLocaleDateString()}</td>
                {isAdmin && <td><button onClick={() => remove(g.id)} className="text-clay text-xs font-semibold hover:underline">Delete</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Sustainability Goal">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">— Org-wide —</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Metric</label><input className="input" required value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="Total CO2e (kg)" /></div>
          <div><label className="label">Target Value</label><input className="input" required type="number" step="0.01" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} /></div>
          <div><label className="label">Deadline</label><input className="input" required type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
          <button className="btn-primary mt-2">Save Goal</button>
        </form>
      </Modal>
    </div>
  );
}