import base from '@ayna/config/eslint';

export default [
  ...base,
  {
    // RN'de statik asset'ler require() ile yüklenir (Metro şartı) — mobilde kural kapalı
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
