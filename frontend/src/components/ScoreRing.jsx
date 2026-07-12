import React from 'react';

// Signature visual: three concentric arcs (Environmental / Social / Governance)
// wrapping an overall score, so the composition itself explains the roll-up.
export default function ScoreRing({ environmental = 0, social = 0, governance = 0, overall = 0, size = 180 }) {
  const rings = [
    { value: environmental, color: '#2F6844', r: size * 0.46 },
    { value: social, color: '#C98A3E', r: size * 0.36 },
    { value: governance, color: '#B75B45', r: size * 0.26 }
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
              <circle cx={c} cy={c} r={ring.r} fill="none" stroke="#E4E0D6" strokeWidth={8} />
              <circle
                cx={c}
                cy={c}
                r={ring.r}
                fill="none"
                stroke={ring.color}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
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
    { label: 'Environmental', color: '#2F6844' },
    { label: 'Social', color: '#C98A3E' },
    { label: 'Governance', color: '#B75B45' }
  ];
  return (
    <div className="flex flex-col gap-2 text-sm">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
          <span className="text-ink/70">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
