import { Design } from '../../constants/designSystem';

export const premiumColors = {
  // Primary palette with depth
  primary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    900: '#0C4A6E',
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
  
  // Elegant gradients
  gradients: {
    primary: ['#667eea', '#764ba2'],
    success: ['#11998e', '#38ef7d'],
    warning: ['#f093fb', '#f5576c'],
    info: ['#4facfe', '#00f2fe'],
    premium: ['#a8edea', '#fed6e3'],
    dark: ['#2c3e50', '#34495e'],
    ocean: ['#2980b9', '#6bb6ff'],
    sunset: ['#ff7e5f', '#feb47b'],
    royal: ['#667eea', '#764ba2'],
    emerald: ['#50c878', '#00b894'],
  },
  
  // Status colors with sophistication
  status: {
    online: {
      primary: '#10B981',
      secondary: '#D1FAE5',
      accent: '#047857',
      gradient: ['#10B981', '#059669'],
    },
    offline: {
      primary: '#6B7280',
      secondary: '#F3F4F6',
      accent: '#374151',
      gradient: ['#6B7280', '#4B5563'],
    },
    pending: {
      primary: '#F59E0B',
      secondary: '#FEF3C7',
      accent: '#D97706',
      gradient: ['#F59E0B', '#D97706'],
    },
    success: {
      primary: '#10B981',
      secondary: '#D1FAE5',
      accent: '#047857',
      gradient: ['#10B981', '#059669'],
    },
    error: {
      primary: '#EF4444',
      secondary: '#FEE2E2',
      accent: '#DC2626',
      gradient: ['#EF4444', '#DC2626'],
    },
  },
  
  // Card themes
  cards: {
    glass: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: 'rgba(255, 255, 255, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
    frosted: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: 'rgba(255, 255, 255, 0.3)',
      shadow: 'rgba(0, 0, 0, 0.05)',
    },
    elevated: {
      background: '#FFFFFF',
      border: 'rgba(0, 0, 0, 0.05)',
      shadow: 'rgba(0, 0, 0, 0.15)',
    },
  },
  
  // Stat card themes
  statsCards: {
    deliveries: {
      primary: '#667eea',
      secondary: '#764ba2',
      background: 'rgba(102, 126, 234, 0.1)',
      text: '#FFFFFF',
    },
    orders: {
      primary: '#11998e',
      secondary: '#38ef7d',
      background: 'rgba(17, 153, 142, 0.1)',
      text: '#FFFFFF',
    },
    rating: {
      primary: '#f093fb',
      secondary: '#f5576c',
      background: 'rgba(240, 147, 251, 0.1)',
      text: '#FFFFFF',
    },
    earnings: {
      primary: '#4facfe',
      secondary: '#00f2fe',
      background: 'rgba(79, 172, 254, 0.1)',
      text: '#FFFFFF',
    },
    time: {
      primary: '#ff7e5f',
      secondary: '#feb47b',
      background: 'rgba(255, 126, 95, 0.1)',
      text: '#FFFFFF',
    },
  },
  
  // Performance indicators
  performance: {
    excellent: {
      color: '#10B981',
      background: 'rgba(16, 185, 129, 0.1)',
    },
    good: {
      color: '#3B82F6',
      background: 'rgba(59, 130, 246, 0.1)',
    },
    average: {
      color: '#F59E0B',
      background: 'rgba(245, 158, 11, 0.1)',
    },
    poor: {
      color: '#EF4444',
      background: 'rgba(239, 68, 68, 0.1)',
    },
  },
};