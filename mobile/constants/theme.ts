import { Platform } from 'react-native';

export const Colors = {
  // Primary brand
  primary: '#2563EB', // Strong royal blue
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  
  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  navy: '#0F172A', // Deep navy for headers
  
  // Text
  text: '#0F172A',
  textSecondary: '#64748B',
  textInverse: '#FFFFFF',
  
  // Status (Emergency/Risk)
  emergency: '#DC2626', // Red
  emergencyBg: '#FEF2F2',
  warning: '#EA580C', // Orange/Amber
  warningBg: '#FFF7ED',
  safe: '#16A34A', // Green
  safeBg: '#F0FDF4',
  
  // UI Elements
  border: '#E2E8F0',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
  
  // Tab Bar
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#2563EB',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
