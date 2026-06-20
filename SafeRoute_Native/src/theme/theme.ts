import { useColorScheme } from 'react-native';
import { useStore } from '../store/useStore';

export const DarkColors = {
  primary: '#00FF9D', // Glowing Green for Safest
  secondary: '#00D1FF', // Blue for Fastest
  danger: '#FF3B30', // SOS Red
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  accent: '#7000FF', // Purple for highlights
  glass: 'rgba(255, 255, 255, 0.1)',
};

export const LightColors = {
  primary: '#00C853', // Darker green for light mode
  secondary: '#007AFF', // Standard iOS blue
  danger: '#FF3B30',
  background: '#F2F2F7', // iOS light gray background
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#6C6C70',
  accent: '#5856D6',
  glass: 'rgba(0, 0, 0, 0.05)',
};

// Fallback for files that absolutely cannot use hooks yet (e.g., constants)
// We default to Dark mode to match the original app design.
export const COLORS = DarkColors;

export const useThemeColors = () => {
  const systemTheme = useColorScheme();
  const themePreference = useStore((state) => state.themePreference);
  
  const activeTheme = themePreference === 'auto' ? systemTheme : themePreference;
  return activeTheme === 'light' ? LightColors : DarkColors;
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
