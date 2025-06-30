/**
 * Refactored AuthContext with proper security and error handling
 */
import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import Keychain from 'react-native-keychain';
import { 
  Driver, 
  AuthContextType, 
  AuthActionType, 
  AuthState, 
  LoginCredentials,
  DriverLocation 
} from '../../../shared/types';
import { logger } from '../../../infrastructure/logging/logger';

// Initial state
const initialState: AuthState = {
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthActionType): AuthState => {
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

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'SET_TENANT':
      return {
        ...state,
        tenant: action.payload,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        user: state.user ? { ...state.user, is_online: action.payload } : null,
      };

    case 'UPDATE_LOCATION':
      return {
        ...state,
        user: state.user ? { ...state.user, location: action.payload } : null,
      };

    case 'LOGOUT':
      return {
        ...initialState,
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

// Security configuration
const KEYCHAIN_SERVICE = 'MursalDriverApp';
const TOKEN_KEY = 'auth_tokens';

interface AuthProviderProps {
  children: React.ReactNode;
  apiBaseUrl: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiBaseUrl,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Secure token storage
  const storeTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    try {
      const tokenData = JSON.stringify({
        accessToken,
        refreshToken,
        timestamp: Date.now(),
      });

      await Keychain.setInternetCredentials(
        KEYCHAIN_SERVICE,
        TOKEN_KEY,
        tokenData,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          accessGroup: Platform.OS === 'ios' ? 'group.mursal.driver' : undefined,
          storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
        }
      );

      logger.debug('Tokens stored securely');
    } catch (error) {
      logger.error('Failed to store tokens', error as Error);
      throw new Error('Failed to store authentication tokens');
    }
  }, []);

  const getStoredTokens = useCallback(async () => {
    try {
      const credentials = await Keychain.getInternetCredentials(KEYCHAIN_SERVICE);
      
      if (credentials && credentials.password) {
        const tokenData = JSON.parse(credentials.password);
        return {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          timestamp: tokenData.timestamp,
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to retrieve stored tokens', error as Error);
      return null;
    }
  }, []);

  const clearStoredTokens = useCallback(async () => {
    try {
      await Keychain.resetInternetCredentials(KEYCHAIN_SERVICE);
      logger.debug('Tokens cleared from secure storage');
    } catch (error) {
      logger.error('Failed to clear stored tokens', error as Error);
    }
  }, []);

  // API request helper with token handling
  const makeAuthenticatedRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const tokens = await getStoredTokens();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken && { Authorization: `Bearer ${tokens.accessToken}` }),
      ...options.headers,
    };

    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 unauthorized - attempt token refresh
    if (response.status === 401 && tokens?.refreshToken) {
      try {
        await refreshToken();
        // Retry the original request
        const newTokens = await getStoredTokens();
        return fetch(`${apiBaseUrl}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${newTokens?.accessToken}`,
          },
        });
      } catch (refreshError) {
        // Refresh failed, logout user
        await logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  }, [apiBaseUrl, getStoredTokens]);

  // Get current valid token
  const getToken = useCallback(async (): Promise<string | null> => {
    const tokens = await getStoredTokens();
    return tokens?.accessToken || null;
  }, [getStoredTokens]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      logger.debug('Attempting login', { email: credentials.email });

      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens securely
      await storeTokens(data.data.access_token, data.data.refresh_token);

      // Update state
      dispatch({ type: 'SET_USER', payload: data.data.user });
      dispatch({ type: 'SET_TENANT', payload: data.data.tenant });

      logger.info('Login successful', { userId: data.data.user.id });
    } catch (error) {
      logger.error('Login failed', error as Error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  }, [apiBaseUrl, storeTokens]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Call logout endpoint
      try {
        await makeAuthenticatedRequest('/auth/logout', { method: 'POST' });
      } catch (error) {
        // Continue with logout even if API call fails
        logger.warn('Logout API call failed, continuing with local logout', error as Error);
      }

      // Clear stored tokens
      await clearStoredTokens();

      // Update state
      dispatch({ type: 'LOGOUT' });

      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout failed', error as Error);
      // Force logout on error
      dispatch({ type: 'LOGOUT' });
    }
  }, [makeAuthenticatedRequest, clearStoredTokens]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const tokens = await getStoredTokens();
      
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      // Store new tokens
      await storeTokens(data.data.access_token, tokens.refreshToken);

      logger.debug('Token refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed', error as Error);
      throw error;
    }
  }, [apiBaseUrl, getStoredTokens, storeTokens]);

  // Update profile function
  const updateProfile = useCallback(async (updates: Partial<Driver>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await makeAuthenticatedRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      dispatch({ type: 'UPDATE_USER', payload: data.data });
      logger.info('Profile updated successfully');
    } catch (error) {
      logger.error('Profile update failed', error as Error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  }, [makeAuthenticatedRequest]);

  // Update location function
  const updateLocation = useCallback(async (location: DriverLocation) => {
    try {
      const response = await makeAuthenticatedRequest('/driver/location', {
        method: 'POST',
        body: JSON.stringify(location),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Location update failed');
      }

      dispatch({ type: 'UPDATE_LOCATION', payload: location });
      logger.locationUpdate(location.latitude, location.longitude);
    } catch (error) {
      logger.error('Location update failed', error as Error);
      // Don't throw error to prevent location update failures from breaking the app
    }
  }, [makeAuthenticatedRequest]);

  // Set online status function
  const setOnlineStatus = useCallback(async (isOnline: boolean) => {
    try {
      const response = await makeAuthenticatedRequest('/driver/status', {
        method: 'PATCH',
        body: JSON.stringify({ is_online: isOnline }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Status update failed');
      }

      dispatch({ type: 'SET_ONLINE_STATUS', payload: isOnline });
      logger.info(`Driver status updated to ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      logger.error('Status update failed', error as Error);
      throw error;
    }
  }, [makeAuthenticatedRequest]);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Auto-login on app start
  useEffect(() => {
    const autoLogin = async () => {
      try {
        const tokens = await getStoredTokens();
        
        if (tokens?.accessToken) {
          dispatch({ type: 'SET_LOADING', payload: true });
          
          // Verify token and get user data
          const response = await fetch(`${apiBaseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          });

          if (response.ok) {
            const data = await response.json();
            dispatch({ type: 'SET_USER', payload: data.data.user });
            dispatch({ type: 'SET_TENANT', payload: data.data.tenant });
            logger.info('Auto-login successful');
          } else {
            // Token invalid, clear stored tokens
            await clearStoredTokens();
          }
        }
      } catch (error) {
        logger.error('Auto-login failed', error as Error);
        await clearStoredTokens();
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    autoLogin();
  }, [apiBaseUrl, getStoredTokens, clearStoredTokens]);

  // Memoized context value
  const contextValue = useMemo<AuthContextType>(() => ({
    ...state,
    login,
    logout,
    refreshToken,
    updateProfile,
    updateLocation,
    setOnlineStatus,
    clearError,
    getToken,
  }), [
    state,
    login,
    logout,
    refreshToken,
    updateProfile,
    updateLocation,
    setOnlineStatus,
    clearError,
    getToken,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};