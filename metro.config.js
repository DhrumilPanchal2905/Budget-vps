// Default Expo Metro config (web + native). Package "exports" are enabled by default on SDK 53+.
const { getDefaultConfig } = require("expo/metro-config");
module.exports = getDefaultConfig(__dirname);
