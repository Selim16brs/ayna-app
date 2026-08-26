import { BookingStatus } from '@prisma/client';

// §4.2 — slot İŞGAL EDEN durumlar. Bir randevu bu durumlardaysa uzmanın o saati
// başkasına verilemez.
//
// `awaiting_provider` bilinçli olarak DIŞARIDA: ters-pazaryerinde aynı slota
// birden çok bekleyen talep olabilir, uzman içlerinden birini seçer. Onay anında
// (`bookings.service.approve`) çakışma yeniden kontrol edilir — kaybeden talepler
// orada elenir.
//
// Bu liste tek yerde durmalı: çakışma kontrolü üç ayrı kod yolunda yapılıyor ve
// listelerin ayrışması, bir yolun dolu saydığı slotu diğerinin boş saymasına yol
// açar — yani sessiz çift rezervasyon.
export const SLOT_HOLDING_STATUSES: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.deposit_pending,
  BookingStatus.deposit_submitted,
];
