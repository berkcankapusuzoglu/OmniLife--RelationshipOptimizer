import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.omnilife.app",
  appName: "OmniLife",
  webDir: "native-shell",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    loggingBehavior: "debug",
  },
  server: {
    // Load the live Vercel deployment
    url: "https://omnilife-relationship-optimizer.vercel.app",
    cleartext: false,
    errorPath: "index.html",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#09090b",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090b",
    },
  },
};

export default config;
