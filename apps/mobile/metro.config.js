// Expo + pnpm monorepo Metro yapılandırması
// @ayna/* workspace paketlerinin çözülmesi için watchFolders + nodeModulesPaths gerekir.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Expo'nun varsayılan watchFolders'ını EZME, üzerine ekle.
// Eskiden `config.watchFolders = [workspaceRoot]` yazıyordu; bu, Expo'nun kendi
// izlediği yolları (ör. expo/metro-runtime kaynakları) listeden düşürüyordu.
// Sonuç: bazı değişiklikler Metro tarafından görülmüyor, "kaydettim ama yansımadı"
// tipi hayalet sorunlar çıkıyordu. `expo-doctor` bunu açıkça bildiriyor.
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Hem uygulamanın hem de workspace kökünün node_modules'ü çözümlemeye dahil.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// NOT: Burada eskiden `config.resolver.disableHierarchicalLookup = true` vardı.
// Kaldırıldı — .npmrc'de `node-linker=hoisted` olduğu için pnpm zaten DÜZ bir
// node_modules üretiyor (symlink ağacı yok). Hiyerarşik aramayı kapatmak bu kurulumda
// gereksiz ve Expo'nun beklediği varsayılanla (false) çelişiyordu.

module.exports = config;
