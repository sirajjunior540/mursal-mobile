import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Driver, AuthContextType } from '../../../shared/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../../services/authService';

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiBaseUrl,
}) => {
  const [user, setUser] = useState<Driver | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData) as Driver;
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Error handled silently
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(credentials);
      if (response.success && response.data) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    // Implementation for token refresh
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Driver>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  }, [user]);

  const updateLocation = useCallback(async (location: { latitude: number; longitude: number }) => {
    if (user) {
      const updatedUser = {
        ...user,
        location: {
          ...location,
          timestamp: new Date().toISOString(),
        },
      };
      setUser(updatedUser);
    }
  }, [user]);

  const setOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (user) {
      const updatedUser = {
        ...user,
        is_online: isOnline,
        status: isOnline ? 'online' : 'offline',
      };
      setUser(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getToken = useCallback(async () => {
    return await AsyncStorage.getItem('authToken') || '';
  }, []);

  const contextValue: AuthContextType = {
    user,
    tenant: null,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    updateProfile,
    updateLocation,
    setOnlineStatus,
    clearError,
    getToken,
  };

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