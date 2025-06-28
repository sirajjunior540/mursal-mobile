import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { TenantSettings } from '../types';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

// Action Types
type TenantAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: TenantSettings }
  | { type: 'CLEAR_DATA' };

// State Type
interface TenantState {
  settings: TenantSettings | null;
  isLoading: boolean;
  error: string | null;
}

// Context Type
interface TenantContextType {
  settings: TenantSettings | null;
  isLoading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

// Initial State
const initialState: TenantState = {
  settings: null,
  isLoading: false,
  error: null,
};

// Default Settings (fallback)
const defaultSettings: TenantSettings = {
  show_driver_balance: true,
  enable_customer_feedback: true,
  enable_delivery_tips: true,
  enable_payment_integration: false,
  enable_fleet_management: false,
  company_name: 'Delivery Service',
  primary_color: '#007bff',
  secondary_color: '#6c757d',
  currency: 'USD',
};

// Reducer
const tenantReducer = (state: TenantState, action: TenantAction): TenantState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_DATA':
      return {
        ...state,
        settings: null,
        error: null,
      };
    default:
      return state;
  }
};

// Context
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Provider Component
interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(tenantReducer, initialState);
  const { isLoggedIn } = useAuth();

  // Load tenant settings when logged in
  useEffect(() => {
    if (isLoggedIn) {
      refreshSettings();
    } else {
      dispatch({ type: 'CLEAR_DATA' });
    }
  }, [isLoggedIn]);

  const refreshSettings = async (): Promise<void> => {
    if (state.isLoading) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await apiService.getTenantSettings();

      if (response.success && response.data) {
        dispatch({ type: 'SET_SETTINGS', payload: response.data });
      } else {
        // Use default settings if API fails
        console.warn('Failed to fetch tenant settings, using defaults');
        dispatch({ type: 'SET_SETTINGS', payload: defaultSettings });
      }
    } catch (error) {
      console.error('Error fetching tenant settings:', error);
      // Use default settings on error
      dispatch({ type: 'SET_SETTINGS', payload: defaultSettings });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load tenant settings' });
    }
  };

  const contextValue: TenantContextType = {
    settings: state.settings,
    isLoading: state.isLoading,
    error: state.error,
    refreshSettings,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

// Hook
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};