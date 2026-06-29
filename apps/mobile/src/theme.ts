// AYNA marka teması — premium, modern, kadınsı (docs/planning/02 packages/ui ileride genişler)
export const theme = {
  colors: {
    bg: '#1E1B2E',
    surface: '#2A2640',
    surfaceAlt: '#332E4D',
    primary: '#E8B4B8', // rose
    accent: '#C9A36B', // soft gold
    text: '#F5F3F7',
    muted: '#A39FB8',
    border: '#3D3856',
  },
  radius: { sm: 10, md: 16, lg: 24, pill: 999 },
  spacing: (n: number) => n * 8,
} as const;

export type Theme = typeof theme;
