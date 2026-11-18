import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '__APP_ID__',
  appName: '__TITLE__',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  android: { backgroundColor: '#000000' },
};

export default config;
