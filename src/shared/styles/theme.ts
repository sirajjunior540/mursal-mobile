/**
 * Centralized theme configuration
 */
import { Platform } from 'react-native';

export const theme = {
  colors: {
    // Primary palette
    primary: '#007AFF',
    primaryLight: '#4DA6FF',
    primaryDark: '#0056CC',
    
    // Secondary palette
    secondary: '#5856D6',
    secondaryLight: '#8B89FF',
    secondaryDark: '#3634A3',
    
    // Status colors
    success: '#34C759',
    successLight: '#67D87C',
    successDark: '#248A3D',
    
    warning: '#FF9500',
    warningLight: '#FFB340',
    warningDark: '#CC7700',
    
    error: '#FF3B30',
    errorLight: '#FF6B63',
    errorDark: '#CC2E26',
    
    info: '#5AC8FA',
    infoLight: '#8ADBFC',
    infoDark: '#32A0C8',
    
    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    
    // Gray scale
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    
    // Background colors
    background: '#F2F2F7',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#F9F9F9',
    
    // Surface colors
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F9FA',
    surfaceTertiary: '#F1F3F4',
    
    // Text colors
    text: '#1D1D1F',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    textInverse: '#FFFFFF',
    
    // Border colors
    border: '#E5E5EA',
    borderSecondary: '#D1D1D6',
    borderTertiary: '#F2F2F7',
    
    // Special colors
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayLight: 'rgba(0, 0, 0, 0.2)',
    overlayDark: 'rgba(0, 0, 0, 0.6)',
    
    // Status-specific colors for orders
    statusPending: '#FF9500',
    statusAccepted: '#007AFF',
    statusPickedUp: '#5856D6',
    statusDelivered: '#34C759',
    statusCancelled: '#FF3B30',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  borderRadius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 999,
  },
  
  typography: {
    // Display sizes
    displayLarge: {
      fontSize: 57,
      lineHeight: 64,
      fontWeight: '400' as const,
      letterSpacing: -0.25,
    },
    displayMedium: {
      fontSize: 45,
      lineHeight: 52,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    displaySmall: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    
    // Headline sizes
    headlineLarge: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    headlineMedium: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    headlineSmall: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    
    // Title sizes
    titleLarge: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    titleMedium: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0.15,
    },
    titleSmall: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
    },
    
    // Label sizes
    labelLarge: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
    },
    labelMedium: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
    },
    labelSmall: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
    },
    
    // Body sizes
    bodyLarge: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
      letterSpacing: 0.15,
    },
    bodyMedium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
      letterSpacing: 0.25,
    },
    bodySmall: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
      letterSpacing: 0.4,
    },
    
    // Caption
    caption: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '400' as const,
      letterSpacing: 0.5,
    },
  },
  
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
    xlarge: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 12,
    },
  },
  
  animation: {
    timing: {
      fast: 150,
      normal: 250,
      slow: 350,
    },
    easing: {
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
    spring: {
      gentle: {
        tension: 120,
        friction: 14,
      },
      bouncy: {
        tension: 180,
        friction: 12,
      },
      stiff: {
        tension: 210,
        friction: 20,
      },
    },
  },
  
  touchTargets: {
    minSize: 44,
    comfortable: 48,
    large: 56,
  },
  
  breakpoints: {
    small: 320,
    medium: 768,
    large: 1024,
  },
  
  zIndex: {
    background: -1,
    default: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Platform-specific adjustments
export const platformTheme = {
  ...theme,
  safeArea: {
    top: Platform.OS === 'ios' ? 44 : 24,
    bottom: Platform.OS === 'ios' ? 34 : 0,
  },
  statusBar: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  header: {
    height: Platform.OS === 'ios' ? 44 : 56,
  },
};

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeTypography = typeof theme.typography;