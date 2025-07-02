import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure Storage utility for sensitive data
 * Uses Keychain on iOS and Keystore on Android for tokens
 * Falls back to AsyncStorage for non-sensitive data
 */
class SecureStorage {
  private static readonly SERVICE_NAME = 'MursalDriverApp';

  /**
   * Store sensitive data (tokens, passwords) securely
   */
  static async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(
        key,
        key, // username (we use the key as username)
        value // password (actual value)
      );
    } catch (error) {
      console.error('Error storing secure item:', error);
      // Fallback to AsyncStorage (less secure but better than nothing)
      await AsyncStorage.setItem(`secure_${key}`, value);
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  static async getSecureItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      if (credentials && credentials.password) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      // Fallback to AsyncStorage
      try {
        return await AsyncStorage.getItem(`secure_${key}`);
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Remove sensitive data securely
   */
  static async removeSecureItem(key: string): Promise<void> {
    try {
      await Keychain.resetInternetCredentials({ server: key });
    } catch (error) {
      console.error('Error removing secure item:', error);
      // Fallback to AsyncStorage
      try {
        await AsyncStorage.removeItem(`secure_${key}`);
      } catch (fallbackError) {
        console.error('Fallback removal also failed:', fallbackError);
      }
    }
  }

  /**
   * Store auth token securely
   */
  static async setAuthToken(token: string): Promise<void> {
    return this.setSecureItem('auth_token', token);
  }

  /**
   * Get auth token securely
   */
  static async getAuthToken(): Promise<string | null> {
    return this.getSecureItem('auth_token');
  }

  /**
   * Remove auth token securely
   */
  static async removeAuthToken(): Promise<void> {
    return this.removeSecureItem('auth_token');
  }

  /**
   * Store refresh token securely
   */
  static async setRefreshToken(token: string): Promise<void> {
    return this.setSecureItem('refresh_token', token);
  }

  /**
   * Get refresh token securely
   */
  static async getRefreshToken(): Promise<string | null> {
    return this.getSecureItem('refresh_token');
  }

  /**
   * Remove refresh token securely
   */
  static async removeRefreshToken(): Promise<void> {
    return this.removeSecureItem('refresh_token');
  }

  /**
   * Clear all secure data
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.removeAuthToken(),
        this.removeRefreshToken(),
      ]);
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  }

  /**
   * Check if biometric authentication is available
   */
  static async isBiometricAuthAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported biometry type
   */
  static async getBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      return null;
    }
  }
}

export default SecureStorage;