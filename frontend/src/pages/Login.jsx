import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast, apiErrorMessage } from '../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.push(apiErrorMessage(err, 'Login failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-graphite-900">
      {/* Ambient mesh + drifting orbs, signature glass backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-mint-400/20 blur-[110px]" />
        <div className="absolute -bottom-40 -right-24 w-[480px] h-[480px] rounded-full bg-mint-700/25 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(184,247,228,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(184,247,228,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />
      </div>

      <div className="relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 rounded-[28px] overflow-hidden glass-strong shadow-glow">
        {/* Brand panel */}
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-between p-10 bg-gradient-to-br from-mint-950/60 via-graphite-800/40 to-transparent border-r border-mint-400/10">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-mint-400/15 border border-mint-400/25 flex items-center justify-center text-lg">🌿</span>
            <span className="font-display font-semibold text-lg text-ink tracking-tight">EcoSphere</span>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-mint-400/70 font-semibold mb-3">ESG Management Platform</p>
            <h1 className="font-display text-[2.35rem] leading-[1.08] font-semibold text-ink">
              One score for every pillar of impact.
            </h1>
            <p className="text-ink/55 mt-4 text-[15px] leading-relaxed max-w-xs">
              Emissions, participation, compliance, and engagement — rolled into a single
              live ESG score your whole org can see.
            </p>
          </div>
          <div className="flex items-center gap-6 text-ink/40 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mint-400" /> Environmental</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Social</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-clay" /> Governance</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="lg:col-span-3 flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
              <span className="w-8 h-8 rounded-lg bg-mint-400/15 border border-mint-400/25 flex items-center justify-center">🌿</span>
              <span className="font-display font-semibold text-lg text-ink">EcoSphere</span>
            </div>

            <h2 className="font-display text-2xl font-semibold text-ink mb-1">Welcome back</h2>
            <p className="text-sm text-ink/50 mb-8">Sign in to your ESG workspace.</p>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <button className="btn-primary w-full mt-2 py-2.5" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-xs text-ink/35 text-center mt-8 leading-relaxed">
              Ask your Admin for an account — accounts are created directly by the organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}