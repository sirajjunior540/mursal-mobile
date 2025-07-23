import { Buffer } from 'buffer';

/**
 * Encryption utilities for React Native
 * Uses base64 encoding as a simple encryption method
 * Note: This is basic obfuscation, not true encryption
 * For production, consider using react-native-crypto or similar
 */

// Simple XOR key for obfuscation
const XOR_KEY = 'mursal-2024-secure-key-for-api-protection';

/**
 * Simple XOR encryption/decryption
 */
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Encrypt sensitive data using XOR + base64
 * @param data The string data to encrypt
 * @returns Encrypted data as base64 string
 */
export const encryptSensitiveData = (data: string): string => {
  try {
    // XOR encrypt
    const xorEncrypted = xorEncrypt(data, XOR_KEY);
    
    // Base64 encode
    const base64 = Buffer.from(xorEncrypted, 'utf8').toString('base64');
    
    // Add a marker to indicate our encryption
    return `MURSAL_ENC:${base64}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    // Fallback to base64 encoding
    return Buffer.from(data, 'utf8').toString('base64');
  }
};

/**
 * Decrypt sensitive data using XOR + base64
 * @param encryptedData The encrypted data as base64 string
 * @returns Decrypted string data
 */
export const decryptSensitiveData = (encryptedData: string): string => {
  try {
    // Check if it's our encryption format
    if (encryptedData.startsWith('MURSAL_ENC:')) {
      const base64Data = encryptedData.substring('MURSAL_ENC:'.length);
      
      // Base64 decode
      const xorEncrypted = Buffer.from(base64Data, 'base64').toString('utf8');
      
      // XOR decrypt (XOR is symmetric)
      const decrypted = xorEncrypt(xorEncrypted, XOR_KEY);
      
      return decrypted;
    }
    
    // Try the frontend Web Crypto format (salt:iv:encrypted)
    if (encryptedData.includes(':') && encryptedData.split(':').length === 3) {
      // This is from the web frontend encryption, we can't decrypt it here
      // without the Web Crypto API, so return as-is
      console.warn('Cannot decrypt Web Crypto encrypted data in React Native');
      return encryptedData;
    }
    
    // Fallback: try base64 decode
    try {
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
      // Check if it looks like a valid API key
      if (decoded.includes('AIza') || decoded.includes('pk.') || decoded.length < 100) {
        return decoded;
      }
    } catch {
      // Not base64
    }
    
    // If all else fails, return as-is (might be unencrypted)
    return encryptedData;
  } catch (error) {
    console.error('Decryption failed:', error);
    // Return as-is if decryption fails
    return encryptedData;
  }
};

/**
 * Check if React Native crypto is supported
 * @returns true (always supported with CryptoJS)
 */
export const isCryptoSupported = (): boolean => {
  return true;
};

/**
 * Helper to detect if a string is encrypted
 * @param data The string to check
 * @returns true if the string appears to be encrypted
 */
export const isEncrypted = (data: string): boolean => {
  // Check for our encryption format
  if (data.includes(':') && data.split(':').length === 2) {
    const parts = data.split(':');
    // Check if both parts are base64
    try {
      atob(parts[0]);
      atob(parts[1]);
      return true;
    } catch {
      // Not base64
    }
  }
  
  // Check if it's a long base64 string (likely encrypted)
  if (data.length > 100) {
    try {
      atob(data);
      return true;
    } catch {
      // Not base64
    }
  }
  
  return false;
};