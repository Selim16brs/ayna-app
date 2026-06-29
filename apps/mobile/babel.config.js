module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated plugin EN SONDA olmalı
    plugins: ['react-native-reanimated/plugin'],
  };
};
