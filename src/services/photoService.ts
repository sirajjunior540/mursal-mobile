// import { apiEndpoints } from './apiEndpoints';
import { PhotoCaptureResult } from '../components/Photo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getTenantHost } from '../config/environment';
import { STORAGE_KEYS } from '../constants';
import { SecureStorage } from '../utils';
import { Platform } from 'react-native';

interface UploadPhotoParams {
  deliveryId: string;
  photo: PhotoCaptureResult;
}

interface PhotoRequirements {
  is_photo_required: boolean;
  required_reasons: string[];
  can_complete_delivery: boolean;
  completion_error: string | null;
  mandatory_reasons: string[];
}

interface DeliveryPhoto {
  id: string;
  photo_url: string;
  reason: string;
  reason_display: string;
  notes?: string;
  alternate_recipient_name?: string;
  alternate_recipient_relation?: string;
  uploaded_by_name: string;
  created_at: string;
  is_verified: boolean;
  verified_by_name?: string;
  verified_at?: string;
  latitude?: number;
  longitude?: number;
}

class PhotoService {
  /**
   * Upload a photo for a delivery
   */
  async uploadDeliveryPhoto({ deliveryId, photo }: UploadPhotoParams): Promise<DeliveryPhoto> {
    try {
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const tenantId = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID);
      const tenantHost = getTenantHost(tenantId || undefined);

      // Create form data
      const formData = new FormData();
      
      // Add photo file - React Native requires specific format
      // Handle different URI formats for Android/iOS
      let photoUri = photo.uri;
      
      // Android content:// URIs should be used as-is
      // file:// URIs should be used as-is
      // Relative paths should get file:// prefix on Android
      if (Platform.OS === 'android' && photoUri && 
          !photoUri.startsWith('file://') && 
          !photoUri.startsWith('content://') && 
          !photoUri.startsWith('http')) {
        photoUri = `file://${photoUri}`;
      }
      
      const photoFile = {
        uri: photoUri,
        type: photo.type || 'image/jpeg',
        name: photo.fileName || `delivery_photo_${Date.now()}.jpg`,
      };
      
      console.log('Uploading photo with FormData:', {
        uri: photoFile.uri,
        type: photoFile.type,
        name: photoFile.name,
        originalUri: photo.uri,
      });
      
      // React Native FormData requires this exact format
      formData.append('photo', photoFile as any);
      
      // If base64 is provided, we could use it as fallback
      // But for now, let's use the file URI which is more efficient

      // Add other fields
      formData.append('reason', photo.reason);
      formData.append('notes', photo.notes || '');
      
      if (photo.latitude) {
        formData.append('latitude', photo.latitude.toString());
      }
      
      if (photo.longitude) {
        formData.append('longitude', photo.longitude.toString());
      }
      
      if (photo.alternateRecipientName) {
        formData.append('alternate_recipient_name', photo.alternateRecipientName);
      }
      
      if (photo.alternateRecipientRelation) {
        formData.append('alternate_recipient_relation', photo.alternateRecipientRelation);
      }

      // Validate delivery ID
      if (!deliveryId || deliveryId === 'undefined' || deliveryId === 'null') {
        throw new Error('Invalid delivery ID');
      }
      
      // Changed from /delivery/deliveries/ to /orders/ for delivery-service
      const url = getApiUrl(`/api/v1/orders/${deliveryId}/upload-photo/`);
      console.log('Upload URL:', url);
      console.log('Delivery ID:', deliveryId);
      console.log('Tenant:', { tenantId, tenantHost });
      console.log('FormData fields:', {
        reason: photo.reason,
        notes: photo.notes || '',
        hasPhoto: !!photoFile,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Host': tenantHost,
          'X-Tenant-ID': tenantId || '',
          // Do NOT set Content-Type for FormData - let browser set it with boundary
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        
        // Common error messages
        if (response.status === 404) {
          throw new Error('Delivery not found. Please refresh and try again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to upload photos for this delivery.');
        } else if (response.status === 400) {
          // Parse specific validation errors
          if (errorData.error?.includes('reason')) {
            throw new Error('Invalid photo reason. Please try again.');
          } else if (errorData.error?.includes('photo')) {
            throw new Error('Invalid photo file. Please select a valid image.');
          }
        }
        
        throw new Error(errorData.error || errorData.detail || `Upload failed: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      return data.photo || data;
    } catch (error) {
      console.error('Photo upload error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        deliveryId,
      });
      throw error;
    }
  }

  /**
   * Get photos for a delivery
   */
  async getDeliveryPhotos(
    deliveryId: string,
    reason?: string,
    verifiedOnly?: boolean
  ): Promise<DeliveryPhoto[]> {
    try {
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const tenantId = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID);
      const tenantHost = getTenantHost(tenantId || undefined);

      const params = new URLSearchParams();
      if (reason) params.append('reason', reason);
      if (verifiedOnly) params.append('verified_only', 'true');

      // Changed from /delivery/deliveries/ to /orders/ for delivery-service
      const url = getApiUrl(`/api/v1/orders/${deliveryId}/photos/${
        params.toString() ? `?${params.toString()}` : ''
      }`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Host': tenantHost,
          'X-Tenant-ID': tenantId || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch photos: ${response.status}`);
      }

      const data = await response.json();
      return data.photos || [];
    } catch (error) {
      console.error('Fetch photos error:', error);
      throw error;
    }
  }

  /**
   * Check photo requirements for a delivery
   */
  async checkPhotoRequirements(
    deliveryId: string,
    hasSignature?: boolean
  ): Promise<PhotoRequirements> {
    try {
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const tenantId = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID);
      const tenantHost = getTenantHost(tenantId || undefined);

      const params = new URLSearchParams();
      if (hasSignature !== undefined) {
        params.append('has_signature', hasSignature.toString());
      }

      // Changed from /delivery/deliveries/ to /orders/ for delivery-service
      const url = getApiUrl(`/api/v1/orders/${deliveryId}/photo-requirements/${
        params.toString() ? `?${params.toString()}` : ''
      }`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Host': tenantHost,
          'X-Tenant-ID': tenantId || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch requirements: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Photo requirements error:', error);
      throw error;
    }
  }

  /**
   * Upload a photo from base64 data
   */
  async uploadPhotoFromBase64(
    deliveryId: string,
    base64Data: string,
    reason: string,
    additionalData?: {
      notes?: string;
      alternateRecipientName?: string;
      alternateRecipientRelation?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<DeliveryPhoto> {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Create photo capture result
      const photo: PhotoCaptureResult = {
        uri: URL.createObjectURL(blob),
        type: 'image/jpeg',
        fileName: `delivery_${deliveryId}_${Date.now()}.jpg`,
        fileSize: blob.size,
        base64: base64Data,
        reason,
        notes: additionalData?.notes || '',
        ...additionalData,
      };

      return await this.uploadDeliveryPhoto({ deliveryId, photo });
    } catch (error) {
      console.error('Base64 upload error:', error);
      throw error;
    }
  }

  /**
   * Save photo locally for offline upload
   */
  async savePhotoForOfflineUpload(
    deliveryId: string,
    photo: PhotoCaptureResult
  ): Promise<void> {
    try {
      const offlinePhotos = await this.getOfflinePhotos();
      
      const offlinePhoto = {
        id: `offline_${Date.now()}`,
        deliveryId,
        photo,
        timestamp: new Date().toISOString(),
      };

      offlinePhotos.push(offlinePhoto);
      
      await AsyncStorage.setItem(
        'offlineDeliveryPhotos',
        JSON.stringify(offlinePhotos)
      );
    } catch (error) {
      console.error('Save offline photo error:', error);
      throw error;
    }
  }

  /**
   * Get offline photos
   */
  async getOfflinePhotos(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('offlineDeliveryPhotos');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get offline photos error:', error);
      return [];
    }
  }

  /**
   * Upload offline photos
   */
  async uploadOfflinePhotos(): Promise<void> {
    try {
      const offlinePhotos = await this.getOfflinePhotos();
      
      if (offlinePhotos.length === 0) return;

      const uploaded = [];
      const failed = [];

      for (const offlinePhoto of offlinePhotos) {
        try {
          await this.uploadDeliveryPhoto({
            deliveryId: offlinePhoto.deliveryId,
            photo: offlinePhoto.photo,
          });
          uploaded.push(offlinePhoto.id);
        } catch (error) {
          console.error(`Failed to upload offline photo ${offlinePhoto.id}:`, error);
          failed.push(offlinePhoto);
        }
      }

      // Keep only failed photos
      await AsyncStorage.setItem(
        'offlineDeliveryPhotos',
        JSON.stringify(failed)
      );

      console.log(`Uploaded ${uploaded.length} offline photos, ${failed.length} failed`);
    } catch (error) {
      console.error('Upload offline photos error:', error);
    }
  }
}

export const photoService = new PhotoService();