import type { MessageKey } from '@ayna/i18n';
import { ApiError, NetworkError } from './api';

// Kayıt/giriş hatasını SEBEBE ÖZEL kullanıcı mesajına çevirir (genel "bir hata oluştu" yerine).
// ApiError → sunucu yanıt verdi (taken/validation/5xx). NetworkError → sunucuya ulaşılamadı ya da
// zaman aşımı; telefonun interneti çalışıyor olsa bile olabileceği için tek suçlu "internet" değil.
export function registerErrorMessage(e: unknown, t: (k: MessageKey) => string): string {
  if (e instanceof ApiError) {
    if (e.code === 'PHONE_TAKEN' || e.code === 'EMAIL_TAKEN') return t('auth.error.taken');
    if (e.code === 'DEVICE_BANNED') return t('auth.error.device_banned');
    if (e.code === 'INVALID_CODE' || e.code === 'CODE_REQUIRED')
      return t('auth.error.invalid_code');
    if (e.code === 'VALIDATION_ERROR') return t('auth.error.invalid');
    if (e.status >= 500) return t('auth.error.server');
    return t('common.error');
  }
  if (e instanceof NetworkError && e.reason === 'timeout') return t('auth.error.timeout');
  return t('auth.error.network');
}
