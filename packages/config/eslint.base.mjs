// @ayna/config — paylaşılan ESLint flat config (bkz. docs/planning/06-coding-standards.md)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // `== null` / `!= null` deyimine izin ver (hem null hem undefined kontrolü — kasıtlı);
      // diğer tüm gevşek karşılaştırmalar hata olarak kalır.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
);
