import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from './api';
import { useStore } from './store';

/**
 * OKUNMAMIŞ MESAJ ROZETİ.
 *
 * Kurucu bildirdi: _"mesaj geldiğinde ana ekrandaki mesaj ikonunda belli
 * olmuyor; ancak mesaj ikonuna tıklarsak görebiliyoruz."_
 *
 * Sebep tek katmanlı değildi:
 *  - Mesaj geldiğinde HİÇBİR bildirim üretilmiyor (messaging servisinde
 *    bildirim çağrısı yok), yani zil de sessiz kalıyordu.
 *  - Okunmamış sayısı yalnız `api.conversations()` içinde vardı ve o uç
 *    sadece Mesajlar ekranı açılınca çağrılıyordu. Ana ekranın ikonu
 *    hiçbir şey bilmiyordu.
 *
 * Çözüm mesajı bildirime çevirmek DEĞİL — bu zili mesajlarla doldurur ve
 * gerçek bildirimleri boğardı. Doğru yer ikonun kendisi: mesaj ikonu kendi
 * rozetini taşıyor.
 *
 * Ekrana her dönüşte yenileniyor; sohbetten çıkınca sayı düşsün diye.
 * Hata sessizce yutuluyor: rozet yüzünden ana ekran bozulmamalı.
 */
export function useUnreadMessages(): number {
  const token = useStore((s) => s.token);
  const unreadMessages = useStore((s) => s.unreadMessages);
  const setUnreadMessages = useStore((s) => s.setUnreadMessages);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setUnreadMessages(0);
        return;
      }
      let iptal = false;
      void api
        .unreadMessages(token)
        .then((r) => {
          if (!iptal) setUnreadMessages(r.count);
        })
        .catch(() => undefined);
      return () => {
        iptal = true;
      };
    }, [token, setUnreadMessages]),
  );

  return unreadMessages;
}
