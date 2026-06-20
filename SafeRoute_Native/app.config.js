module.exports = {
  expo: {
    name: "SafeRoute",
    slug: "SafeRoute",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
      }
    },
    android: {
      package: "com.saferoute.app",
      usesCleartextTraffic: true,
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            useLegacyPackaging: true
          }
        }
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
          RNMapboxMapsDownloadToken: "MAPBOX_DOWNLOADS_TOKEN_PLACEHOLDER"
        }
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-google-signin/google-signin"
    ]
  }
};
