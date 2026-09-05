'use client';
import { sectorLabel } from '../_lib/ortak';

/** Günlük seyir grafiği — saf SVG, kütüphane yok. */
export function BarChart({
  points,
  color,
  format,
}: {
  points: { label: string; value: number }[];
  color: string;
  format: (n: number) => string;
}) {
  const W = 900;
  const H = 220;
  const pad = { l: 8, r: 8, t: 16, b: 26 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = points.length;
  const gap = n > 40 ? 1 : 3;
  const bw = innerW / n - gap;
  // eksende ~8 etiket göster (kalabalığı önle)
  const labelEvery = Math.ceil(n / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Günlük grafik">
      {[0, 0.5, 1].map((g) => {
        const y = pad.t + innerH * (1 - g);
        return (
          <g key={g}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#ebe6e3" strokeWidth={1} />
            <text x={W - pad.r} y={y - 3} fontSize={10} fill="#8b8479" textAnchor="end">
              {format(Math.round(max * g))}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => {
        const h = (p.value / max) * innerH;
        const x = pad.l + i * (innerW / n) + gap / 2;
        const y = pad.t + innerH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={Math.max(bw, 1)} height={h} rx={2} fill={color}>
              <title>
                {p.label}: {format(p.value)}
              </title>
            </rect>
            {i % labelEvery === 0 ? (
              <text x={x + bw / 2} y={H - 8} fontSize={10} fill="#8b8479" textAnchor="middle">
                {p.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Kategori dağılımı — yatay çubuklar (uzman havuzu). */
export function CategoryBars({ items }: { items: { sector: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <div className="empty">Veri yok</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((i) => (
        <div key={i.sector} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 96, fontSize: 13, fontWeight: 600 }}>{sectorLabel(i.sector)}</div>
          <div style={{ flex: 1, background: '#f2eff1', borderRadius: 999, height: 14 }}>
            <div
              style={{
                width: `${(i.count / max) * 100}%`,
                background: '#cc6b86',
                borderRadius: 999,
                height: 14,
                minWidth: 6,
              }}
            />
          </div>
          <div style={{ width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
            {i.count}
          </div>
        </div>
      ))}
    </div>
  );
}
