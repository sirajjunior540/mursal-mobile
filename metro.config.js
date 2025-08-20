// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  server: {
    port: 8082, // Different port for DriverApp to avoid conflict with CustomerApp
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
