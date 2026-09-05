// §4.1 (adım 6) — randevu hatırlatmaları YEREL OS bildirimi.
// EK Z.5 — ayrıca sunucu-taraflı remote push (Expo push token kaydı + deep-link).
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from './api';
import type { Appointment } from './data';
import { REMIND_1H_MS, REMIND_30M_MS, REMIND_FREE_CANCEL_MS } from './data';
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

/**
 * §16 — İZİN YALNIZ DEĞER BELLİ OLUNCA İSTENİR.
 *
 * `sor=false` (varsayılan): izin VARSA true, YOKSA sistem diyaloğunu AÇMADAN
 * false. `sor=true`: gerçekten sorar.
 *
 * Neden ayrıldı: `registerForRemotePush` girişten hemen sonra çalışıyordu ve
 * izni ORADA istiyordu — yani kullanıcı kayıt olur olmaz, henüz hiçbir
 * bildirimin ne işe yarayacağını görmeden sistem diyaloğuyla karşılaşıyordu.
 * Denetim bunu açıkça yasaklıyor: izin, ilk talep oluşturulduktan ya da ilk
 * randevu onaylandıktan sonra istenmeli.
 *
 * Reddedilirse tekrar tekrar sorulmuyor (`permAsked`).
 */
async function ensurePermission(sor = false): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!sor || permAsked) return false;
    permAsked = true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/**
 * Bildirim iznini ŞİMDİ iste — değeri gösteren bir aksiyon tamamlandığında.
 *
 * Çağrıldığı yerler: ilk talep yayınlandığında, ilk randevu onaylandığında.
 * İzin zaten varsa ya da daha önce reddedildiyse sessizce geçer.
 */
export async function bildirimIzniIste(authToken: string | null): Promise<void> {
  if (!(await ensurePermission(true))) return;
  if (authToken) await registerForRemotePush(authToken);
}

type Tr = (k: MessageKey) => string;

// Onaylı + gelecekteki randevular için 24s ve 2s YEREL bildirim planla (idempotent).
// Artık onaylı olmayan/iptal edilen randevuların planlı bildirimlerini temizler.
/**
 * ÇÖKME DÜZELTMESİ — bu fonksiyon ÜST ÜSTE çalışamaz.
 *
 * Kanıt: TestFlight 0.0.0/build 3 çökme kaydı (31.08.2026, EXC_BAD_ACCESS /
 * SIGSEGV). JS iş parçacığı bir promise devamında `Array.prototype.map`
 * içindeyken, `com.meta.react.turbomodulemanager.queue` AYNI ANDA Hermes'in
 * içindeydi: `convertNSExceptionToJSError` → `JSError::JSError` →
 * `DictPropertyMap::lookupEntryFor`. Yani bir native metot ObjC istisnası
 * fırlattı ve React Native onu JS hatasına çevirirken Hermes'e ARKA PLAN
 * KUYRUĞUNDAN girdi. Hermes iş parçacığı güvenli değildir → bellek bozulması.
 *
 * Tetikleyici: `_layout` bu fonksiyonu `bookings` HER değiştiğinde çağırıyor.
 * Onay akışında liste arka arkaya iki kez değişiyor (önce yerel `set`, sonra
 * `hydrateBookings`), dolayısıyla iki çalıştırma üst üste biniyor: ikisi de
 * aynı `rem-*` kimliğini iptal etmeye çalışıyor ve ikincisi artık var olmayan
 * bir kimliğe gidiyor.
 *
 * NOT: aşağıdaki `try/catch` bunu YAKALAYAMAZ — native ObjC istisnası bir JS
 * istisnası değildir; JS'e ulaşmadan runtime'ı bozuyor. Bu yüzden çözüm hatayı
 * yakalamak değil, KOŞULU ortadan kaldırmak: çağrılar sıraya alınıyor.
 */
let senkronCalisiyor = false;
let bekleyenSenkron: [Appointment[], Tr] | null = null;

export async function syncBookingReminders(bookings: Appointment[], t: Tr): Promise<void> {
  // Zaten çalışıyorsa yeni çağrı SIRAYA girer; en son liste kazanır.
  if (senkronCalisiyor) {
    bekleyenSenkron = [bookings, t];
    return;
  }
  senkronCalisiyor = true;
  try {
    let arg: [Appointment[], Tr] | null = [bookings, t];
    while (arg) {
      await senkronEt(arg[0], arg[1]);
      arg = bekleyenSenkron;
      bekleyenSenkron = null;
    }
  } finally {
    senkronCalisiyor = false;
  }
}

async function senkronEt(bookings: Appointment[], t: Tr): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    if (!(await ensurePermission())) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = new Set(scheduled.map((n) => n.identifier));
    const now = Date.now();
    const wanted = new Set<string>();

    for (const b of bookings) {
      /*
       * MÜŞTERİ HATIRLATMALARI — uzmanın cihazında planlanmıyor.
       *
       * Sağlayıcı olduğu randevular aynı listede (`benimRolum: 'uzman'`)
       * ve buradan da geçiyordu: uzmanın telefonuna "Ücretsiz iptal için
       * son şans" düşüyordu. Kendi müşterisinin randevusu için anlamsız.
       */
      if (b.benimRolum === 'uzman') continue;
      if (b.status !== 'kesinlesti') continue;
      const plan: [tag: string, offset: number, titleKey: MessageKey, bodyKey: MessageKey][] = [
        // §4.5 sırası: ücretsiz iptal uyarısı → 1 saat → 30 dakika.
        ['iptal', REMIND_FREE_CANCEL_MS, 'notif.free_cancel', 'notif.free_cancel_b'],
        ['1s', REMIND_1H_MS, 'notif.remind_1h', 'notif.remind_1h_b'],
        ['30d', REMIND_30M_MS, 'notif.remind_30m', 'notif.remind_30m_b'],
      ];
      for (const [tag, offset, titleKey, bodyKey] of plan) {
        const fireAt = b.startMs - offset;
        if (fireAt <= now) continue; // anı geçmiş → planlanmaz
        const id = `rem-${tag}-${b.id}`;
        wanted.add(id);
        if (existing.has(id)) continue; // zaten planlı
        try {
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
        } catch {
          // Tek bir planlama düşerse diğerleri yine kurulsun.
        }
      }
    }

    // Artık istenmeyen rem-* bildirimlerini iptal et (iptal/tamamlanan randevular)
    for (const n of scheduled) {
      if (n.identifier.startsWith('rem-') && !wanted.has(n.identifier)) {
        try {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        } catch {
          // Kimlik bu arada başka bir turda iptal edilmiş olabilir — yut.
        }
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
// Uygulama AÇIKKEN push düşerse çağrılır — ekranlar yenileme beklemeden tazelenir
// (MD_000 §4.2: "uzman ekranı açıkken yeni talep anında düşer").
/**
 * Uygulama AÇIKKEN gelen push.
 *
 * Eskiden yalnız "bir şey oldu" sinyali veriyordu (listeler tazelensin diye)
 * ve bildirimin KENDİSİ atılıyordu. Sonuç: uygulama içindeki bildirim
 * listesi yalnız KULLANICININ KENDİ yaptıklarını gösteriyordu — karşı
 * tarafın yaptığı hiçbir şey (uzman onayladı, teklif geldi) orada
 * görünmüyordu. Push kapalıysa ya da kaçırıldıysa hiçbir iz kalmıyordu.
 *
 * Artık başlık/gövde ve varsa hedef ekran da veriliyor; çağıran bunu
 * uygulama içi listeye yazıyor. Uydurma değil: sunucunun gerçekten
 * gönderdiği bildirimin ta kendisi.
 */
export function addPushReceivedListener(
  onReceive: (bildirim: { title: string; body: string; route?: string }) => void,
) {
  return Notifications.addNotificationReceivedListener((n) => {
    const icerik = n.request.content;
    const route = icerik.data?.route;
    onReceive({
      title: icerik.title ?? '',
      body: icerik.body ?? '',
      ...(typeof route === 'string' && route.startsWith('/') ? { route } : {}),
    });
  });
}

export function addPushDeepLinkListener(onRoute: (route: string) => void) {
  return Notifications.addNotificationResponseReceivedListener((resp) => {
    const route = resp.notification.request.content.data?.route;
    if (typeof route === 'string' && route.startsWith('/')) onRoute(route);
  });
}
