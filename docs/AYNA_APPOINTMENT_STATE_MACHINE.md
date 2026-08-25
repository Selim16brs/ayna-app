# AYNA Randevu Durum Makinesi (Faz 1 — güncel uygulama)

Plan §4'teki hedef modelin mevcut koda eşlemesi. Kaynak: `apps/api/prisma/schema.prisma BookingStatus`, geçiş kuralları `apps/api/src/bookings/bookings.service.ts`, süre aşımı `bookings.scheduler.ts`, iptal politikası `bookings.policy.ts`.

## Durumlar ve plan eşlemesi

| Plan durumu                    | Koddaki karşılık                                         | Not                                                                                                    |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| REQUESTED                      | `awaiting_provider`                                      | Talep; slot İŞGAL ETMEZ (ters pazaryeri — aynı slota çok talep gelebilir, uzman seçer)                 |
| HELD                           | `deposit_pending`                                        | Uzman onayı = atomik kilit anı; `depositDeadline = +3 saat` fiilî hold penceresi (admin ayarı adayı)   |
| DEPOSIT_PENDING                | `deposit_submitted`                                      | Dekont yüklendi, uzman teyidi bekleniyor                                                               |
| CONFIRMED                      | `confirmed`                                              | Dekont teyit edildi                                                                                    |
| EXPIRED                        | `expired` _(Faz 1'de eklendi)_                           | Sunucu işi düşürür: yanıt 6 sa / dekont 3 sa                                                           |
| ALTERNATIVE_PROPOSED           | `alternative_proposed`                                   | Karşı öneri turu `propose/accept/counter`                                                              |
| REJECTED / CANCELLED           | `cancelled` (+`cancelReason`)                            | Aktör bilgisi reason'da; ayrı aktör-durumları Faz 2+ adayı                                             |
| PAYMENT_REJECTED               | teyit reddi → `deposit_pending`'e döner                  |                                                                                                        |
| NO_SHOW_REPORTED               | `no_show`                                                | Teyit penceresi Faz 2'de eklenecek (`completed`/`no_show` şu an uzman beyanı + `disputed` itiraz yolu) |
| COMPLETED_PENDING_CONFIRMATION | — (Faz 2)                                                |                                                                                                        |
| DISPUTED                       | `disputed`                                               | Finansal kayıt admin çözümüne kadar dondurulur                                                         |
| REASSIGNMENT_REQUIRED          | `reassigned_pending`                                     | Müşteri onayı olmadan uzman değişmez                                                                   |
| (bekleme listesi)              | `waitlist`                                               | Slot boşalınca sıralı push; ilk onaylayan approve'daki atomik kilitten geçer                           |
| (iade)                         | `refund_pending → refund_submitted → cancelled/disputed` | Plan §11 REQUESTED/PROOF_SUBMITTED/... eşleniği                                                        |

## Geçiş kuralları (uygulanmış)

```text
awaiting_provider ─uzman onayı (TX + pg_advisory_xact_lock(proId) + çakışma kontrolü)→ deposit_pending
awaiting_provider ─uzman reddi→ cancelled | ─alternatif→ alternative_proposed ─kabul→ deposit_pending
awaiting_provider ─6 sa doldu (scheduler)→ expired  (+müşteriye push)
deposit_pending  ─dekont yüklendi→ deposit_submitted ─uzman teyit→ confirmed
deposit_pending  ─3 sa doldu (scheduler)→ expired  (+bekleme listesi tetiklenir)
deposit_submitted ─teyit reddi→ deposit_pending | ─itiraz→ disputed
confirmed ─uzman: tamamlandı→ completed | ─uzman: gelmedi→ no_show (+müşteri itirazı → disputed)
confirmed/deposit_* ─müşteri iptali→ cancelOutcome():
    kapora ödenmemiş → cancelled
    >3 sa var        → refund_pending (kapora iadesi süreci)
    ≤3 sa            → cancelled + kapora yanar (forfeit)
offline create (confirmed) ─TX + advisory lock + çakışma→ 409 SLOT_CONFLICT (istemci kuyruğu düşürür, kullanıcı bilgilendirilir)
```

## Atomiklik garantileri

- Uzman onayı ve offline-confirmed yazımı `pg_advisory_xact_lock(hashtext(proId))` ile UZMAN BAZINDA serileşir → aynı slota paralel N istekten yalnız biri kazanır; kaybedenler deterministik `409 SLOT_UNAVAILABLE/SLOT_CONFLICT` alır.
- Tüm süre aşımı işleri `updateMany + koşullu where` = idempotent (tekrar koşmak yan etki üretmez).
- Create id-üzerinden upsert = idempotent (aynı isteğin tekrarı ikinci kayıt oluşturmaz).

## Slot üretimi (Faz 1)

`GET /professionals/:id/slots?day&durationMin` → `@ayna/domain computeDaySlots`:
çalışma penceresi (DayHours; boşsa 10:00–20:00) − izin günleri − aktif randevular,
adım `slot.step_min` (30 dk), tampon `slot.lead_min` (120 dk) — ikisi de admin `Setting`.
Timezone Intl `Asia/Almaty` ile; sabit offset kullanılmaz.
