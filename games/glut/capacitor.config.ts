import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.funfactory.glut',
  appName: 'Glut',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  android: { backgroundColor: '#000000' },
};

export default config;
