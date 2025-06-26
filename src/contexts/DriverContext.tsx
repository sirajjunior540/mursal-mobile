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
    if (isLoggedIn) {
      getDriverProfile();
      getDriverBalance();
    } else {
      dispatch({ type: 'CLEAR_DATA' });
    }
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