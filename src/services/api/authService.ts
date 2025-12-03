/**
 * Enhanced Authentication Service
 * Handles persistent login with refresh tokens and automatic token renewal
 */
import { SecureStorage } from '../../utils';
import { apiService } from '../api';

interface TokenPayload {
  exp: number;
  user_id: number;
  username: string;
}

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  /**
   * Decode JWT token to get expiry time
   */
  private decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  private isTokenExpired(token: string, bufferSeconds = 300): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    // Add buffer time (default 5 minutes) to refresh before actual expiry
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const bufferTime = bufferSeconds * 1000;
    
    return currentTime >= (expiryTime - bufferTime);
  }

  /**
   * Get time until token expires in milliseconds
   */
  private getTimeUntilExpiry(token: string, bufferSeconds = 300): number {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;
    
    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();
    const bufferTime = bufferSeconds * 1000;
    
    return Math.max(0, expiryTime - currentTime - bufferTime);
  }

  /**
   * Setup automatic token refresh
   */
  async setupAutoRefresh(): Promise<void> {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const token = await SecureStorage.getAuthToken();
    if (!token) {
      console.log('[AuthService] No token found, skipping auto-refresh setup');
      return;
    }

    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    
    if (timeUntilExpiry <= 0) {
      console.log('[AuthService] Token expired or about to expire, refreshing now');
      await this.refreshToken();
    } else {
      console.log(`[AuthService] Setting up auto-refresh in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
      
      this.refreshTimer = setTimeout(async () => {
        console.log('[AuthService] Auto-refresh timer triggered');
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Setup next refresh cycle
          await this.setupAutoRefresh();
        }
      }, timeUntilExpiry);
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      console.log('[AuthService] Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async _performRefresh(): Promise<boolean> {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (!refreshToken) {
        console.log('[AuthService] No refresh token available');
        return false;
      }

      console.log('[AuthService] Refreshing access token...');

      // Use the refreshAuthToken method from apiService
      const refreshed = await apiService.refreshAuthToken();

      if (refreshed) {
        console.log('[AuthService] Token refreshed successfully');

        // Get the new token to check expiry
        const newToken = await SecureStorage.getAuthToken();
        if (newToken) {
          const timeUntilExpiry = this.getTimeUntilExpiry(newToken);
          console.log(`[AuthService] New token expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
        }

        return true;
      } else {
        console.error('[AuthService] Failed to refresh token');
        return false;
      }
    } catch (error) {
      console.error('[AuthService] Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Check and refresh token if needed before API calls
   */
  async ensureValidToken(): Promise<boolean> {
    const token = await SecureStorage.getAuthToken();
    if (!token) {
      console.log('[AuthService] No token found');
      return false;
    }

    if (this.isTokenExpired(token)) {
      console.log('[AuthService] Token expired, attempting refresh');
      return await this.refreshToken();
    }

    return true;
  }

  /**
   * Clear refresh timer on logout
   */
  clearAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get remaining session time in seconds
   */
  async getSessionTimeRemaining(): Promise<number> {
    const token = await SecureStorage.getAuthToken();
    if (!token) return 0;
    
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;
    
    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();
    
    return Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
  }
}

// Export singleton instance
export const authService = new AuthService();