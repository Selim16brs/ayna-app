// §4.1 (adım 6) — randevu hatırlatmaları YEREL OS bildirimi.
// EK Z.5 — ayrıca sunucu-taraflı remote push (Expo push token kaydı + deep-link).
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from './api';
import type { Appointment } from './data';
import { REMIND_24H_MS, REMIND_2H_MS } from './data';
import { formatSlotTr } from './datetime';
import { fillParams } from './locale';

// Uygulama açıkken de bildirimi göster (foreground handler) — tek sefer kurulur.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permAsked = false;
async function ensurePermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (permAsked) return false;
    permAsked = true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

type Tr = (k: MessageKey) => string;

// Onaylı + gelecekteki randevular için 24s ve 2s YEREL bildirim planla (idempotent).
// Artık onaylı olmayan/iptal edilen randevuların planlı bildirimlerini temizler.
export async function syncBookingReminders(bookings: Appointment[], t: Tr): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    if (!(await ensurePermission())) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = new Set(scheduled.map((n) => n.identifier));
    const now = Date.now();
    const wanted = new Set<string>();

    for (const b of bookings) {
      if (b.status !== 'confirmed') continue;
      const plan: [tag: string, offset: number, titleKey: MessageKey, bodyKey: MessageKey][] = [
        ['24', REMIND_24H_MS, 'notif.remind_24', 'notif.remind_24_b'],
        ['2', REMIND_2H_MS, 'notif.remind_2', 'notif.remind_2_b'],
      ];
      for (const [tag, offset, titleKey, bodyKey] of plan) {
        const fireAt = b.startMs - offset;
        if (fireAt <= now) continue; // anı geçmiş → planlanmaz
        const id = `rem-${tag}-${b.id}`;
        wanted.add(id);
        if (existing.has(id)) continue; // zaten planlı
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: t(titleKey),
            body: fillParams(t(bodyKey), {
              pro: b.uzmanName ?? b.proName,
              slot: formatSlotTr(b.startMs),
            }),
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          trigger: { type: 'date', date: new Date(fireAt) } as any,
        });
      }
    }

    // Artık istenmeyen rem-* bildirimlerini iptal et (iptal/tamamlanan randevular)
    for (const n of scheduled) {
      if (n.identifier.startsWith('rem-') && !wanted.has(n.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // Bildirim planlaması best-effort — hata uygulamayı etkilemez
  }
}

// EK Z.5 — Expo push token al + backend'e kaydet (giriş sonrası). Best-effort.
export async function registerForRemotePush(authToken: string): Promise<void> {
  try {
    if (!Device.isDevice) return; // simülatör gerçek push token üretmez
    if (!(await ensurePermission())) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tok = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.registerPushToken(authToken, tok.data, Platform.OS);
  } catch {
    // Remote push opsiyonel — hata uygulamayı etkilemez
  }
}

// EK Z.5 — bildirime dokunma → DEEP-LINK (MD_000 satır 266: doğrudan ilgili ekrana).
export function addPushDeepLinkListener(onRoute: (route: string) => void) {
  return Notifications.addNotificationResponseReceivedListener((resp) => {
    const route = resp.notification.request.content.data?.route;
    if (typeof route === 'string' && route.startsWith('/')) onRoute(route);
  });
}
