import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthContextType, AuthUser, Driver, Tenant } from '../types';
import { STORAGE_KEYS, TENANT_CONFIG } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { apiService } from '../services/api';

// Action Types
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AuthUser; driver: Driver; tenant?: Tenant } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_AUTH'; payload: { user: AuthUser; driver: Driver; tenant?: Tenant } }
  | { type: 'SET_TENANT'; payload: Tenant }
  | { type: 'CLEAR_ERROR' };

// State Type
interface AuthState {
  user: AuthUser | null;
  driver: Driver | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  error: string | null;
}

// Initial State
const initialState: AuthState = {
  user: null,
  driver: null,
  tenant: null,
  isLoading: true,
  isLoggedIn: false,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        driver: action.payload.driver,
        tenant: action.payload.tenant || state.tenant,
        isLoading: false,
        isLoggedIn: true,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        driver: null,
        tenant: null,
        isLoading: false,
        isLoggedIn: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        driver: null,
        tenant: null,
        isLoading: false,
        isLoggedIn: false,
        error: null,
      };
    case 'RESTORE_AUTH':
      return {
        ...state,
        user: action.payload.user,
        driver: action.payload.driver,
        tenant: action.payload.tenant || state.tenant,
        isLoading: false,
        isLoggedIn: true,
        error: null,
      };
    case 'SET_TENANT':
      return {
        ...state,
        tenant: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore authentication on app startup
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        // Check if we have a valid token first
        const token = await SecureStorage.getAuthToken();
        
        if (!token) {
          console.log('No token found, showing login screen');
          dispatch({ type: 'LOGOUT' });
          return;
        }

        const [userData, driverData, tenantData] = await Promise.all([
          Storage.getItem<AuthUser>(STORAGE_KEYS.USER_DATA),
          Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA),
          Storage.getItem<Tenant>('@tenant_data'),
        ]);

        if (userData && driverData && token) {
          console.log('Restoring auth session for user:', userData.username);
          // Verify token is still valid by making a test API call
          try {
            const profileResponse = await apiService.getDriverProfile();
            if (profileResponse.success) {
              dispatch({
                type: 'RESTORE_AUTH',
                payload: { 
                  user: { ...userData, token },
                  driver: driverData,
                  tenant: tenantData || undefined
                },
              });
            } else {
              console.log('Token invalid, clearing auth data');
              await SecureStorage.clearAll();
              dispatch({ type: 'LOGOUT' });
            }
          } catch (error) {
            console.log('⚠️ Auth verification failed, clearing auth data:', error);
            try {
              await SecureStorage.clearAll();
            } catch (clearError) {
              console.error('Error clearing auth data:', clearError);
            }
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          console.log('Incomplete auth data, showing login screen');
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('💥 Critical error restoring auth:', error);
        try {
          await SecureStorage.clearAll();
        } catch (clearError) {
          console.error('Error clearing auth data after failure:', clearError);
        }
        dispatch({ type: 'LOGOUT' });
      }
    };

    restoreAuth();
  }, []);

  const login = async (username: string, password: string, tenantId?: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await apiService.login({ username, password, tenantId });

      if (response.success && response.data) {
        const { user, driver, tenant } = response.data;

        // Store auth data (token securely, other data in regular storage)
        const storagePromises = [
          SecureStorage.setAuthToken(user.token),
          Storage.setItem(STORAGE_KEYS.USER_DATA, user),
          Storage.setItem(STORAGE_KEYS.DRIVER_DATA, driver),
        ];

        // Store tenant data if available
        if (tenant) {
          storagePromises.push(Storage.setItem('@tenant_data', tenant));
        }

        await Promise.all(storagePromises);

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, driver, tenant },
        });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      throw error;
    }
  };

  const setTenant = async (tenantId: string): Promise<void> => {
    try {
      // Store tenant ID
      await Storage.setItem(TENANT_CONFIG.TENANT_STORAGE_KEY, tenantId);

      // Create a basic tenant object with the ID
      // In a real app, you might want to fetch tenant details from an API
      const tenant: Tenant = {
        id: tenantId,
        name: tenantId === 'restaurant1' ? 'Restaurant One' : 
              tenantId === 'restaurant2' ? 'Restaurant Two' : 
              'Default Restaurant',
        logo: `https://api.mursal.com/tenants/${tenantId}/logo.png`,
        primaryColor: tenantId === 'restaurant1' ? '#FF5722' : 
                      tenantId === 'restaurant2' ? '#2196F3' : 
                      '#4CAF50',
      };

      // Store tenant data
      await Storage.setItem('@tenant_data', tenant);

      dispatch({
        type: 'SET_TENANT',
        payload: tenant,
      });
    } catch (error) {
      console.error('Error setting tenant:', error);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout API
      await apiService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear stored data regardless of API success
      await Promise.all([
        SecureStorage.clearAll(), // Clear secure tokens
        Storage.removeItems([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.DRIVER_DATA,
          STORAGE_KEYS.ACTIVE_ORDERS,
          STORAGE_KEYS.ORDER_HISTORY,
        ])
      ]);

      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    user: state.user,
    tenant: state.tenant,
    isLoading: state.isLoading,
    isLoggedIn: state.isLoggedIn,
    error: state.error,
    login,
    logout,
    setTenant,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
