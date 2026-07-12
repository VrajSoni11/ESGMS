import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader, Loader } from '../components/ui';

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState({ environmental: 0.4, social: 0.3, governance: 0.3 });
  const [toggles, setToggles] = useState({ autoEmissionCalculation: true, evidenceRequirement: true, badgeAutoAward: true });
  const [channels, setChannels] = useState({ inApp: true, email: false });

  const load = () => {
    setLoading(true);
    api.get('/settings').then((r) => {
      setSettings(r.data);
      if (r.data.esg_weights) setWeights(r.data.esg_weights);
      if (r.data.feature_toggles) setToggles(r.data.feature_toggles);
      if (r.data.notification_channels) setChannels(r.data.notification_channels);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const saveWeights = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings/esg-weights', weights);
      toast.push('ESG weightings updated');
    } catch (err) { toast.push(apiErrorMessage(err), 'error'); }
  };

  const toggle = async (key) => {
    const updated = { ...toggles, [key]: !toggles[key] };
    setToggles(updated);
    try { await api.put('/settings/feature-toggles', { [key]: updated[key] }); toast.push('Setting updated'); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); load(); }
  };

  const toggleChannel = async (key) => {
    const updated = { ...channels, [key]: !channels[key] };
    setChannels(updated);
    try { await api.put('/settings/notification-channels', { [key]: updated[key] }); toast.push('Setting updated'); }
    catch (err) { toast.push(apiErrorMessage(err), 'error'); load(); }
  };

  if (loading) return <Loader />;

  const sum = (Number(weights.environmental) + Number(weights.social) + Number(weights.governance)).toFixed(2);

  return (
    <div>
      <PageHeader title="Settings" sub="ESG scoring weightings, feature toggles, and notification channels." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-display font-semibold mb-1">ESG Pillar Weightings</h3>
          <p className="text-xs text-ink/40 mb-4">Must sum to 1.0 (100%). Current total: <span className={sum === '1.00' ? 'text-mint-400 font-semibold' : 'text-clay font-semibold'}>{sum}</span></p>
          <form onSubmit={saveWeights} className="flex flex-col gap-3">
            {['environmental', 'social', 'governance'].map((key) => (
              <div key={key}>
                <label className="label capitalize">{key} ({Math.round(weights[key] * 100)}%)</label>
                <input
                  type="range" min="0" max="1" step="0.05" value={weights[key]}
                  onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })}
                  className="w-full accent-mint-400"
                />
              </div>
            ))}
            <button className="btn-primary mt-2" disabled={sum !== '1.00'}>Save Weightings</button>
          </form>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card">
            <h3 className="font-display font-semibold mb-4">Feature Toggles</h3>
            <ToggleRow label="Auto Emission Calculation" sub="Auto-calculate CO2e from quantity × emission factor" checked={toggles.autoEmissionCalculation} onChange={() => toggle('autoEmissionCalculation')} />
            <ToggleRow label="Evidence Requirement" sub="Require proof file before approving CSR/Challenge submissions" checked={toggles.evidenceRequirement} onChange={() => toggle('evidenceRequirement')} />
            <ToggleRow label="Badge Auto-Award" sub="Automatically award badges when unlock rules are met" checked={toggles.badgeAutoAward} onChange={() => toggle('badgeAutoAward')} />
          </div>

          <div className="card">
            <h3 className="font-display font-semibold mb-4">Notification Channels</h3>
            <ToggleRow label="In-App Notifications" sub="Show notifications inside the platform" checked={channels.inApp} onChange={() => toggleChannel('inApp')} />
            <ToggleRow label="Email Notifications" sub="Send notifications via email (requires SMTP config)" checked={channels.email} onChange={() => toggleChannel('email')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-3 border-b border-line last:border-0 cursor-pointer">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink/40">{sub}</span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <span className="w-10 h-6 bg-line rounded-full peer-checked:bg-mint-400 transition-colors" />
        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}