/**
 * Simplified AuthContext for testing the refactored structure
 */
import React, { createContext, useContext, useMemo } from 'react';
import { Driver, AuthContextType } from '../../../shared/types';

// Mock driver data for testing
const mockDriver: Driver = {
  id: 'test-driver-1',
  email: 'test@mursal.app',
  firstName: 'Test',
  lastName: 'Driver',
  phone: '+971501234567',
  role: 'driver',
  license_number: 'DL123456',
  vehicle_info: {
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    license_plate: 'ABC123',
    color: 'White',
    type: 'car',
  },
  status: 'offline',
  location: {
    latitude: 25.1972,
    longitude: 55.2744,
    timestamp: new Date().toISOString(),
  },
  rating: 4.8,
  total_deliveries: 156,
  is_online: false,
  is_available: true,
  last_active: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Simple context value
const mockContextValue: AuthContextType = {
  user: mockDriver,
  tenant: null,
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: async (credentials) => {},
  logout: async () => {},
  refreshToken: async () => {},
  updateProfile: async (updates) => {},
  updateLocation: async (location) => {},
  setOnlineStatus: async (isOnline: boolean) => {},
  clearError: () => {},
  getToken: async () => 'mock-token',
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple provider component
interface AuthProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
}) => {
  const contextValue = useMemo(() => mockContextValue, []);

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