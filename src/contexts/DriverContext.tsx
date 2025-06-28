import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { DriverContextType, Driver, DriverBalance } from '../types';
import { STORAGE_KEYS } from '../constants';
import { Storage } from '../utils';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

// Action Types
type DriverAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DRIVER'; payload: Driver }
  | { type: 'SET_BALANCE'; payload: DriverBalance }
  | { type: 'UPDATE_ONLINE_STATUS'; payload: boolean }
  | { type: 'CLEAR_DATA' };

// State Type
interface DriverState {
  driver: Driver | null;
  balance: DriverBalance | null;
  isLoading: boolean;
  error: string | null;
}

// Initial State
const initialState: DriverState = {
  driver: null,
  balance: null,
  isLoading: false,
  error: null,
};

// Reducer
const driverReducer = (state: DriverState, action: DriverAction): DriverState => {
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
    case 'SET_DRIVER':
      return {
        ...state,
        driver: action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_BALANCE':
      return {
        ...state,
        balance: action.payload,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_ONLINE_STATUS':
      return {
        ...state,
        driver: state.driver 
          ? { ...state.driver, isOnline: action.payload }
          : null,
      };
    case 'CLEAR_DATA':
      return {
        ...state,
        driver: null,
        balance: null,
        error: null,
      };
    default:
      return state;
  }
};

// Context
const DriverContext = createContext<DriverContextType | undefined>(undefined);

// Provider Component
interface DriverProviderProps {
  children: ReactNode;
}

export const DriverProvider: React.FC<DriverProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(driverReducer, initialState);
  const { isLoggedIn, user } = useAuth();

  // Load driver data when logged in
  useEffect(() => {
    const initializeDriver = async () => {
      if (isLoggedIn) {
        console.log('🚗 Initializing driver context...');

        // Load driver profile and balance
        await getDriverProfile();
        await getDriverBalance();

        // Initialize location service
        try {
          const { locationService } = await import('../services/locationService');
          await locationService.initialize();
          console.log('✅ Location service initialized in DriverContext');
        } catch (error) {
          console.error('❌ Error initializing location service:', error);
        }

        // Initialize push notifications
        try {
          const { PushNotificationClient } = await import('../sdk/pushNotificationClient');
          const pushClient = new PushNotificationClient({});

          pushClient.setCallbacks({
            onNotification: (data) => {
              console.log('🔔 Push notification received:', data);
            },
            onRegistration: async (token) => {
              console.log('📱 FCM token received:', token);

              // Send token to backend
              try {
                const response = await apiService.updateFcmToken(token);
                if (response.success) {
                  console.log('✅ FCM token sent to backend');
                } else {
                  console.error('❌ Failed to send FCM token to backend:', response.error);
                }
              } catch (error) {
                console.error('❌ Error sending FCM token to backend:', error);
              }
            },
            onRegistrationError: (error) => {
              console.warn('⚠️ Push notification registration error (this is expected if Firebase is not fully configured):', error);
            }
          });

          await pushClient.start();
          console.log('✅ Push notification client initialized');
        } catch (error) {
          console.warn('⚠️ Push notifications not available (this is expected if Firebase is not fully configured):', error);
          // Continue without push notifications - the app will use polling/websocket instead
        }
      } else {
        console.log('🚪 Clearing driver data and stopping location tracking...');
        dispatch({ type: 'CLEAR_DATA' });

        // Stop location tracking when logged out
        try {
          const { locationService } = await import('../services/locationService');
          locationService.stopLocationTracking();
        } catch (error) {
          console.error('Error stopping location tracking:', error);
        }
      }
    };

    initializeDriver();
  }, [isLoggedIn]);

  const getDriverProfile = async (): Promise<void> => {
    if (state.isLoading) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Try to get cached driver data first
      const cachedDriver = await Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
      if (cachedDriver) {
        dispatch({ type: 'SET_DRIVER', payload: cachedDriver });
      }

      // Fetch fresh data from API
      const response = await apiService.getDriverProfile();

      if (response.success && response.data) {
        dispatch({ type: 'SET_DRIVER', payload: response.data });

        // Update cache
        await Storage.setItem(STORAGE_KEYS.DRIVER_DATA, response.data);
      } else {
        if (!cachedDriver) {
          throw new Error(response.error || 'Failed to fetch driver profile');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch driver profile';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  const getDriverBalance = async (): Promise<void> => {
    try {
      const response = await apiService.getDriverBalance();

      if (response.success && response.data) {
        dispatch({ type: 'SET_BALANCE', payload: response.data });
      } else {
        throw new Error(response.error || 'Failed to fetch driver balance');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch driver balance';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  const updateOnlineStatus = async (isOnline: boolean): Promise<void> => {
    try {
      const response = await apiService.updateDriverStatus(isOnline);

      if (response.success) {
        dispatch({ type: 'UPDATE_ONLINE_STATUS', payload: isOnline });

        // Update cached driver data
        if (state.driver) {
          const updatedDriver = { ...state.driver, isOnline };
          await Storage.setItem(STORAGE_KEYS.DRIVER_DATA, updatedDriver);
        }

        // Start or stop location tracking based on online status
        const { locationService } = await import('../services/locationService');
        if (isOnline) {
          console.log('🚀 Driver going online - starting location tracking');
          await locationService.startLocationTracking();

          // Force an immediate location update when going online
          try {
            console.log('⚡ Forcing immediate location update on going online...');
            const currentLocation = await locationService.getCurrentLocation();
            console.log(`📍 Got current location: ${currentLocation.latitude}, ${currentLocation.longitude}`);

            const { apiService } = await import('../services/api');
            const updateResult = await apiService.updateLocation(
              currentLocation.latitude, 
              currentLocation.longitude
            );

            if (updateResult.success) {
              console.log('✅ Immediate location update successful');
            } else {
              console.error('❌ Immediate location update failed:', updateResult.error);
            }
          } catch (error) {
            console.error('⚠️ Failed to get/update immediate location:', error);
          }
        } else {
          console.log('🛑 Driver going offline - stopping location tracking');
          locationService.stopLocationTracking();
        }
      } else {
        throw new Error(response.error || 'Failed to update online status');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update online status';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const requestWithdrawal = async (amount: number): Promise<void> => {
    try {
      const response = await apiService.requestWithdrawal(amount);

      if (response.success) {
        // Refresh balance after withdrawal request
        await getDriverBalance();
      } else {
        throw new Error(response.error || 'Failed to request withdrawal');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request withdrawal';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const addDeposit = async (amount: number): Promise<void> => {
    try {
      const response = await apiService.addDeposit(amount);

      if (response.success) {
        // Refresh balance after deposit
        await getDriverBalance();
      } else {
        throw new Error(response.error || 'Failed to add deposit');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add deposit';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const recordCashCollection = async (orderId: string, amount: number): Promise<void> => {
    try {
      const response = await apiService.recordCashCollection(orderId, amount);

      if (response.success) {
        // Refresh balance after cash collection
        await getDriverBalance();
      } else {
        throw new Error(response.error || 'Failed to record cash collection');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record cash collection';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const contextValue: DriverContextType = {
    driver: state.driver,
    balance: state.balance,
    isLoading: state.isLoading,
    error: state.error,
    updateOnlineStatus,
    getDriverProfile,
    getDriverBalance,
    requestWithdrawal,
    addDeposit,
    recordCashCollection,
  };

  return (
    <DriverContext.Provider value={contextValue}>
      {children}
    </DriverContext.Provider>
  );
};

// Hook
export const useDriver = (): DriverContextType => {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
};
