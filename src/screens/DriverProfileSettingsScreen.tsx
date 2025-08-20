import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { Design } from '../constants/designSystem';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DriverProfile {
  vehicle_type: string;
  max_weight_capacity: number;
  max_volume_capacity: number;
  max_distance_km: number;
  allowed_delivery_types: string[];
  accepts_cash_on_delivery: boolean;
  accepts_fragile_items: boolean;
  accepts_temperature_controlled: boolean;
  max_stops_per_route: number;
  prefers_single_pickup: boolean;
}

const VEHICLE_TYPES = [
  { value: 'bicycle', label: 'Bicycle', icon: 'bicycle-outline' },
  { value: 'motorcycle', label: 'Motorcycle', icon: 'bicycle-outline' },
  { value: 'car', label: 'Car', icon: 'car-outline' },
  { value: 'van', label: 'Van', icon: 'bus-outline' },
  { value: 'truck', label: 'Truck', icon: 'bus-outline' },
];

const DELIVERY_TYPES = [
  { value: 'small_package', label: 'Small Package (< 5kg)' },
  { value: 'medium_package', label: 'Medium Package (5-20kg)' },
  { value: 'large_package', label: 'Large Package (20-50kg)' },
  { value: 'food', label: 'Food Delivery' },
  { value: 'grocery', label: 'Grocery Delivery' },
  { value: 'furniture', label: 'Furniture/Heavy Items' },
  { value: 'fragile', label: 'Fragile Items' },
  { value: 'documents', label: 'Documents' },
  { value: 'bulk', label: 'Bulk/Pallet Delivery' },
];

const DriverProfileSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DriverProfile>({
    vehicle_type: 'car',
    max_weight_capacity: 200,
    max_volume_capacity: 1.5,
    max_distance_km: 100,
    allowed_delivery_types: ['small_package', 'medium_package'],
    accepts_cash_on_delivery: true,
    accepts_fragile_items: false,
    accepts_temperature_controlled: false,
    max_stops_per_route: 20,
    prefers_single_pickup: true,
  });

  useEffect(() => {
    fetchDriverProfile();
  }, []);

  const fetchDriverProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDriverProfile();
      
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      Alert.alert('Error', 'Failed to load driver profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiService.updateDriverProfile(profile);
      
      if (response.success) {
        Alert.alert('Success', 'Driver profile updated successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving driver profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const updateVehicleType = (vehicleType: string) => {
    // Get default capabilities for the selected vehicle type
    const defaults = getDefaultCapabilitiesForVehicle(vehicleType);
    setProfile({
      ...profile,
      vehicle_type: vehicleType,
      ...defaults,
    });
  };

  const getDefaultCapabilitiesForVehicle = (vehicleType: string) => {
    const defaults: Record<string, any> = {
      bicycle: {
        max_weight_capacity: 20,
        max_volume_capacity: 0.1,
        max_distance_km: 15,
        allowed_delivery_types: ['small_package', 'food', 'documents'],
        max_stops_per_route: 8,
      },
      motorcycle: {
        max_weight_capacity: 30,
        max_volume_capacity: 0.2,
        max_distance_km: 40,
        allowed_delivery_types: ['small_package', 'medium_package', 'food', 'documents', 'fragile'],
        max_stops_per_route: 12,
      },
      car: {
        max_weight_capacity: 200,
        max_volume_capacity: 1.5,
        max_distance_km: 100,
        allowed_delivery_types: ['small_package', 'medium_package', 'large_package', 'food', 'grocery', 'fragile', 'documents'],
        max_stops_per_route: 20,
      },
      van: {
        max_weight_capacity: 1000,
        max_volume_capacity: 8,
        max_distance_km: 200,
        allowed_delivery_types: ['small_package', 'medium_package', 'large_package', 'grocery', 'furniture', 'fragile', 'documents', 'bulk'],
        max_stops_per_route: 30,
      },
      truck: {
        max_weight_capacity: 5000,
        max_volume_capacity: 20,
        max_distance_km: 500,
        allowed_delivery_types: ['medium_package', 'large_package', 'furniture', 'bulk'],
        max_stops_per_route: 50,
      },
    };

    return defaults[vehicleType] || defaults.car;
  };

  const toggleDeliveryType = (deliveryType: string) => {
    const currentTypes = profile.allowed_delivery_types;
    const newTypes = currentTypes.includes(deliveryType)
      ? currentTypes.filter(t => t !== deliveryType)
      : [...currentTypes, deliveryType];
    
    setProfile({ ...profile, allowed_delivery_types: newTypes });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Design.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Design.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Profile Settings</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={styles.saveButton}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Design.colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Type</Text>
          <View style={styles.vehicleTypeContainer}>
            {VEHICLE_TYPES.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.value}
                style={[
                  styles.vehicleTypeCard,
                  profile.vehicle_type === vehicle.value && styles.vehicleTypeCardActive,
                ]}
                onPress={() => updateVehicleType(vehicle.value)}
              >
                <Ionicons 
                  name={vehicle.icon as any} 
                  size={32} 
                  color={profile.vehicle_type === vehicle.value ? Design.colors.primary : Design.colors.textSecondary} 
                />
                <Text style={[
                  styles.vehicleTypeLabel,
                  profile.vehicle_type === vehicle.value && styles.vehicleTypeLabelActive,
                ]}>
                  {vehicle.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Capabilities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Capabilities</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max Weight Capacity (kg)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputValue}>{profile.max_weight_capacity}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max Distance (km)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputValue}>{profile.max_distance_km}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max Stops per Route</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputValue}>{profile.max_stops_per_route}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowed Delivery Types</Text>
          <View style={styles.deliveryTypesContainer}>
            {DELIVERY_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.deliveryTypeChip,
                  profile.allowed_delivery_types.includes(type.value) && styles.deliveryTypeChipActive,
                ]}
                onPress={() => toggleDeliveryType(type.value)}
              >
                <Text style={[
                  styles.deliveryTypeChipText,
                  profile.allowed_delivery_types.includes(type.value) && styles.deliveryTypeChipTextActive,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Preferences</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Accept Cash on Delivery</Text>
            <Switch
              value={profile.accepts_cash_on_delivery}
              onValueChange={(value) => setProfile({ ...profile, accepts_cash_on_delivery: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Accept Fragile Items</Text>
            <Switch
              value={profile.accepts_fragile_items}
              onValueChange={(value) => setProfile({ ...profile, accepts_fragile_items: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Temperature Controlled Delivery</Text>
            <Switch
              value={profile.accepts_temperature_controlled}
              onValueChange={(value) => setProfile({ ...profile, accepts_temperature_controlled: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Prefer Single Pickup Location</Text>
            <Switch
              value={profile.prefers_single_pickup}
              onValueChange={(value) => setProfile({ ...profile, prefers_single_pickup: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.md,
    backgroundColor: Design.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  backButton: {
    padding: Design.spacing.xs,
  },
  headerTitle: {
    ...Design.typography.h3,
    color: Design.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Design.spacing.md,
  },
  saveButton: {
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.sm,
  },
  saveButtonText: {
    ...Design.typography.button,
    color: Design.colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Design.typography.body,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing.md,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Design.colors.background,
    marginVertical: Design.spacing.sm,
    padding: Design.spacing.md,
  },
  sectionTitle: {
    ...Design.typography.h4,
    color: Design.colors.textPrimary,
    marginBottom: Design.spacing.md,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Design.spacing.sm,
  },
  vehicleTypeCard: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    padding: Design.spacing.md,
    borderRadius: Design.borderRadius.md,
    borderWidth: 2,
    borderColor: Design.colors.border,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  vehicleTypeCardActive: {
    borderColor: Design.colors.primary,
    backgroundColor: Design.colors.primary + '10',
  },
  vehicleTypeLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing.xs,
  },
  vehicleTypeLabelActive: {
    color: Design.colors.primary,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Design.spacing.md,
  },
  inputLabel: {
    ...Design.typography.label,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing.xs,
  },
  inputContainer: {
    backgroundColor: Design.colors.backgroundSecondary,
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.sm,
    borderRadius: Design.borderRadius.sm,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  inputValue: {
    ...Design.typography.body,
    color: Design.colors.textPrimary,
  },
  deliveryTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Design.spacing.sm,
  },
  deliveryTypeChip: {
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.sm,
    borderRadius: Design.borderRadius.full,
    borderWidth: 1,
    borderColor: Design.colors.border,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  deliveryTypeChipActive: {
    borderColor: Design.colors.primary,
    backgroundColor: Design.colors.primary,
  },
  deliveryTypeChipText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  deliveryTypeChipTextActive: {
    color: Design.colors.white,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Design.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  switchLabel: {
    ...Design.typography.body,
    color: Design.colors.textPrimary,
    flex: 1,
  },
});

export default DriverProfileSettingsScreen;