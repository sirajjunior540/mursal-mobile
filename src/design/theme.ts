/**
 * Modern Design System for Mursal Driver App
 * Industry-standard design tokens and theme system
 */

export const theme = {
  // Color Palette - Modern, accessible colors
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#EBF8FF',
      100: '#BEE3F8',
      500: '#3182CE', // Main brand color
      600: '#2C5282',
      700: '#2A4365',
      900: '#1A202C',
    },
    
    // Semantic Colors
    success: {
      50: '#F0FFF4',
      100: '#C6F6D5',
      500: '#38A169',
      600: '#2F855A',
      700: '#276749',
    },
    
    warning: {
      50: '#FFFBEB',
      100: '#FED7AA',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
    },
    
    error: {
      50: '#FEF2F2',
      100: '#FECACA',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
    },
    
    info: {
      50: '#EBF4FF',
      100: '#DBEAFE',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
    },
    
    // Neutral Colors
    neutral: {
      0: '#FFFFFF',
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    
    // Status Colors for Delivery States
    status: {
      pending: '#F59E0B',
      assigned: '#3B82F6',
      accepted: '#10B981',
      enRoute: '#8B5CF6',
      arrived: '#F97316',
      delivered: '#059669',
      failed: '#EF4444',
    },
  },
  
  // Typography Scale
  typography: {
    fontFamily: {
      primary: 'System', // Uses system font for better performance
      mono: 'Courier New',
    },
    
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing Scale (4px base unit)
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },
  
  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    base: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  
  // Component Tokens
  components: {
    button: {
      height: {
        sm: 32,
        base: 44,
        lg: 52,
      },
      padding: {
        sm: { horizontal: 12, vertical: 6 },
        base: { horizontal: 16, vertical: 12 },
        lg: { horizontal: 20, vertical: 16 },
      },
    },
    
    card: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
    },
    
    input: {
      height: 44,
      padding: { horizontal: 16, vertical: 12 },
      borderRadius: 8,
      borderWidth: 1,
    },
  },
  
  // Animation
  animation: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 400,
    },
    
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
  
  // Z-Index Scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    modal: 1050,
    popover: 1100,
    tooltip: 1200,
    notification: 1300,
  },
} as const;

// Type definitions for TypeScript
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;

// Helper functions
export const getColor = (color: string): string => {
  const keys = color.split('.');
  let value: any = theme.colors;
  
  for (const key of keys) {
    value = value[key];
    if (!value) return color; // Return original if path not found
  }
  
  return value;
};

export const getSpacing = (size: keyof typeof theme.spacing): number => {
  return theme.spacing[size];
};

export default theme;