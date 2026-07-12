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
    <div className="min-h-screen flex bg-forest-900">
      <div className="hidden lg:flex flex-1 flex-col justify-between p-14 text-white bg-[radial-gradient(circle_at_top_left,_#204A31,_#0F1712)]">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌿</span>
          <span className="font-display font-semibold text-lg">EcoSphere</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight max-w-md">
            One dashboard for every ESG pillar.
          </h1>
          <p className="text-forest-100/70 mt-4 max-w-sm">
            Track emissions, employee participation, governance compliance, and gamified
            engagement — all rolled up into one live ESG score.
          </p>
        </div>
        <p className="text-forest-100/40 text-xs">EcoSphere ESG Management Platform</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <span className="text-2xl">🌿</span>
            <span className="font-display font-semibold text-lg">EcoSphere</span>
          </div>
          <div className="card">
            <h2 className="font-display text-xl font-semibold mb-1">Welcome back</h2>
            <p className="text-sm text-ink/50 mb-6">Sign in to your ESG workspace.</p>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <button className="btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
          <p className="text-xs text-ink/40 text-center mt-6">
            Ask your Admin for an account — accounts are created directly by the organization.
          </p>
        </div>
      </div>
    </div>
  );
}
