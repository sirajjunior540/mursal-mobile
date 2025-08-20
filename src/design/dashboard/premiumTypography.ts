import { TextStyle } from 'react-native';

export const premiumTypography = {
  // Display text - Large, impactful
  display: {
    large: {
      fontSize: 34,
      fontWeight: '700',
      lineHeight: 40,
      letterSpacing: -0.5,
    } as TextStyle,
    
    medium: {
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 34,
      letterSpacing: -0.3,
    } as TextStyle,
    
    small: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 30,
      letterSpacing: -0.2,
    } as TextStyle,
  },
  
  // Headlines - Section headers
  headline: {
    large: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 26,
      letterSpacing: -0.2,
    } as TextStyle,
    
    medium: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: -0.1,
    } as TextStyle,
    
    small: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      letterSpacing: 0,
    } as TextStyle,
  },
  
  // Title text - iOS-style titles
  title3: {
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 25,
    letterSpacing: 0.35,
  } as TextStyle,
  
  // Callout text - Prominent but not too large
  callout: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 21,
    letterSpacing: -0.24,
  } as TextStyle,
  
  // Footnote - Small informational text
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: -0.08,
  } as TextStyle,
  
  // Body text - Primary content
  body: {
    large: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 22,
      letterSpacing: 0,
    } as TextStyle,
    
    medium: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      letterSpacing: 0,
    } as TextStyle,
    
    small: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 18,
      letterSpacing: 0,
    } as TextStyle,
  },
  
  // Label text - UI elements
  label: {
    large: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      letterSpacing: 0.1,
    } as TextStyle,
    
    medium: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
      letterSpacing: 0.1,
    } as TextStyle,
    
    small: {
      fontSize: 10,
      fontWeight: '500',
      lineHeight: 16,
      letterSpacing: 0.2,
    } as TextStyle,
  },
  
  // Caption text - Supporting information
  caption: {
    large: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 18,
      letterSpacing: 0.1,
    } as TextStyle,
    
    medium: {
      fontSize: 11,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0.1,
    } as TextStyle,
    
    small: {
      fontSize: 10,
      fontWeight: '400',
      lineHeight: 14,
      letterSpacing: 0.2,
    } as TextStyle,
  },
  
  // Button text
  button: {
    large: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: 0.1,
    } as TextStyle,
    
    medium: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 18,
      letterSpacing: 0.1,
    } as TextStyle,
    
    small: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      letterSpacing: 0.2,
    } as TextStyle,
  },
  
  // Numeric display - Stats and metrics
  numeric: {
    large: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 38,
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    } as TextStyle,
    
    medium: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 30,
      letterSpacing: -0.3,
      fontVariant: ['tabular-nums'],
    } as TextStyle,
    
    small: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
    } as TextStyle,
  },
  
  // Special text styles
  monospace: {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, monospace',
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0,
  } as TextStyle,
  
  // Text with emphasis
  emphasis: {
    strong: {
      fontWeight: '700',
    } as TextStyle,
    
    medium: {
      fontWeight: '600',
    } as TextStyle,
    
    subtle: {
      fontWeight: '400',
      opacity: 0.7,
    } as TextStyle,
  },
};