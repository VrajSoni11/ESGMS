import React from 'react';

// Signature visual: three concentric arcs (Environmental / Social / Governance)
// wrapping an overall score, so the composition itself explains the roll-up.
export default function ScoreRing({ environmental = 0, social = 0, governance = 0, overall = 0, size = 180 }) {
  const rings = [
    { value: environmental, color: '#B8F7E4', r: size * 0.46 },
    { value: social, color: '#F0C177', r: size * 0.36 },
    { value: governance, color: '#E38A78', r: size * 0.26 }
  ];
  const c = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {rings.map((ring, i) => {
          const circumference = 2 * Math.PI * ring.r;
          const dash = (Math.min(Math.max(ring.value, 0), 100) / 100) * circumference;
          return (
            <g key={i}>
              <circle cx={c} cy={c} r={ring.r} fill="none" stroke="rgba(184,247,228,0.08)" strokeWidth={8} />
              <circle
                cx={c}
                cy={c}
                r={ring.r}
                fill="none"
                stroke={ring.color}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.6s ease', filter: `drop-shadow(0 0 6px ${ring.color}66)` }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl font-bold text-ink">{Math.round(overall)}</span>
        <span className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold">ESG Score</span>
      </div>
    </div>
  );
}

export function ScoreLegend() {
  const items = [
    { label: 'Environmental', color: '#B8F7E4' },
    { label: 'Social', color: '#F0C177' },
    { label: 'Governance', color: '#E38A78' }
  ];
  return (
    <div className="flex flex-col gap-2 text-sm">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: it.color, boxShadow: `0 0 8px ${it.color}88` }} />
          <span className="text-ink/70">{it.label}</span>
        </div>
      ))}
    </div>
  );
}