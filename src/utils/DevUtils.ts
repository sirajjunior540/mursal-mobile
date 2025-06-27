import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from './';

/**
 * Development utilities for debugging and testing
 */
export class DevUtils {
  /**
   * Clear all app data (useful for testing fresh state)
   */
  static async clearAllData(): Promise<void> {
    try {
      console.log('Clearing all app data...');
      
      // Clear secure storage
      await SecureStorage.clearAll();
      
      // Clear AsyncStorage
      await AsyncStorage.clear();
      
      console.log('All app data cleared successfully');
    } catch (error) {
      console.error('Error clearing app data:', error);
    }
  }

  /**
   * Log current storage state
   */
  static async logStorageState(): Promise<void> {
    try {
      console.log('=== STORAGE STATE ===');
      
      // Check secure storage
      const token = await SecureStorage.getAuthToken();
      console.log('Auth Token:', token ? 'Present' : 'None');
      
      // Check AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      console.log('AsyncStorage Keys:', keys);
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}:`, value ? 'Has Data' : 'Empty');
      }
      
      console.log('=== END STORAGE STATE ===');
    } catch (error) {
      console.error('Error logging storage state:', error);
    }
  }

  /**
   * Force logout and clear all data
   */
  static async forceLogout(): Promise<void> {
    console.log('Force logout initiated...');
    await this.clearAllData();
    // You might want to also dispatch a logout action here
  }
}

// Make it available globally in development
if (__DEV__) {
  (global as any).DevUtils = DevUtils;
  console.log('DevUtils available globally. Use DevUtils.clearAllData() to reset app state.');
  
  // Auto-clear data on app start for fresh debugging
  console.log('Auto-clearing storage for fresh start...');
  DevUtils.clearAllData();
}