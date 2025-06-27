import { API_CONFIG } from '../constants';

/**
 * API Utilities for handling platform-specific configurations
 */
export class ApiUtils {
  /**
   * Get the appropriate base URL for the current platform
   * - Android Emulator: Uses 10.0.2.2 to access host machine
   * - iOS Simulator: Uses localhost
   * - Real devices: Uses actual domain
   */
  static getBaseUrl(): string {
    return API_CONFIG.BASE_URL;
  }

  /**
   * Get the Host header for tenant resolution
   */
  static getHostHeader(): string {
    return API_CONFIG.HOST;
  }

  /**
   * Get default headers for API requests
   */
  static getDefaultHeaders(authToken?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Host': this.getHostHeader(),
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };
  }

  /**
   * Log API request details for debugging
   */
  static logRequest(method: string, url: string, headers: Record<string, string>) {
    console.log(`🌐 API ${method}: ${url}`);
    console.log(`🏠 Host: ${headers.Host}`);
    if (headers.Authorization) {
      console.log(`🔑 Auth: ${headers.Authorization.substring(0, 20)}...`);
    }
  }

  /**
   * Check if we're running on Android emulator
   */
  static isAndroidEmulator(): boolean {
    // This is a simple check - in a real app you might want to use react-native-device-info
    return API_CONFIG.BASE_URL.includes('10.0.2.2');
  }

  /**
   * Get tenant-specific information
   */
  static getTenantInfo() {
    return {
      id: API_CONFIG.HOST.split('.')[0], // Extract tenant from subdomain
      host: API_CONFIG.HOST,
      baseUrl: API_CONFIG.BASE_URL,
    };
  }
}

export default ApiUtils;