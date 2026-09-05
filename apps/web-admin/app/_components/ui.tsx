'use client';
import type { ReactNode } from 'react';

/**
 * Ortak görsel atomlar (Tailwind).
 *
 * Tüm sekmeler bunları paylaşır: bir kez Tailwind'e çevrildiğinde panel geneli
 * tutarlı görünüm kazanır. Mantık yok — yalnız sunum.
 */

export function PageHead({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">
        {title}
      </h1>
      {sub ? (
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">{sub}</p>
      ) : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 mt-8 text-ax-xs font-extrabold uppercase tracking-[1.2px] text-ink-3 first:mt-0">
      {children}
    </div>
  );
}

export function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 pb-3 pt-4 shadow-1 transition-shadow duration-150 hover:shadow-2">
      <div className="text-[28px] font-extrabold leading-[1.15] tracking-[-1px] tabular-nums text-ink">
        {v}
      </div>
      <div className="mt-1 text-ax-sm font-semibold text-ink-3">{l}</div>
    </div>
  );
}

/** Filtre çipi (aç/kapa) — panel genelinde sekme/filtre seçimlerinde kullanılır. */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-ax-sm font-semibold transition-colors duration-150 ${
        active
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line bg-surface text-ink-3 hover:border-ink-3 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** Yatay araç çubuğu (filtre/aksiyon satırı). */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

/** Beyaz yüzey kart. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-md border border-line bg-surface shadow-1 ${className}`}
    >
      {children}
    </div>
  );
}

/** Yükleniyor / boş durum. */
export function Loading({ label = 'Yükleniyor…' }: { label?: string }) {
  return <div className="py-16 text-center text-ax-md text-ink-3">{label}</div>;
}

/** Etiket–değer satırı (detay panellerinde). */
export function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="kv-k">{k}</div>
      <div className="kv-v">{v}</div>
    </div>
  );
}

/** Form alanı sarmalayıcısı: üstte etiket, altta girdi. */
export function F({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'full' : ''}>
      <div className="kv-k" style={{ marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
