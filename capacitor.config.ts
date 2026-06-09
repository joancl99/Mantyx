import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mantyx.app',
  appName: 'Mantyx',
  webDir: 'dist/apps/web/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
