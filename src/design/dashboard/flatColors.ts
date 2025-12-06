import { Design } from '../../constants/designSystem';

export const flatColors = {
  // Primary palette with brand orange colors
  primary: {
    50: '#FFFBF5',
    100: '#FFF7ED',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F5A623',  // Brand orange (logo background)
    600: '#E8941D',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  
  // Sophisticated neutrals
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Flat accent colors
  accent: {
    blue: '#F5A623',  // Changed to brand orange (logo background color)
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    indigo: '#6366F1',
    teal: '#14B8A6',
    orange: '#F97316',
    cyan: '#06B6D4',
  },
  
  // Status colors with flat design
  status: {
    online: {
      primary: '#10B981',
      secondary: '#D1FAE5',
      accent: '#047857',
      text: '#065F46',
    },
    offline: {
      primary: '#6B7280',
      secondary: '#F3F4F6',
      accent: '#374151',
      text: '#1F2937',
    },
    pending: {
      primary: '#F59E0B',
      secondary: '#FEF3C7',
      accent: '#D97706',
      text: '#92400E',
    },
    success: {
      primary: '#10B981',
      secondary: '#D1FAE5',
      accent: '#047857',
      text: '#065F46',
    },
    error: {
      primary: '#EF4444',
      secondary: '#FEE2E2',
      accent: '#DC2626',
      text: '#991B1B',
    },
    warning: {
      primary: '#F59E0B',
      secondary: '#FEF3C7',
      accent: '#D97706',
      text: '#92400E',
    },
  },
  
  // Murrsal brand colors (orange/gold)
  brand: {
    primary: '#F5A623',      // Main orange/gold
    secondary: '#E8941D',    // Darker orange
    light: '#FFF7ED',        // Light orange background
    lighter: '#FFFBF5',      // Very light orange
    border: '#FED7AA',       // Orange border
    text: '#9A3412',         // Dark orange text
  },

  // Card themes with flat colors
  cards: {
    white: {
      background: '#FFFFFF',
      border: '#E5E7EB',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
    light: {
      background: '#F9FAFB',
      border: '#E5E7EB',
      shadow: 'rgba(0, 0, 0, 0.05)',
    },
    blue: {
      background: '#FFF7ED',  // Orange background to match brand
      border: '#FED7AA',      // Orange border
      shadow: 'rgba(245, 166, 35, 0.1)',
    },
    orange: {
      background: '#FFF7ED',
      border: '#FED7AA',
      shadow: 'rgba(245, 166, 35, 0.1)',
    },
    green: {
      background: '#F0FDF4',
      border: '#DCFCE7',
      shadow: 'rgba(34, 197, 94, 0.1)',
    },
    yellow: {
      background: '#FFFBEB',
      border: '#FEF3C7',
      shadow: 'rgba(245, 158, 11, 0.1)',
    },
    red: {
      background: '#FEF2F2',
      border: '#FECACA',
      shadow: 'rgba(239, 68, 68, 0.1)',
    },
    purple: {
      background: '#FAF5FF',
      border: '#E9D5FF',
      shadow: 'rgba(139, 92, 246, 0.1)',
    },
  },
  
  // Stat card themes with flat colors
  statsCards: {
    deliveries: {
      primary: '#F5A623',  // Brand orange
      background: '#FFF7ED',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    orders: {
      primary: '#10B981',
      background: '#F0FDF4',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    rating: {
      primary: '#F59E0B',
      background: '#FFFBEB',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    earnings: {
      primary: '#8B5CF6',
      background: '#FAF5FF',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    time: {
      primary: '#F97316',
      background: '#FFF7ED',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
  },
  
  // Performance indicators with flat colors
  performance: {
    excellent: {
      color: '#10B981',
      background: '#F0FDF4',
      light: '#D1FAE5',
    },
    good: {
      color: '#F5A623',  // Brand orange
      background: '#FFF7ED',
      light: '#FED7AA',
    },
    average: {
      color: '#F59E0B',
      background: '#FFFBEB',
      light: '#FEF3C7',
    },
    poor: {
      color: '#EF4444',
      background: '#FEF2F2',
      light: '#FECACA',
    },
  },
  
  // Icon colors
  icons: {
    primary: '#F5A623',  // Brand orange
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
  },
  
  // Background colors
  backgrounds: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    accent: '#FFF7ED',  // Orange accent background
  },
};