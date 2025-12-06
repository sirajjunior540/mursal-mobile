/**
 * Pickup Verification Service
 *
 * Handles QR code verification and manual pickup confirmation for orders
 */

import { apiService } from './api';
import { locationService } from './locationService';

export interface PickupVerificationResult {
  success: boolean;
  orderId: string;
  message: string;
  newStatus?: string;
  timestamp?: string;
}

interface PickupVerificationRequest {
  qr_code_data?: string;
  current_location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  manual_confirmation?: boolean;
  manual_reason?: string;
}

/**
 * Verify pickup using QR code
 *
 * @param qrData - The scanned QR code data
 * @param orderId - The order ID to verify
 * @param currentLocation - Optional current location (will fetch if not provided)
 * @returns Verification result
 */
export async function verifyPickupQR(
  qrData: string,
  orderId: string,
  currentLocation?: { lat: number; lng: number }
): Promise<PickupVerificationResult> {
  try {
    console.log('[PickupVerificationService] Verifying pickup QR for order:', orderId);

    // Get current location if not provided
    let location = currentLocation;
    if (!location) {
      try {
        const coords = await locationService.getCurrentLocation();
        location = {
          lat: coords.latitude,
          lng: coords.longitude,
        };
        console.log('[PickupVerificationService] Current location:', location);
      } catch (error) {
        console.warn('[PickupVerificationService] Failed to get location:', error);
        // Continue without location - backend will handle
      }
    }

    // Prepare request payload
    const payload: PickupVerificationRequest = {
      qr_code_data: qrData,
      manual_confirmation: false,
    };

    if (location) {
      payload.current_location = {
        lat: location.lat,
        lng: location.lng,
      };
    }

    // Call API endpoint
    const response = await apiService.verifyOrderPickup(orderId, payload);

    if (response.success && response.data) {
      console.log('[PickupVerificationService] Pickup verified successfully');

      return {
        success: true,
        orderId: orderId,
        message: 'Pickup verified successfully',
        newStatus: response.data.status || 'picked_up',
        timestamp: new Date().toISOString(),
      };
    } else {
      // Handle specific error messages
      const errorMessage = response.error || 'Failed to verify pickup';
      console.error('[PickupVerificationService] Verification failed:', errorMessage);

      return {
        success: false,
        orderId: orderId,
        message: errorMessage,
      };
    }
  } catch (error) {
    console.error('[PickupVerificationService] Exception during verification:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific error types
    if (errorMessage.includes('QR code expired')) {
      return {
        success: false,
        orderId: orderId,
        message: 'QR code has expired. Please request a new one from the merchant.',
      };
    }

    if (errorMessage.includes('Wrong order')) {
      return {
        success: false,
        orderId: orderId,
        message: 'This QR code belongs to a different order.',
      };
    }

    if (errorMessage.includes('location')) {
      return {
        success: false,
        orderId: orderId,
        message: 'You are too far from the pickup location. Please verify you are at the merchant location.',
      };
    }

    if (errorMessage.includes('Network request failed') || errorMessage.includes('network')) {
      return {
        success: false,
        orderId: orderId,
        message: 'Network error. Please check your connection and try again.',
      };
    }

    return {
      success: false,
      orderId: orderId,
      message: errorMessage,
    };
  }
}

/**
 * Manual pickup confirmation (fallback when QR scan fails)
 *
 * @param orderId - The order ID to confirm
 * @param reason - Reason for manual confirmation
 * @param currentLocation - Optional current location
 * @returns Verification result
 */
export async function manualPickupConfirmation(
  orderId: string,
  reason: string,
  currentLocation?: { lat: number; lng: number }
): Promise<PickupVerificationResult> {
  try {
    console.log('[PickupVerificationService] Manual pickup confirmation for order:', orderId);
    console.log('[PickupVerificationService] Reason:', reason);

    // Get current location if not provided
    let location = currentLocation;
    if (!location) {
      try {
        const coords = await locationService.getCurrentLocation();
        location = {
          lat: coords.latitude,
          lng: coords.longitude,
        };
        console.log('[PickupVerificationService] Current location:', location);
      } catch (error) {
        console.warn('[PickupVerificationService] Failed to get location:', error);
        // Continue without location - backend will handle
      }
    }

    // Prepare request payload
    const payload: PickupVerificationRequest = {
      manual_confirmation: true,
      manual_reason: reason,
    };

    if (location) {
      payload.current_location = {
        lat: location.lat,
        lng: location.lng,
      };
    }

    // Call API endpoint
    const response = await apiService.verifyOrderPickup(orderId, payload);

    if (response.success && response.data) {
      console.log('[PickupVerificationService] Manual pickup confirmed successfully');

      return {
        success: true,
        orderId: orderId,
        message: 'Pickup confirmed manually',
        newStatus: response.data.status || 'picked_up',
        timestamp: new Date().toISOString(),
      };
    } else {
      const errorMessage = response.error || 'Failed to confirm pickup';
      console.error('[PickupVerificationService] Manual confirmation failed:', errorMessage);

      return {
        success: false,
        orderId: orderId,
        message: errorMessage,
      };
    }
  } catch (error) {
    console.error('[PickupVerificationService] Exception during manual confirmation:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific error types
    if (errorMessage.includes('location')) {
      return {
        success: false,
        orderId: orderId,
        message: 'You are too far from the pickup location. Manual confirmation requires you to be at the merchant.',
      };
    }

    if (errorMessage.includes('Network request failed') || errorMessage.includes('network')) {
      return {
        success: false,
        orderId: orderId,
        message: 'Network error. Please check your connection and try again.',
      };
    }

    return {
      success: false,
      orderId: orderId,
      message: errorMessage,
    };
  }
}

/**
 * Validate QR code format before sending to backend
 *
 * @param qrData - The QR code data to validate
 * @returns Validation result with parsed data
 */
export function validateQRCodeFormat(qrData: string): {
  isValid: boolean;
  orderId?: string;
  type?: string;
  error?: string;
} {
  if (!qrData || qrData.trim().length === 0) {
    return {
      isValid: false,
      error: 'QR code data is empty',
    };
  }

  try {
    // Try parsing as JSON
    const parsed = JSON.parse(qrData);

    if (parsed.order_id) {
      return {
        isValid: true,
        orderId: parsed.order_id,
        type: parsed.type || 'unknown',
      };
    }

    return {
      isValid: false,
      error: 'QR code does not contain order_id',
    };
  } catch {
    // Not JSON - check if it's a simple order number format
    const cleanData = qrData.trim();

    // Check patterns like "ORDER123", "ORD123", or just "123"
    if (cleanData.match(/^(ORD|ORDER)?\d+$/i)) {
      const orderId = cleanData.replace(/^(ORD|ORDER)/i, '');
      return {
        isValid: true,
        orderId: orderId,
        type: 'simple',
      };
    }

    return {
      isValid: false,
      error: 'Invalid QR code format',
    };
  }
}

/**
 * Check if driver is within acceptable range of pickup location
 *
 * @param driverLocation - Driver's current location
 * @param pickupLocation - Pickup location coordinates
 * @param maxDistanceMeters - Maximum acceptable distance in meters (default: 500m)
 * @returns Whether driver is in range
 */
export function isWithinPickupRange(
  driverLocation: { lat: number; lng: number },
  pickupLocation: { lat: number; lng: number },
  maxDistanceMeters: number = 500
): boolean {
  const distance = calculateDistance(
    driverLocation.lat,
    driverLocation.lng,
    pickupLocation.lat,
    pickupLocation.lng
  );

  console.log('[PickupVerificationService] Distance to pickup:', distance, 'meters');

  return distance <= maxDistanceMeters;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
