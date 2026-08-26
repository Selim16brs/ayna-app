import type { MessageKey } from '@ayna/i18n';
import type { TextInputProps } from 'react-native';

// Şifre yöneticisi / otomatik doldurma ipuçları (iOS textContentType + Android autoComplete).
// Kayıt alanlarına verilir → iOS/Android kayıtlı bilgiyi önerir, güçlü şifre üretir ve "kaydet" sorar.
export type AutofillKind = 'name' | 'email' | 'tel' | 'newPassword';
export function autofillProps(
  kind?: AutofillKind,
): Pick<TextInputProps, 'textContentType' | 'autoComplete'> {
  switch (kind) {
    case 'name':
      return { textContentType: 'name', autoComplete: 'name' };
    case 'email':
      return { textContentType: 'emailAddress', autoComplete: 'email' };
    case 'tel':
      return { textContentType: 'telephoneNumber', autoComplete: 'tel' };
    case 'newPassword':
      return { textContentType: 'newPassword', autoComplete: 'password-new' };
    default:
      return {};
  }
}

// Basit ama pratik e-posta format kontrolü (boşluk yok, @ ve nokta içeren alan).
export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// Şifre gücü: 0 (boş) · 1 zayıf · 2 orta · 3 güçlü. Uzunluk + karakter çeşitliliği.
export function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s += 1;
  if (pw.length >= 10) s += 1;
  const variety = [/[a-zA-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length;
  if (variety >= 2) s += 1;
  return Math.min(3, s) as 0 | 1 | 2 | 3;
}

export const PWD_LEVEL_KEY: Record<1 | 2 | 3, MessageKey> = {
  1: 'pwd.weak',
  2: 'pwd.medium',
  3: 'pwd.strong',
};

// Eksik zorunlu alanların etiket anahtarları (kayıt butonu pasifken kullanıcıya gösterilir).
export function missingLabels(reqs: { ok: boolean; key: MessageKey }[]): MessageKey[] {
  return reqs.filter((r) => !r.ok).map((r) => r.key);
}
