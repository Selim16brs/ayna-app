/**
 * AYNA — iOS imzalama ve sürüm senkronu config plugin'i.
 *
 * NEDEN VAR:
 * `expo prebuild` her çalıştığında ios/ klasörünü sıfırdan üretir. Bu, Xcode'da elle
 * yapılan üç ayarı her seferinde siliyordu ve sürüm çıkarmadan önce elle geri konuyordu:
 *
 *   1. DEVELOPMENT_TEAM        — imzalama takımı; silinince Xcode "Signing" hatası verir.
 *   2. MARKETING_VERSION       — prebuild "1.0" yazıyor, app.json'daki "1.0.0" ile
 *                                uyuşmuyordu; Xcode'un General sekmesi yanlış sürüm
 *                                gösteriyordu (Info.plist doğru olsa bile kafa karıştırıcı).
 *   3. CURRENT_PROJECT_VERSION — prebuild "1" yazıyor, gerçek build numarası app.json'da.
 *
 * Bu plugin üçünü de app.json'dan okuyup pbxproj'ye yazar; artık prebuild sonrası
 * elle düzeltme gerekmiyor.
 *
 * AYRICA — data-protection entitlement'ı:
 * Upstream app.json'a `com.apple.developer.default-data-protection` ekliyor. Bizim
 * bundle ID'mizin (com.yemreeke.template) App ID'sinde bu capability açık olmadığı için
 * Xcode arşivlemede şu hatayı veriyor:
 *   "Provisioning profile ... doesn't match the entitlements file's value for the
 *    com.apple.developer.default-data-protection entitlement."
 * Entitlement'ı burada siliyoruz. Güvenlik kaybı yok: iOS'ta üçüncü parti uygulamalar
 * için varsayılan dosya koruma sınıfı ZATEN NSFileProtectionCompleteUntilFirstUserAuthentication;
 * bu anahtar yalnızca varsayılanı açıkça beyan ediyordu.
 * Apple Developer'da App ID'ye "Data Protection" capability'si eklenirse bu blok kaldırılabilir.
 */

const { withXcodeProject, withEntitlementsPlist } = require('expo/config-plugins');

const KALDIRILACAK_ENTITLEMENT = 'com.apple.developer.default-data-protection';

/**
 * @param {import('expo/config').ExpoConfig} config
 * @param {{ teamId?: string }} props
 */
function withAynaImzalama(config, props = {}) {
  const { teamId } = props;

  // --- 1) Xcode build ayarları: takım + sürüm senkronu ---
  config = withXcodeProject(config, (cfg) => {
    const proje = cfg.modResults;
    const surum = cfg.version ?? '1.0.0';
    const build = String(cfg.ios?.buildNumber ?? '1');

    const bolum = proje.pbxXCBuildConfigurationSection();
    let dokunulan = 0;

    for (const anahtar of Object.keys(bolum)) {
      const girdi = bolum[anahtar];
      // pbxproj bölümü hem nesne hem "<uuid>_comment" string girdileri taşır.
      if (!girdi || typeof girdi !== 'object' || !girdi.buildSettings) continue;

      const ayarlar = girdi.buildSettings;
      // Yalnızca uygulama hedefinin yapılandırmaları: bundle ID taşıyanlar.
      // (Pods hedeflerinde PRODUCT_BUNDLE_IDENTIFIER yoktur — onlara dokunmuyoruz.)
      if (!ayarlar.PRODUCT_BUNDLE_IDENTIFIER) continue;

      if (teamId) ayarlar.DEVELOPMENT_TEAM = teamId;
      ayarlar.MARKETING_VERSION = surum;
      ayarlar.CURRENT_PROJECT_VERSION = build;
      dokunulan++;
    }

    if (dokunulan === 0) {
      // Sessizce geçmek yerine uyar: pbxproj yapısı değiştiyse fark edelim.
      console.warn(
        '[withAynaImzalama] UYARI: PRODUCT_BUNDLE_IDENTIFIER taşıyan yapılandırma bulunamadı — ' +
          'DEVELOPMENT_TEAM ve sürüm senkronu UYGULANMADI.',
      );
    }

    return cfg;
  });

  // --- 2) Profille uyuşmayan entitlement'ı kaldır ---
  config = withEntitlementsPlist(config, (cfg) => {
    if (KALDIRILACAK_ENTITLEMENT in cfg.modResults) {
      delete cfg.modResults[KALDIRILACAK_ENTITLEMENT];
    }
    return cfg;
  });

  return config;
}

module.exports = withAynaImzalama;
