import { ViewStyle } from 'react-native';

export const premiumShadows = {
  // Subtle elevation
  subtle: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  
  // Soft modern shadow
  soft: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
  
  // Medium depth
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  } as ViewStyle,
  
  // Deep sophisticated shadow
  deep: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  } as ViewStyle,
  
  // Premium floating effect
  floating: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,
  
  // Colored shadows for special elements
  colored: {
    primary: {
      shadowColor: '#667eea',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    } as ViewStyle,
    
    success: {
      shadowColor: '#10B981',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    } as ViewStyle,
    
    warning: {
      shadowColor: '#F59E0B',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    } as ViewStyle,
  },
  
  // Inner shadows (simulated with borders)
  inset: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  } as ViewStyle,
  
  // Glow effects
  glow: {
    primary: {
      shadowColor: '#667eea',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    } as ViewStyle,
    
    success: {
      shadowColor: '#10B981',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    } as ViewStyle,
  },
};