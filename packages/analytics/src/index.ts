/**
 * @ayna/analytics — güvenli analytics wrapper.
 * Gizlilik kuralı (docs/security/03-data-classification.md, EK I.2):
 * koordinat, sağlık, regl, yorum metni, telefon, e-posta, tam adres ASLA gönderilmez.
 * Yasaklı alan tespit edilirse event REDDEDİLİR (fail-fast).
 */

/** Güvenli event adları — EK I.1 */
export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_completed'
  | 'trusted_contact_added'
  | 'professional_viewed'
  | 'friend_signal_viewed'
  | 'booking_started'
  | 'booking_confirmed'
  | 'safety_share_enabled'
  | 'safety_share_started'
  | 'safety_share_stopped'
  | 'booking_checked_in'
  | 'booking_completed'
  | 'review_started'
  | 'review_submitted'
  | 'review_published'
  | 'campaign_applied'
  | 'referral_completed'
  | 'circle_post_created'
  | 'recommendation_requested'
  | 'recommendation_received'
  | 'care_reminder_opened';

/** Payload'da görülmesi yasak alan adları (S2/S3). */
const FORBIDDEN_KEYS = [
  'phone',
  'phone_e164',
  'email',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'coordinates',
  'location',
  'address',
  'comment',
  'review',
  'cycle',
  'mood',
  'health',
  'allergy',
  'name',
];

export class ForbiddenAnalyticsFieldError extends Error {
  readonly code = 'ANALYTICS_FORBIDDEN_FIELD';
  constructor(readonly field: string) {
    super(`Analytics payload yasaklı alan içeriyor: ${field}`);
    this.name = 'ForbiddenAnalyticsFieldError';
  }
}

export type AnalyticsProps = Record<string, string | number | boolean | null>;

export interface AnalyticsSink {
  capture(event: AnalyticsEvent, props: AnalyticsProps): void;
}

export function assertSafeProps(props: AnalyticsProps): void {
  for (const key of Object.keys(props)) {
    if (FORBIDDEN_KEYS.includes(key.toLowerCase())) {
      throw new ForbiddenAnalyticsFieldError(key);
    }
  }
}

/** Güvenli capture: yasaklı alan varsa fırlatır, yoksa sink'e iletir. */
export function createAnalytics(sink: AnalyticsSink) {
  return {
    capture(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
      assertSafeProps(props);
      sink.capture(event, props);
    },
  };
}
