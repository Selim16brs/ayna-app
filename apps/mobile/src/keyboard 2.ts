import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Klavye açık mı?
 *
 * Yazma alanı olan ekranlarda (mesaj, çember, Boni) alt güvenli-alan boşluğu
 * yalnız klavye KAPALIYKEN gerekir. Klavye açıldığında o boşluğu da eklemek,
 * yazma alanını klavyenin üstünde havada bırakıyor.
 */
export function useKeyboardShown(): boolean {
  const [acik, setAcik] = useState(false);
  useEffect(() => {
    // iOS'ta `Will` olayları animasyonla eşzamanlı; Android'de yalnız `Did` var.
    const gosterOlayi = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const gizleOlayi = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const g = Keyboard.addListener(gosterOlayi, () => setAcik(true));
    const h = Keyboard.addListener(gizleOlayi, () => setAcik(false));
    return () => {
      g.remove();
      h.remove();
    };
  }, []);
  return acik;
}
