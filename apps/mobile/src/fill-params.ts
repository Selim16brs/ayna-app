/**
 * `{ad}` yer tutucularını doldurur.
 *
 * `locale.tsx` içindeydi; o dosya AsyncStorage ve expo-localization çekiyor,
 * yani saf mantık için bile React Native bağımlılığı geliyordu ve birim
 * testinde çalıştırılamıyordu. Kural TEK yerde kalsın diye buraya alındı;
 * `locale` onu yeniden dışa veriyor, çağıran hiçbir yer değişmedi.
 */
export function fillParams(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] != null ? String(params[k]) : `{${k}}`,
  );
}
