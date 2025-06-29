import { lightTheme } from './theme';

// Define the COLORS object as expected by the components
export const COLORS = {
  primary: {
    default: lightTheme.colors.primary,
    light: `${lightTheme.colors.primary}80`, // 50% opacity
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

// Simple colors object for the new screens (flat structure)
export const colors = {
  // Basic colors
  primary: lightTheme.colors.primary,
  secondary: lightTheme.colors.secondary,
  success: lightTheme.colors.success,
  warning: lightTheme.colors.warning,
  error: lightTheme.colors.error,
  danger: lightTheme.colors.error, // Alias for error
  info: '#2196F3',
  
  // Background colors
  background: lightTheme.colors.background,
  white: lightTheme.colors.white,
  black: lightTheme.colors.black,
  
  // Text colors
  text: lightTheme.colors.text,
  textSecondary: lightTheme.colors.textSecondary,
  
  // Gray shades
  gray: '#757575',
  lightGray: '#E0E0E0',
  darkGray: '#424242',
  
  // Light variants for backgrounds
  lightBlue: '#E3F2FD',
  lightGreen: '#E8F5E8',
  lightRed: '#FFEBEE',
  lightYellow: '#FFF8E1',
};