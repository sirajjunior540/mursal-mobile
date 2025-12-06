import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthContextType, AuthUser, Driver, Tenant, OtpSendResponse, OtpVerifyResponse } from '../types';
import { STORAGE_KEYS, TENANT_CONFIG, USER_ROLES } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { apiService } from '../services/api';
import { authService } from '../services/api/authService';

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

          // Check if token needs refresh
          const isValid = await authService.ensureValidToken();

          if (isValid) {
            // Setup auto-refresh for the session
            await authService.setupAutoRefresh();

            // Restore auth immediately - don't require profile API to succeed
            // This ensures persistent login works even with network issues
            dispatch({
              type: 'RESTORE_AUTH',
              payload: {
                user: { ...userData, token },
                driver: driverData,
                tenant: tenantData || undefined
              },
            });

            // Optionally try to refresh profile data in background (non-blocking)
            apiService.getDriverProfile().then(profileResponse => {
              if (profileResponse.success && profileResponse.data) {
                console.log('✅ Profile data refreshed in background');
                // Could dispatch an update here if needed
              }
            }).catch(error => {
              console.log('⚠️ Background profile refresh failed (non-critical):', error);
            });

          } else {
            console.log('Token refresh failed, user needs to login again');
            await SecureStorage.clearAll();
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
        } catch (_clearError) {
          console.error('Error clearing auth data after failure:', _clearError);
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

        // Setup auto-refresh for the session
        await authService.setupAutoRefresh();
        console.log('✅ Auto-refresh enabled for persistent login');

        // Enable realtime service initialization - OrderContext will handle the actual initialization
        try {
          const { realtimeService } = await import('../services/realtimeService');
          realtimeService.enableInitialization();
          console.log('✅ AuthContext: Enabled realtime service initialization for OrderContext');
        } catch (realtimeError) {
          console.warn('Failed to enable realtime service initialization:', realtimeError);
        }
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
                    tenantId === 'restaurant2' ? '#FF6B00' : 
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

  // OTP Authentication Methods
  const sendOTP = async (phoneNumber: string): Promise<OtpSendResponse> => {
    try {
      const response = await apiService.sendOTP(phoneNumber);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to send OTP');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      throw new Error(message);
    }
  };

  const verifyOTP = async (phoneNumber: string, otp: string, sessionId: string): Promise<OtpVerifyResponse> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await apiService.verifyOTP(phoneNumber, otp, sessionId);

      if (response.success && response.data) {
        // If this is an existing driver, complete the login
        if (!response.data.is_new_driver && response.data.user && response.data.driver) {
          const { user, driver, tenant } = response.data;

          // Create AuthUser from the response
          const authUser: AuthUser = {
            id: user.id?.toString() || '',
            username: user.phone || phoneNumber,
            email: user.email || '',
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            phone: user.phone || phoneNumber,
            token: response.data.access_token,
            role: 'driver',
            is_active: user.is_active,
            is_staff: false,
            is_superuser: false
          };

          // Create Driver from the response
          const driverInfo: Driver = {
            id: driver.id?.toString() || '',
            firstName: driver.firstName || '',
            lastName: driver.lastName || '',
            email: driver.email || '',
            phone: driver.phone || phoneNumber,
            rating: driver.rating || 0,
            totalDeliveries: driver.totalDeliveries || 0,
            isOnline: driver.isOnline || false,
            profileImage: undefined
          };

          // Store auth data
          await Promise.all([
            SecureStorage.setAuthToken(response.data.access_token),
            SecureStorage.setRefreshToken(response.data.refresh_token),
            Storage.setItem(STORAGE_KEYS.USER_DATA, authUser),
            Storage.setItem(STORAGE_KEYS.DRIVER_DATA, driverInfo),
            tenant ? Storage.setItem('@tenant_data', tenant) : Promise.resolve(),
          ]);

          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: authUser, driver: driverInfo, tenant },
          });

          // Setup auto-refresh for the session
          await authService.setupAutoRefresh();

          // Enable realtime service
          try {
            const { realtimeService } = await import('../services/realtimeService');
            realtimeService.enableInitialization();
          } catch (realtimeError) {
            console.warn('Failed to enable realtime service:', realtimeError);
          }
        }

        return response.data;
      }

      dispatch({ type: 'LOGIN_FAILURE', payload: response.error || 'Failed to verify OTP' });
      throw new Error(response.error || 'Failed to verify OTP');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify OTP';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      throw error;
    }
  };

  const resendOTP = async (phoneNumber: string, sessionId: string): Promise<OtpSendResponse> => {
    try {
      const response = await apiService.resendOTP(phoneNumber, sessionId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to resend OTP');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend OTP';
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear auto-refresh timer
      authService.clearAutoRefresh();
      
      // Disable realtime service
      try {
        const { realtimeService } = await import('../services/realtimeService');
        realtimeService.disableInitialization();
        realtimeService.stop();
      } catch (error) {
        console.warn('Error stopping realtime service:', error);
      }

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


  const getSessionInfo = async () => {
    const timeRemaining = await authService.getSessionTimeRemaining();
    return {
      isLoggedIn: state.isLoggedIn,
      timeRemainingSeconds: timeRemaining,
      timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    };
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Session expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
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
    // OTP Authentication
    sendOTP,
    verifyOTP,
    resendOTP,
    hasPermission: hasPermission(state.user),
    getSessionInfo,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Role permission helpers
export const hasPermission = (user: AuthUser | null) => ({
  // Platform level permissions
  isPlatformSuperuser: () => 
    user?.role === USER_ROLES.PLATFORM_SUPERUSER || user?.is_superuser,
  
  isPlatformAdmin: () => 
    user?.role === USER_ROLES.PLATFORM_ADMIN || hasPermission(user).isPlatformSuperuser(),
  
  // Tenant level permissions
  isTenantAdmin: () => 
    user?.role === USER_ROLES.TENANT_ADMIN,
  
  isTenantStaff: () => 
    user?.role === USER_ROLES.TENANT_STAFF,
  
  isDriver: () => 
    user?.role === USER_ROLES.DRIVER,
  
  isCustomer: () => 
    user?.role === USER_ROLES.CUSTOMER,
  
  // Legacy role checks (for backward compatibility)
  isAdmin: () => 
    user?.role === USER_ROLES.ADMIN || hasPermission(user).isTenantAdmin(),
  
  isManager: () => 
    user?.role === USER_ROLES.MANAGER || hasPermission(user).isTenantAdmin(),
  
  isStaff: () => 
    user?.role === USER_ROLES.STAFF || hasPermission(user).isTenantStaff(),
  
  // Permission helpers
  canManageUsers: () => 
    hasPermission(user).isTenantAdmin() || hasPermission(user).isPlatformAdmin(),
  
  canManageSettings: () => 
    hasPermission(user).isTenantAdmin() || hasPermission(user).isPlatformAdmin(),
  
  canViewAnalytics: () => 
    hasPermission(user).isTenantAdmin() || 
    hasPermission(user).isTenantStaff() || 
    hasPermission(user).isPlatformAdmin(),
  
  canManageOrders: () => 
    hasPermission(user).isTenantAdmin() || 
    hasPermission(user).isTenantStaff() || 
    hasPermission(user).isCustomer(),
  
  canAssignDeliveries: () => 
    hasPermission(user).isTenantAdmin() || hasPermission(user).isTenantStaff(),
  
  hasTenantAdminAccess: () => 
    hasPermission(user).isTenantAdmin(),
  
  hasTenantStaffAccess: () => 
    hasPermission(user).isTenantAdmin() || hasPermission(user).isTenantStaff(),
});

// Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
