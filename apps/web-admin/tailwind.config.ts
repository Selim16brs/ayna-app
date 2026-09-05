import type { Config } from 'tailwindcss';

/**
 * AYNA Admin — Tailwind yapılandırması.
 *
 * TEK TEMA KAYNAĞI globals.css'teki :root değişkenleridir. Buradaki renkler
 * o değişkenlere BAĞLANIR (kopyalanmaz) — böylece tema tek yerden değişir ve
 * `bg-accent` / `text-ink` / `border-line` gibi utility'ler aynı paleti kullanır.
 *
 * preflight KAPALI: mevcut globals.css kendi reset'ine sahip ve 5000 satır JSX
 * eski class'lara güveniyor; Tailwind'in base reset'i onları bozardı.
 */
export default {
  content: ['./app/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-alt': 'var(--bg-alt)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        'line-2': 'var(--line-2)',
        'nav-bg': 'var(--nav-bg)',
        'nav-bg-2': 'var(--nav-bg-2)',
        'nav-ink': 'var(--nav-ink)',
        'nav-ink-2': 'var(--nav-ink-2)',
        'nav-line': 'var(--nav-line)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ink': 'var(--accent-ink)',
        'on-accent': 'var(--on-accent)',
        ok: 'var(--ok)',
        'ok-soft': 'var(--ok-soft)',
        warn: 'var(--warn)',
        'warn-soft': 'var(--warn-soft)',
        err: 'var(--err)',
        'err-soft': 'var(--err-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },
      boxShadow: {
        1: 'var(--sh-1)',
        2: 'var(--sh-2)',
        3: 'var(--sh-3)',
      },
      fontSize: {
        'ax-xs': '11px',
        'ax-sm': '12.5px',
        'ax-md': '14px',
        'ax-lg': '16px',
        'ax-xl': '20px',
        'ax-2xl': '26px',
        'ax-3xl': '32px',
      },
      fontFamily: {
        ui: ['var(--font-ui)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
