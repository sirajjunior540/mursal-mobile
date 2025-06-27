import { lightTheme, darkTheme } from './theme';

// Define the COLORS object as expected by the components
export const COLORS = {
  primary: {
    default: lightTheme.colors.primary,
    light: lightTheme.colors.primary + '80', // 50% opacity
    dark: '#1976D2', // Darker shade of primary
  },
  secondary: lightTheme.colors.secondary,
  background: lightTheme.colors.background,
  surface: lightTheme.colors.surface,
  text: {
    primary: lightTheme.colors.text,
    secondary: lightTheme.colors.textSecondary,
  },
  border: lightTheme.colors.border,
  success: lightTheme.colors.success,
  warning: lightTheme.colors.warning,
  error: lightTheme.colors.error,
  white: lightTheme.colors.white,
  black: lightTheme.colors.black,
};

// Define FONTS object since it's also used in the components
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System-Bold',
};