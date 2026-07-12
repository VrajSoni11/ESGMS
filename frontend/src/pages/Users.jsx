import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader, Loader, EmptyState, Modal, StatusPill } from '../components/ui';

export default function Users() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '' });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/users'), api.get('/masterdata/departments')])
      .then(([u, d]) => { setRows(u.data); setDepts(d.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.push('User created');
      setOpen(false);
      setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '' });
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    try { await api.delete(`/users/${id}`); toast.push('User deactivated'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Users"
        sub="Manage employee, manager, and admin accounts."
        action={isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ New User</button>}
      />
      <div className="card">
        {rows.length === 0 ? <EmptyState /> : (
          <table className="table-shell">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>XP</th><th>Points</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-ink/50">{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.department?.name || '—'}</td>
                  <td>{u.xp}</td>
                  <td>{u.pointsBalance}</td>
                  <td><StatusPill status={u.status} /></td>
                  {isAdmin && <td>{u.status === 'ACTIVE' && <button onClick={() => deactivate(u.id)} className="text-clay text-xs font-semibold hover:underline">Deactivate</button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New User">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Full Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Temporary Password</label><input className="input" type="text" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {['EMPLOYEE', 'MANAGER', 'ADMIN'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">— None —</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary mt-2">Create User</button>
        </form>
      </Modal>
    </div>
  );
}
