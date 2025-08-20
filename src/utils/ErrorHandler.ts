/**
 * Centralized error handling utility
 */
export class ErrorHandler {
  /**
   * Handle API errors and return user-friendly messages
   */
  static handleApiError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.response) {
      // Network error with response
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return data?.message || data?.detail || 'Invalid request. Please check your input.';
        case 401:
          return 'Authentication failed. Please login again.';
        case 403:
          return 'Access denied. You do not have permission to perform this action.';
        case 404:
          return 'Resource not found. Please try again.';
        case 422:
          return data?.message || 'Validation error. Please check your input.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return data?.message || data?.detail || `Request failed with status ${status}`;
      }
    }

    if (error?.message) {
      // Handle specific error types
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        return 'Network connection error. Please check your internet connection and try again.';
      }
      
      if (error.message.includes('timeout')) {
        return 'Request timeout. Please check your connection and try again.';
      }

      if (error.message.includes('AbortError')) {
        return 'Request was cancelled. Please try again.';
      }

      return error.message;
    }

    // Default fallback
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if error is a network/connectivity issue
   */
  static isNetworkError(error: any): boolean {
    if (typeof error === 'string') {
      return error.includes('Network') || error.includes('fetch') || error.includes('timeout');
    }

    if (error?.message) {
      return error.message.includes('Network Error') || 
             error.message.includes('fetch') || 
             error.message.includes('timeout') ||
             error.message.includes('AbortError');
    }

    return false;
  }

  /**
   * Check if error is an authentication error
   */
  static isAuthError(error: any): boolean {
    if (error?.response?.status === 401) {
      return true;
    }

    if (typeof error === 'string') {
      return error.includes('Authentication') || error.includes('Unauthorized');
    }

    if (error?.message) {
      return error.message.includes('Authentication') || error.message.includes('Unauthorized');
    }

    return false;
  }

  /**
   * Check if error should trigger a retry
   */
  static shouldRetry(error: any): boolean {
    if (this.isAuthError(error)) {
      return false; // Don't retry auth errors
    }

    if (error?.response?.status) {
      const status = error.response.status;
      // Retry on server errors and rate limiting
      return status >= 500 || status === 429;
    }

    // Retry on network errors
    return this.isNetworkError(error);
  }

  /**
   * Log error for debugging (in development) or crash reporting (in production)
   */
  static logError(error: any, context?: string): void {
    const errorInfo = {
      context,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    };

    if (__DEV__) {
      console.error('Error logged:', errorInfo);
    } else {
      // In production, send to crash reporting service
      // Example: Crashlytics.recordError(error);
    }
  }
}

export default ErrorHandler;