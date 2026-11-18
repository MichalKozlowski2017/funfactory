import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.funfactory.ostatniabrama',
  appName: 'Ostatnia Brama',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  android: { backgroundColor: '#000000' },
};

export default config;
