import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage utility for handling AsyncStorage operations
 */
export class Storage {
  /**
   * Store data in AsyncStorage
   */
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value, (_storageKey, val) => {
        // Handle Date objects
        if (val instanceof Date) {
          return { __type: 'Date', value: val.toISOString() };
        }
        return val;
      });
      await AsyncStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Error storing data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from AsyncStorage
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const serializedValue = await AsyncStorage.getItem(key);
      if (serializedValue === null) {
        return null;
      }

      const parsed = JSON.parse(serializedValue, (_parseKey, val) => {
        // Handle Date objects
        if (val && typeof val === 'object' && val.__type === 'Date') {
          return new Date(val.value);
        }
        return val;
      });

      return parsed;
    } catch (error) {
      console.error(`Error retrieving data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data from AsyncStorage
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove multiple items from AsyncStorage
   */
  static async removeItems(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error removing multiple items:', error);
      throw error;
    }
  }

  /**
   * Clear all data from AsyncStorage
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw error;
    }
  }

  /**
   * Get all keys from AsyncStorage
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }
}