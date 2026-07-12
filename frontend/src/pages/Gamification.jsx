import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader, Tabs, Loader, EmptyState, Modal, StatusPill } from '../components/ui';

export default function Gamification() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const isReviewer = user.role === 'ADMIN' || user.role === 'MANAGER';
  const [tab, setTab] = useState('challenges');

  const tabs = [
    { key: 'challenges', label: 'Challenges' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'badges', label: 'Badges' },
    { key: 'rewards', label: 'Rewards' }
  ];

  return (
    <div>
      <PageHeader title="Gamification" sub="Challenges, XP, badges, rewards, and the leaderboard." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'challenges' && <Challenges user={user} isAdmin={isAdmin} isReviewer={isReviewer} />}
      {tab === 'leaderboard' && <Leaderboard />}
      {tab === 'badges' && <Badges isAdmin={isAdmin} />}
      {tab === 'rewards' && <Rewards isAdmin={isAdmin} isEmployee={user.role === 'EMPLOYEE'} />}
    </div>
  );
}

function Challenges({ user, isAdmin, isReviewer }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [myParts, setMyParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', categoryId: '', description: '', xp: 50, difficulty: 'MEDIUM', evidenceRequired: true, deadline: '', status: 'ACTIVE' });
  const [trackingChallenge, setTrackingChallenge] = useState(null);

  const load = () => {
    setLoading(true);
    const calls = [api.get('/gamification/challenges'), api.get('/masterdata/categories?type=CHALLENGE')];
    if (!isReviewer) calls.push(api.get('/gamification/challenge-participations'));
    Promise.all(calls).then(([c, cat, p]) => {
      setRows(c.data); setCats(cat.data);
      if (p) setMyParts(p.data);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    // Bug fix: trim + validate before hitting the API so a whitespace-only
    // title or a stray non-numeric XP value can't slip through and produce
    // the old "unable to create a challenge" failure with no clear reason.
    if (!form.title.trim()) {
      toast.push('Title is required', 'error');
      return;
    }
    const xpNum = Number(form.xp);
    if (form.xp !== '' && (Number.isNaN(xpNum) || xpNum < 0)) {
      toast.push('XP must be a valid positive number', 'error');
      return;
    }
    try {
      await api.post('/gamification/challenges', { ...form, title: form.title.trim() });
      toast.push('Challenge created');
      setOpen(false);
      setForm({ title: '', categoryId: '', description: '', xp: 50, difficulty: 'MEDIUM', evidenceRequired: true, deadline: '', status: 'ACTIVE' });
      load();
    }
    catch (err) { toast.push(apiErrorMessage(err, 'Unable to create challenge'), 'error'); }
  };

  const join = async (id) => {
    try { await api.post(`/gamification/challenges/${id}/join`); toast.push('Joined challenge'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const submitProof = async (partId, file) => {
    try {
      const fd = new FormData();
      fd.append('proof', file);
      fd.append('progress', 100);
      await api.put(`/gamification/challenge-participations/${partId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.push('Proof submitted for review');
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const completeChallenge = async (partId) => {
    try {
      await api.put(`/gamification/challenge-participations/${partId}`, { progress: 100 });
      toast.push('Challenge completed. Awaiting review.');
      load();
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const setStatus = async (id, status) => {
    try { await api.put(`/gamification/challenges/${id}`, { status }); toast.push(`Challenge marked ${status}`); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const partMap = new Map(myParts.map((p) => [p.challengeId, p]));

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Challenges</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ New Challenge</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <table className="table-shell">
          <thead><tr><th>Title</th><th>Category</th><th>XP</th><th>Difficulty</th><th>Status</th><th>Participants</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const myPart = partMap.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="font-medium">{c.title}</td>
                  <td>{c.category?.name || '—'}</td>
                  <td className="font-semibold text-amber-400">{c.xp}</td>
                  <td>{c.difficulty}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td>{c._count?.participations ?? 0}</td>
                  <td className="flex flex-wrap gap-2.5 items-center">
                    {isReviewer && (
                      <button
                        onClick={() => setTrackingChallenge(c)}
                        className="text-mint-400 text-xs font-semibold hover:underline"
                      >
                        Participants
                      </button>
                    )}
                    {!isReviewer && c.status === 'ACTIVE' && (
                      <>
                        {!myPart ? (
                          <button onClick={() => join(c.id)} className="text-mint-400 text-xs font-semibold hover:underline">Join</button>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs text-mint-400/60 font-semibold">Joined</span>
                            {myPart.approvalStatus === 'APPROVED' ? (
                              <span className="text-xs text-mint-400 font-bold">✓ Approved</span>
                            ) : myPart.approvalStatus === 'PENDING' ? (
                              c.evidenceRequired ? (
                                myPart.proofUrl ? (
                                  <span className="text-xs text-amber-400 font-semibold">Pending Review</span>
                                ) : (
                                  <label className="text-xs text-mint-400 font-semibold cursor-pointer hover:underline">
                                    Submit Proof
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) submitProof(myPart.id, e.target.files[0]);
                                      }}
                                    />
                                  </label>
                                )
                              ) : (
                                myPart.progress === 100 ? (
                                  <span className="text-xs text-amber-400 font-semibold">Pending Review</span>
                                ) : (
                                  <button
                                    onClick={() => completeChallenge(myPart.id)}
                                    className="text-xs text-mint-400 font-semibold hover:underline"
                                  >
                                    Mark Complete
                                  </button>
                                )
                              )
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-clay font-semibold">Rejected</span>
                                {c.evidenceRequired && (
                                  <label className="text-xs text-mint-400 font-semibold cursor-pointer hover:underline">
                                    Re-submit
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) submitProof(myPart.id, e.target.files[0]);
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {isAdmin && c.status === 'DRAFT' && <button onClick={() => setStatus(c.id, 'ACTIVE')} className="text-mint-400 text-xs font-semibold hover:underline">Activate</button>}
                    {isAdmin && c.status === 'ACTIVE' && <button onClick={() => setStatus(c.id, 'UNDER_REVIEW')} className="text-amber-400 text-xs font-semibold hover:underline">Close for Review</button>}
                    {isAdmin && c.status === 'UNDER_REVIEW' && <button onClick={() => setStatus(c.id, 'COMPLETED')} className="text-mint-400 text-xs font-semibold hover:underline">Complete</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Challenge" wide>
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
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">XP</label><input className="input" type="number" value={form.xp} onChange={(e) => setForm({ ...form, xp: e.target.value })} /></div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                {['EASY', 'MEDIUM', 'HARD'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="label">Deadline</label><input className="input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.evidenceRequired} onChange={(e) => setForm({ ...form, evidenceRequired: e.target.checked })} />
            Evidence required to approve
          </label>
          <button className="btn-primary mt-2">Save Challenge</button>
        </form>
      </Modal>

      <ChallengeTrackingModal
        open={!!trackingChallenge}
        onClose={() => { setTrackingChallenge(null); load(); }}
        challenge={trackingChallenge}
      />
    </div>
  );
}

function ChallengeTrackingModal({ open, onClose, challenge }) {
  const toast = useToast();
  const [parts, setParts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigneeId, setAssigneeId] = useState('');

  const loadParticipants = () => {
    setLoading(true);
    Promise.all([
      api.get(`/gamification/challenge-participations?challengeId=${challenge.id}`),
      api.get('/users')
    ]).then(([pRes, uRes]) => {
      setParts(pRes.data);
      setUsers(uRes.data.filter(u => u.role === 'EMPLOYEE' || u.role === 'MANAGER'));
    }).catch(err => {
      toast.push(apiErrorMessage(err), 'error');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && challenge) {
      loadParticipants();
      setAssigneeId('');
    }
  }, [open, challenge]);

  const review = async (partId, decision) => {
    try {
      await api.put(`/gamification/challenge-participations/${partId}/review`, { decision });
      toast.push(`Submission ${decision.toLowerCase()}`);
      loadParticipants();
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    }
  };

  const assign = async (e) => {
    e.preventDefault();
    if (!assigneeId) return;
    try {
      await api.post(`/gamification/challenges/${challenge.id}/assign`, { employeeId: Number(assigneeId) });
      toast.push('Challenge assigned successfully');
      setAssigneeId('');
      loadParticipants();
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    }
  };

  if (!open) return null;

  const partUserIds = new Set(parts.map(p => p.employeeId));
  const assignableUsers = users.filter(u => !partUserIds.has(u.id));

  return (
    <Modal open={open} onClose={onClose} title={`Tracking: ${challenge.title}`} wide>
      {loading ? <Loader /> : (
        <div className="flex flex-col gap-6">
          <div className="border-b border-line pb-4">
            <h4 className="font-semibold text-sm mb-2 text-ink/70">Assign to Employee</h4>
            <form onSubmit={assign} className="flex gap-2">
              <select
                className="input py-1.5"
                required
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
              >
                <option value="">Select employee...</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.department?.name || 'No Dept'})</option>
                ))}
              </select>
              <button className="btn-primary py-1.5 px-4" disabled={!assigneeId}>Assign</button>
            </form>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-ink/70">Participants ({parts.length})</h4>
            {parts.length === 0 ? <EmptyState title="No participants yet" sub="Assign this challenge or let employees join." /> : (
              <table className="table-shell text-xs">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Proof</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.id}>
                      <td className="font-semibold">{p.employee?.name}</td>
                      <td>{p.employee?.department?.name || '—'}</td>
                      <td>
                        {p.proofUrl ? (
                          <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-mint-400 underline font-semibold">View Proof</a>
                        ) : (
                          <span className="text-ink/30">None</span>
                        )}
                      </td>
                      <td><StatusPill status={p.approvalStatus} /></td>
                      <td className="flex gap-2">
                        {p.approvalStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => review(p.id, 'APPROVED')}
                              className="text-mint-400 font-semibold hover:underline"
                              disabled={challenge.evidenceRequired && !p.proofUrl}
                              title={challenge.evidenceRequired && !p.proofUrl ? "Proof required" : ""}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => review(p.id, 'REJECTED')}
                              className="text-clay font-semibold hover:underline"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Leaderboard() {
  const [scope, setScope] = useState('employee');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/gamification/leaderboard?scope=${scope}`).then((r) => setRows(r.data)).finally(() => setLoading(false));
  }, [scope]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Leaderboard</h3>
        <div className="flex gap-1 bg-mint-400/10 rounded-lg p-1">
          {['employee', 'department'].map((s) => (
            <button key={s} onClick={() => setScope(s)} className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${scope === s ? 'bg-mint-400/15 border border-mint-400/25 text-mint-400' : 'text-ink/50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {loading ? <Loader /> : rows.length === 0 ? <EmptyState /> : (
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.id || r.departmentId} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-mint-400/[0.06]">
              <span className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-400 text-white' : 'bg-mint-400/10 text-mint-400'}`}>{i + 1}</span>
                <span className="font-medium">{scope === 'employee' ? r.name : r.departmentName}</span>
                {scope === 'employee' && <span className="text-ink/40 text-xs">{r.department?.name}</span>}
              </span>
              <span className="font-semibold text-amber-400">{scope === 'employee' ? r.xp : r.totalXp} XP</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Badges({ isAdmin }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', unlockRuleType: 'XP_THRESHOLD', unlockRuleValue: 50, icon: '🏅' });

  const load = () => {
    setLoading(true);
    api.get('/gamification/badges')
      .then((r) => setRows(r.data))
      .catch((err) => toast.push(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/gamification/badges', form); toast.push('Badge created'); setOpen(false); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Badge Catalog</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ New Badge</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rows.map((b) => (
            <div key={b.id} className="border border-line rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">{b.icon}</div>
              <p className="font-semibold text-sm">{b.name}</p>
              <p className="text-xs text-ink/40 mt-1">{b.description}</p>
              <p className="text-[10px] text-mint-400 mt-2 font-semibold uppercase tracking-wide">
                {b.unlockRuleType === 'XP_THRESHOLD' ? `${b.unlockRuleValue} XP` : `${b.unlockRuleValue} challenges`}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Badge">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unlock Rule</label>
              <select className="input" value={form.unlockRuleType} onChange={(e) => setForm({ ...form, unlockRuleType: e.target.value })}>
                <option value="XP_THRESHOLD">XP Threshold</option>
                <option value="CHALLENGE_COUNT">Challenge Count</option>
              </select>
            </div>
            <div><label className="label">Value</label><input className="input" type="number" value={form.unlockRuleValue} onChange={(e) => setForm({ ...form, unlockRuleValue: e.target.value })} /></div>
          </div>
          <div><label className="label">Icon (emoji)</label><input className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
          <button className="btn-primary mt-2">Save Badge</button>
        </form>
      </Modal>
    </div>
  );
}

function Rewards({ isAdmin, isEmployee }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', pointsRequired: 50, stock: 10 });

  const load = () => {
    setLoading(true);
    api.get('/gamification/rewards')
      .then((r) => setRows(r.data))
      .catch((err) => toast.push(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/gamification/rewards', form); toast.push('Reward added'); setOpen(false); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const redeem = async (id) => {
    try { await api.post(`/gamification/rewards/${id}/redeem`); toast.push('Reward redeemed!'); load(); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Rewards Catalog</h3>
        {isAdmin && <button className="btn-primary" onClick={() => setOpen(true)}>+ New Reward</button>}
      </div>
      {rows.length === 0 ? <EmptyState /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="border border-line rounded-xl p-4">
              <p className="font-semibold text-sm">{r.name}</p>
              <p className="text-xs text-ink/40 mt-1 mb-3">{r.description}</p>
              <div className="flex items-center justify-between">
                <span className="pill bg-amber-400/15 text-amber-400">{r.pointsRequired} pts</span>
                <span className="text-xs text-ink/40">{r.stock} in stock</span>
              </div>
              {isEmployee && (
                <button onClick={() => redeem(r.id)} disabled={r.stock <= 0} className="btn-secondary w-full mt-3 disabled:opacity-40">
                  {r.stock <= 0 ? 'Out of Stock' : 'Redeem'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Reward">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Points Required</label><input className="input" type="number" value={form.pointsRequired} onChange={(e) => setForm({ ...form, pointsRequired: e.target.value })} /></div>
            <div><label className="label">Stock</label><input className="input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          </div>
          <button className="btn-primary mt-2">Save Reward</button>
        </form>
      </Modal>
    </div>
  );
}