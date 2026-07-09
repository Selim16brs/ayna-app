import type { MessageKey } from '@ayna/i18n';
import { ApiError } from './api';

// Kayıt/giriş hatasını SEBEBE ÖZEL kullanıcı mesajına çevirir (genel "bir hata oluştu" yerine).
// ApiError değilse (fetch reddetti) → ağ hatası; 5xx → sunucu; taken/validation ayrı.
export function registerErrorMessage(e: unknown, t: (k: MessageKey) => string): string {
  if (e instanceof ApiError) {
    if (e.code === 'PHONE_TAKEN' || e.code === 'EMAIL_TAKEN') return t('auth.error.taken');
    if (e.code === 'VALIDATION_ERROR') return t('auth.error.invalid');
    if (e.status >= 500) return t('auth.error.server');
    return t('common.error');
  }
  return t('auth.error.network');
}
