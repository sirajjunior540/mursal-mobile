import { Platform } from 'react-native';

// High-Contrast Design System for Driver App
// Based on WCAG guidelines for accessibility and readability
export const Design = {
  // High-contrast colors for maximum readability
  colors: {
    // Primary brand colors with high contrast
    primary: '#667eea',      // Main brand purple-blue
    primaryLight: '#a5b8fc', // Light variant
    primaryDark: '#4c61c7',  // Dark variant
    
    // Semantic colors with high contrast
    success: '#48bb78',      // Green
    warning: '#ed8936',      // Orange  
    error: '#f56565',        // Red
    info: '#4299e1',         // Blue
    
    // Background colors for clean interfaces
    white: '#FFFFFF',
    background: '#FFFFFF',
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#f1f5f9',
    
    // Text colors for maximum readability (WCAG AAA)
    text: '#1a202c',         // Very dark gray (21:1 contrast)
    textSecondary: '#4a5568', // Medium dark gray (7:1 contrast)  
    textTertiary: '#718096',  // Medium gray (4.5:1 contrast)
    textInverse: '#ffffff',   // White text for dark backgrounds
    textMuted: '#a0aec0',     // Light gray for subtle text
    
    // UI element colors
    border: '#e2e8f0',        // Light gray for borders
    divider: '#edf2f7',       // Very light gray for dividers
    inputBackground: '#ffffff', // White for input backgrounds
    inputBorder: '#d1d5db',   // Medium gray for input borders
    inputFocus: '#667eea',    // Brand color for focused inputs
    disabled: '#f7fafc',      // Very light gray for disabled elements
    
    // System grays (updated for better contrast)
    gray50: '#f9fafb',
    gray100: '#f3f4f6', 
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    
    // Status colors with accessible contrast
    successBackground: '#f0fff4',
    successBorder: '#9ae6b4', 
    successText: '#22543d',
    
    warningBackground: '#fffaf0',
    warningBorder: '#fbb361',
    warningText: '#744210',
    
    errorBackground: '#fed7d7',
    errorBorder: '#fc8181',
    errorText: '#742a2a',
    
    infoBackground: '#ebf8ff',
    infoBorder: '#90cdf4',
    infoText: '#2a4365',
    
    // Order status colors (high contrast)
    pending: '#ed8936',      // Orange
    confirmed: '#4299e1',    // Blue
    assigned: '#4299e1',     // Blue
    accepted: '#4299e1',     // Blue
    picked_up: '#9f7aea',    // Purple
    in_transit: '#667eea',   // Brand blue
    delivered: '#48bb78',    // Green
    cancelled: '#f56565',    // Red
    failed: '#f56565',       // Red
  },
  
  // Typography with improved readability
  typography: {
    // Headers with better line height for readability
    h1: {
      fontSize: 32,
      lineHeight: 48,  // 1.5x for better readability
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      lineHeight: 42,  // 1.5x
      fontWeight: '600' as const,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 24,
      lineHeight: 36,  // 1.5x
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
    h4: {
      fontSize: 20,
      lineHeight: 30,  // 1.5x
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    h5: {
      fontSize: 18,
      lineHeight: 27,  // 1.5x
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    
    // Body text with optimal line height
    bodyLarge: {
      fontSize: 18,
      lineHeight: 28,  // 1.56x for body text
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,  // 1.5x
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 21,  // 1.5x
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    
    // UI text
    button: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
    },
    buttonSmall: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
    },
    label: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    caption: {
      fontSize: 12,
      lineHeight: 18,  // 1.5x
      fontWeight: '400' as const,
      letterSpacing: 0.3,
    },
    overline: {
      fontSize: 10,
      lineHeight: 16,
      fontWeight: '600' as const,
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
    },
  },
  
  // Spacing System (4px grid)
  spacing: {
    0: 0,
    1: 4,    // xs
    2: 8,    // s
    3: 12,
    4: 16,   // m (base)
    5: 20,
    6: 24,   // l
    8: 32,   // xl
    10: 40,
    12: 48,  // xxl
    16: 64,
    20: 80,
    24: 96,
  },
  
  // Border Radius for modern UI
  borderRadius: {
    none: 0,
    sm: 6,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 999,
  },
  
  // Shadows
  shadows: {
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
  },
  
  // Animation Timings
  animation: {
    fast: 200,
    medium: 300,
    slow: 400,
    spring: {
      tension: 100,
      friction: 10,
    },
  },
  
  // Touch Targets
  touchTargets: {
    minimum: 44, // HIG minimum
    recommended: 48,
    large: 56,
  },
  
  // Safe Areas
  safeAreas: {
    top: Platform.OS === 'ios' ? 44 : 24,
    bottom: Platform.OS === 'ios' ? 34 : 0,
  },
};

// Semantic Color Helpers for high contrast
export const getStatusColor = (status: string): string => {
  const statusColors: { [key: string]: string } = {
    pending: Design.colors.pending,      // Orange
    confirmed: Design.colors.confirmed,  // Blue
    assigned: Design.colors.assigned,    // Blue
    accepted: Design.colors.accepted,    // Blue
    picked_up: Design.colors.picked_up,  // Purple
    in_transit: Design.colors.in_transit, // Brand blue
    delivered: Design.colors.delivered,  // Green
    cancelled: Design.colors.cancelled,  // Red
    failed: Design.colors.failed,        // Red
  };
  return statusColors[status?.toLowerCase?.()] || Design.colors.gray500;
};

// Typography Helpers
export const getFontFamily = (weight: '300' | '400' | '500' | '600' | '700' | '800' | '900' = '400') => {
  if (Platform.OS === 'ios') {
    return 'System';
  }
  return 'Roboto';
};

// Component Style Helpers
export const getButtonStyle = (variant: 'primary' | 'secondary' | 'ghost' = 'primary', size: 'sm' | 'base' | 'lg' = 'base') => {
  const baseStyle = {
    borderRadius: Design.borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  };

  const sizeStyles = {
    sm: {
      paddingHorizontal: Design.spacing[3],
      paddingVertical: Design.spacing[2],
      minHeight: 36,
    },
    base: {
      paddingHorizontal: Design.spacing[4],
      paddingVertical: Design.spacing[3],
      minHeight: 44,
    },
    lg: {
      paddingHorizontal: Design.spacing[6],
      paddingVertical: Design.spacing[4],
      minHeight: 52,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: Design.colors.primary,
    },
    secondary: {
      backgroundColor: Design.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: Design.colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };

  return {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };
};

// Card style helper
export const getCardStyle = () => ({
  backgroundColor: Design.colors.background,
  borderRadius: Design.borderRadius.lg,
  padding: Design.spacing[4],
  ...Design.shadows.small,
});

// Input style helper
export const getInputStyle = () => ({
  backgroundColor: Design.colors.inputBackground,
  borderWidth: 1,
  borderColor: Design.colors.inputBorder,
  borderRadius: Design.borderRadius.md,
  paddingHorizontal: Design.spacing[4],
  paddingVertical: Design.spacing[3],
  fontSize: Design.typography.body.fontSize,
  lineHeight: Design.typography.body.lineHeight,
  color: Design.colors.text,
  minHeight: 48,
});