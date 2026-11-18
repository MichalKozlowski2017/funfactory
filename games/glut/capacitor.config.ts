import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.funfactory.glut',
  appName: 'Glut',
  webDir: 'dist',
  // Kolor jak tło ekranu startowego: bez białego/czarnego mignięcia przed wczytaniem gry.
  backgroundColor: '#1a1028',
  ios: { contentInset: 'never', backgroundColor: '#1a1028' },
  android: { backgroundColor: '#1a1028' },
};

export default config;
