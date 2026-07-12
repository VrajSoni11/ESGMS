import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHeader, StatCard, Loader, StatusPill, EmptyState } from '../components/ui';
import ScoreRing, { ScoreLegend } from '../components/ScoreRing';

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === 'EMPLOYEE' ? <EmployeeDashboard /> : <AdminDashboard />;
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState title="Couldn't load the dashboard" />;

  const overall = data.overallEsgScore;

  return (
    <div>
      <PageHeader title="Organization Dashboard" sub="Live roll-up across Environmental, Social, and Governance pillars." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="card flex items-center gap-6 lg:col-span-1">
          <ScoreRing
            environmental={overall.environmentalAvg}
            social={overall.socialAvg}
            governance={overall.governanceAvg}
            overall={overall.overallScore}
            size={140}
          />
          <div>
            <ScoreLegend />
            <p className="text-xs text-ink/40 mt-3">
              Weights: E {Math.round(overall.weights.environmental * 100)}% · S {Math.round(overall.weights.social * 100)}% · G {Math.round(overall.weights.governance * 100)}%
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard label="Active Employees" value={data.stats.totalEmployees} />
          <StatCard label="Total CO2e" value={`${data.stats.totalCo2e} kg`} accent="clay" />
          <StatCard label="Active Challenges" value={data.stats.activeChallenges} accent="amber" />
          <StatCard
            label="Pending Approvals"
            value={data.stats.pendingCsrApprovals + data.stats.pendingChallengeApprovals}
            sub={`${data.stats.pendingCsrApprovals} CSR · ${data.stats.pendingChallengeApprovals} Challenges`}
            accent="amber"
          />
          <StatCard label="Open Compliance Issues" value={data.stats.openComplianceIssues} />
          <StatCard label="Overdue Issues" value={data.stats.overdueComplianceIssues} accent={data.stats.overdueComplianceIssues > 0 ? 'clay' : 'forest'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-display font-semibold mb-4">Department Scores</h3>
          {data.departmentScores.length === 0 ? (
            <EmptyState title="No department scores yet" sub="Scores populate once departments have transactions." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>E</th>
                  <th>S</th>
                  <th>G</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.departmentScores.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.department?.name}</td>
                    <td>{Number(d.environmentalScore).toFixed(1)}</td>
                    <td>{Number(d.socialScore).toFixed(1)}</td>
                    <td>{Number(d.governanceScore).toFixed(1)}</td>
                    <td className="font-semibold text-mint-400">{Number(d.totalScore).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Top Employees by XP</h3>
            <Link to="/gamification" className="text-xs font-semibold text-mint-400 hover:underline">View leaderboard →</Link>
          </div>
          {data.topEmployees.length === 0 ? (
            <EmptyState title="No employee activity yet" />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.topEmployees.map((e, i) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-mint-400/10 text-mint-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span>
                      <span className="font-medium">{e.name}</span>
                      <span className="text-ink/40 ml-2 text-xs">{e.department?.name || '—'}</span>
                    </span>
                  </span>
                  <span className="font-semibold text-amber-400">{e.xp} XP</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/my-dashboard').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState title="Couldn't load your dashboard" />;

  return (
    <div>
      <PageHeader title={`Welcome, ${data.user.name.split(' ')[0]}`} sub="Your personal ESG participation snapshot." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="XP" value={data.user.xp} accent="amber" />
        <StatCard label="Points Balance" value={data.user.pointsBalance} accent="forest" />
        <StatCard label="Leaderboard Rank" value={`#${data.leaderboardRank}`} />
        <StatCard label="Pending Policy Acks" value={data.pendingPolicyAcknowledgements} accent={data.pendingPolicyAcknowledgements > 0 ? 'clay' : 'forest'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <h3 className="font-display font-semibold mb-4">Badges Earned</h3>
          {data.badges.length === 0 ? (
            <EmptyState title="No badges yet" sub="Complete challenges and CSR activities to earn badges." />
          ) : (
            <div className="flex flex-wrap gap-3">
              {data.badges.map((b) => (
                <div key={b.id} className="flex flex-col items-center text-center w-20">
                  <span className="text-3xl">{b.badge.icon}</span>
                  <span className="text-xs font-medium mt-1">{b.badge.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">My Challenges</h3>
          {data.challengeParticipations.length === 0 ? (
            <EmptyState title="No challenges joined yet" sub="Head to Gamification → Challenges to join one." />
          ) : (
            <table className="table-shell">
              <thead>
                <tr><th>Challenge</th><th>Progress</th><th>Status</th><th>XP</th></tr>
              </thead>
              <tbody>
                {data.challengeParticipations.map((c) => (
                  <tr key={c.id}>
                    <td>{c.challenge.title}</td>
                    <td>{c.progress}%</td>
                    <td><StatusPill status={c.approvalStatus} /></td>
                    <td>{c.xpAwarded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card lg:col-span-3">
          <h3 className="font-display font-semibold mb-4">My CSR Participations</h3>
          {data.csrParticipations.length === 0 ? (
            <EmptyState title="No CSR activity submissions yet" />
          ) : (
            <table className="table-shell">
              <thead>
                <tr><th>Activity</th><th>Status</th><th>Points Earned</th></tr>
              </thead>
              <tbody>
                {data.csrParticipations.map((p) => (
                  <tr key={p.id}>
                    <td>{p.activity.title}</td>
                    <td><StatusPill status={p.approvalStatus} /></td>
                    <td>{p.pointsEarned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}