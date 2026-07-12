import React, { useState } from 'react';
import api from '../api/client';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { PageHeader } from '../components/ui';

const PREBUILT = [
  { key: 'environmental', label: 'Environmental Report', icon: '🌍', desc: 'All carbon transactions with source and department breakdown.' },
  { key: 'social', label: 'Social Report', icon: '🤝', desc: 'CSR participation records with approval status and points.' },
  { key: 'governance', label: 'Governance Report', icon: '⚖️', desc: 'Compliance issues with severity, owner, and due dates.' },
  { key: 'esg-summary', label: 'ESG Summary Report', icon: '📊', desc: 'Department scores plus org-wide weighted overall score.' }
];

export default function Reports() {
  const toast = useToast();
  const [format, setFormat] = useState('csv');
  const [downloading, setDownloading] = useState('');
  const [custom, setCustom] = useState({ module: 'environmental', departmentId: '', startDate: '', endDate: '' });

  const download = async (url, filename) => {
    setDownloading(url);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.push('Report downloaded');
    } catch (err) {
      toast.push(apiErrorMessage(err, 'Failed to generate report'), 'error');
    } finally {
      setDownloading('');
    }
  };

  const ext = format === 'excel' ? 'xlsx' : format;

  return (
    <div>
      <PageHeader title="Reports" sub="Pre-built exports and a custom report builder." />

      <div className="card mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Export Format</h3>
          <div className="flex gap-1 bg-forest-50 rounded-lg p-1">
            {['csv', 'excel', 'pdf'].map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase ${format === f ? 'bg-white shadow-sm text-forest-700' : 'text-ink/50'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PREBUILT.map((r) => (
            <div key={r.key} className="border border-line rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl">{r.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-xs text-ink/40 mt-0.5">{r.desc}</p>
                <button
                  onClick={() => download(`/reports/${r.key}?format=${format}`, `${r.key}_report.${ext}`)}
                  disabled={downloading === `/reports/${r.key}?format=${format}`}
                  className="btn-secondary mt-3 text-xs"
                >
                  {downloading === `/reports/${r.key}?format=${format}` ? 'Generating…' : `Download ${format.toUpperCase()}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold mb-1">Custom Report Builder</h3>
        <p className="text-xs text-ink/40 mb-4">Filter by module, department, and date range.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="label">Module</label>
            <select className="input" value={custom.module} onChange={(e) => setCustom({ ...custom, module: e.target.value })}>
              <option value="environmental">Environmental</option>
              <option value="social">Social</option>
              <option value="governance">Governance</option>
              <option value="gamification">Gamification</option>
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input className="input" type="date" value={custom.startDate} onChange={(e) => setCustom({ ...custom, startDate: e.target.value })} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input className="input" type="date" value={custom.endDate} onChange={(e) => setCustom({ ...custom, endDate: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                const params = new URLSearchParams({ module: custom.module, format });
                if (custom.startDate) params.set('startDate', custom.startDate);
                if (custom.endDate) params.set('endDate', custom.endDate);
                download(`/reports/custom?${params.toString()}`, `custom_report.${ext}`);
              }}
              className="btn-primary w-full"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
