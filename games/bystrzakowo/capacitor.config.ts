import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mkdev.bystrzakowo',
  appName: 'Bystrzakowo',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  android: { backgroundColor: '#fff6e8' },
};

export default config;
