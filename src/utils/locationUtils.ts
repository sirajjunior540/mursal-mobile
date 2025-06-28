/**
 * Calculate the distance between two geographical points using the Haversine formula
 * @param lat1 Latitude of the first point
 * @param lon1 Longitude of the first point
 * @param lat2 Latitude of the second point
 * @param lon2 Longitude of the second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 * @param distanceInKm Distance in kilometers
 * @returns Formatted distance string
 */
export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  }
  return `${distanceInKm.toFixed(1)}km`;
};

/**
 * Calculate estimated travel time based on distance
 * @param distanceInKm Distance in kilometers
 * @param averageSpeedKmh Average speed in km/h (default: 40 km/h for city driving)
 * @returns Estimated time in minutes
 */
export const calculateEstimatedTime = (
  distanceInKm: number,
  averageSpeedKmh: number = 40
): number => {
  const timeInHours = distanceInKm / averageSpeedKmh;
  return Math.round(timeInHours * 60);
};

/**
 * Format time for display
 * @param minutes Time in minutes
 * @returns Formatted time string
 */
export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Get location permission status and request if needed
 * @returns Promise<boolean> True if permission granted
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { Platform, PermissionsAndroid } = require('react-native');
    
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to show distance to delivery addresses.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    // iOS permissions are handled through Info.plist and location service usage
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current location
 * @returns Promise with current location coordinates
 */
export const getCurrentLocation = (): Promise<{latitude: number; longitude: number}> => {
  return new Promise((resolve, reject) => {
    const Geolocation = require('@react-native-community/geolocation').default;
    
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
};

/**
 * Open maps app for navigation
 * @param destinationLat Destination latitude
 * @param destinationLng Destination longitude
 * @param originLat Optional origin latitude (current location if not provided)
 * @param originLng Optional origin longitude (current location if not provided)
 */
export const openMapsForNavigation = async (
  destinationLat: number,
  destinationLng: number,
  originLat?: number,
  originLng?: number
): Promise<void> => {
  try {
    const { Platform, Linking } = require('react-native');
    
    let url: string;
    
    if (Platform.OS === 'ios') {
      if (originLat && originLng) {
        url = `maps://app?saddr=${originLat},${originLng}&daddr=${destinationLat},${destinationLng}&dirflg=d`;
      } else {
        url = `maps://app?daddr=${destinationLat},${destinationLng}&dirflg=d`;
      }
    } else {
      // Android - Google Maps
      if (originLat && originLng) {
        url = `google.navigation:q=${destinationLat},${destinationLng}&mode=d`;
      } else {
        url = `google.navigation:q=${destinationLat},${destinationLng}&mode=d`;
      }
    }
    
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback to Google Maps web
      const origin = originLat && originLng ? `${originLat},${originLng}` : '';
      const destination = `${destinationLat},${destinationLng}`;
      const fallbackUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    console.error('Error opening maps:', error);
    throw error;
  }
};

/**
 * Check if coordinates are valid
 * @param lat Latitude
 * @param lng Longitude
 * @returns True if coordinates are valid
 */
export const isValidCoordinate = (lat: number | null | undefined, lng: number | null | undefined): boolean => {
  return (
    lat !== null &&
    lat !== undefined &&
    lng !== null &&
    lng !== undefined &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/**
 * Convert coordinates to a formatted address string for display
 * @param lat Latitude
 * @param lng Longitude
 * @returns Formatted coordinate string
 */
export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};