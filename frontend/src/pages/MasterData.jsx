import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader, Tabs, Loader, EmptyState, Modal, StatusPill } from '../components/ui';

export default function MasterData() {
  const [tab, setTab] = useState('departments');
  const tabs = [
    { key: 'departments', label: 'Departments' },
    { key: 'categories', label: 'Categories' },
    { key: 'products', label: 'Products' }
  ];
  return (
    <div>
      <PageHeader title="Master Data" sub="Departments, categories, and product ESG profiles." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'departments' && <Departments />}
      {tab === 'categories' && <Categories />}
      {tab === 'products' && <Products />}
    </div>
  );
}

function Departments() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });

  const load = () => { setLoading(true); api.get('/masterdata/departments').then((r) => setRows(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/masterdata/departments', form); toast.push('Department created'); setOpen(false); setForm({ name: '', code: '' }); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this department?')) return;
    try { await api.delete(`/masterdata/departments/${id}`); toast.push('Deleted'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Departments</h3>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ New Department</button>
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Name</th><th>Code</th><th>Head</th><th>Employees</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.name}</td>
                <td>{d.code}</td>
                <td>{d.head?.name || '—'}</td>
                <td>{d._count?.users ?? d.employeeCount}</td>
                <td><StatusPill status={d.status} /></td>
                <td><button onClick={() => remove(d.id)} className="text-clay text-xs font-semibold hover:underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Department">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Code</label><input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. OPS" /></div>
          <button className="btn-primary mt-2">Save Department</button>
        </form>
      </Modal>
    </div>
  );
}

function Categories() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'CSR_ACTIVITY' });

  const load = () => api.get('/masterdata/categories').then((r) => setRows(r.data));
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/masterdata/categories', form); toast.push('Category created'); setOpen(false); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Categories</h3>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ New Category</button>
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}><td className="font-medium">{c.name}</td><td>{c.type.replace('_', ' ')}</td><td><StatusPill status={c.status} /></td></tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Category">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="CSR_ACTIVITY">CSR Activity</option>
              <option value="CHALLENGE">Challenge</option>
            </select>
          </div>
          <button className="btn-primary mt-2">Save Category</button>
        </form>
      </Modal>
    </div>
  );
}

function Products() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '' });

  const load = () => api.get('/masterdata/products').then((r) => setRows(r.data));
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/masterdata/products', form); toast.push('Product created'); setOpen(false); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Product ESG Profiles</h3>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ New Product</button>
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Name</th><th>SKU</th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.id}><td className="font-medium">{p.name}</td><td>{p.sku || '—'}</td></tr>)}</tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Product">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <button className="btn-primary mt-2">Save Product</button>
        </form>
      </Modal>
    </div>
  );
}
