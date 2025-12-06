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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
      <StatusBar barStyle="dark-content" backgroundColor={Design.colors.background} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={Design.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vehicle & Delivery</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Design.colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIcon}>
                <Ionicons name="car-sport-outline" size={28} color={Design.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Current vehicle</Text>
                <Text style={styles.heroValue}>{profile.vehicle_type || 'Not set'}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Stops</Text>
                <Text style={styles.heroStatValue}>{profile.max_stops_per_route}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Range</Text>
                <Text style={styles.heroStatValue}>{profile.max_distance_km} km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Vehicle Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose your vehicle</Text>
          <Text style={styles.sectionSubtitle}>We’ll tailor limits and delivery options automatically</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vehicleScroller}
          >
            {VEHICLE_TYPES.map((vehicle, idx) => (
              <TouchableOpacity
                key={vehicle.value}
                style={[
                  styles.vehicleTypeCard,
                  profile.vehicle_type === vehicle.value && styles.vehicleTypeCardActive,
                  idx === 0 && { marginLeft: 0 },
                ]}
                onPress={() => updateVehicleType(vehicle.value)}
                activeOpacity={0.9}
              >
                <Ionicons 
                  name={vehicle.icon as any} 
                  size={28} 
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
          </ScrollView>
        </View>

        {/* Capabilities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capabilities</Text>
          <View style={styles.capRow}>
            <View style={styles.capCard}>
              <Text style={styles.capLabel}>Weight</Text>
              <Text style={styles.capValue}>{profile.max_weight_capacity} kg</Text>
            </View>
            <View style={styles.capCard}>
              <Text style={styles.capLabel}>Distance</Text>
              <Text style={styles.capValue}>{profile.max_distance_km} km</Text>
            </View>
            <View style={styles.capCard}>
              <Text style={styles.capLabel}>Stops/Route</Text>
              <Text style={styles.capValue}>{profile.max_stops_per_route}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowed delivery types</Text>
          <Text style={styles.sectionSubtitle}>Tap to toggle. We’ll match you with the right jobs.</Text>
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
          <Text style={styles.sectionTitle}>Delivery preferences</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Accept cash on delivery</Text>
              <Text style={styles.switchSub}>Enable to receive COD jobs</Text>
            </View>
            <Switch
              value={profile.accepts_cash_on_delivery}
              onValueChange={(value) => setProfile({ ...profile, accepts_cash_on_delivery: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Handle fragile items</Text>
              <Text style={styles.switchSub}>Glass, electronics, or delicate goods</Text>
            </View>
            <Switch
              value={profile.accepts_fragile_items}
              onValueChange={(value) => setProfile({ ...profile, accepts_fragile_items: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Temperature control</Text>
              <Text style={styles.switchSub}>Coolers or heated bags</Text>
            </View>
            <Switch
              value={profile.accepts_temperature_controlled}
              onValueChange={(value) => setProfile({ ...profile, accepts_temperature_controlled: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Prefer single pickup</Text>
              <Text style={styles.switchSub}>One pickup, multiple drops</Text>
            </View>
            <Switch
              value={profile.prefers_single_pickup}
              onValueChange={(value) => setProfile({ ...profile, prefers_single_pickup: value })}
              trackColor={{ false: Design.colors.gray300, true: Design.colors.primary }}
              thumbColor={Design.colors.white}
            />
          </View>
        </View>

        <View style={{ height: 80 }} />
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
  },
  backButton: {
    padding: Design.spacing.xs,
    borderRadius: Design.borderRadius.full,
    backgroundColor: Design.colors.background,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Design.typography.h3,
    color: Design.colors.textPrimary,
    flex: 1,
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
  hero: {
    padding: Design.spacing.md,
    paddingTop: Design.spacing.lg,
    backgroundColor: Design.colors.background,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Design.spacing.lg,
  },
  primaryButton: {
    backgroundColor: Design.colors.primary,
    paddingHorizontal: Design.spacing.lg,
    paddingVertical: Design.spacing.sm + 2,
    borderRadius: Design.borderRadius.lg,
    minWidth: 80,
    alignItems: 'center',
    ...Design.shadows.small,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Design.colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  heroCard: {
    backgroundColor: Design.colors.backgroundSecondary,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing.lg,
    borderWidth: 1,
    borderColor: Design.colors.border,
    ...Design.shadows.small,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: Design.borderRadius.full,
    backgroundColor: Design.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing.md,
  },
  heroLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginBottom: 4,
  },
  heroValue: {
    ...Design.typography.h4,
    color: Design.colors.textPrimary,
    textTransform: 'capitalize',
  },
  heroStat: {
    alignItems: 'flex-start',
    marginLeft: Design.spacing.md,
  },
  heroStatLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    fontSize: 11,
  },
  heroStatValue: {
    ...Design.typography.body,
    fontWeight: '700',
    color: Design.colors.textPrimary,
    marginTop: 2,
  },
  section: {
    backgroundColor: Design.colors.background,
    marginHorizontal: Design.spacing.md,
    marginTop: Design.spacing.md,
    padding: Design.spacing.lg,
    borderRadius: Design.borderRadius.lg,
    borderWidth: 1,
    borderColor: Design.colors.border,
    ...Design.shadows.small,
  },
  sectionTitle: {
    ...Design.typography.h4,
    color: Design.colors.textPrimary,
    marginBottom: Design.spacing.xs,
    fontWeight: '600',
  },
  sectionSubtitle: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing.md,
    lineHeight: 18,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  vehicleScroller: {
    paddingVertical: Design.spacing.sm,
    paddingRight: Design.spacing.md,
  },
  vehicleTypeCard: {
    width: 100,
    height: 90,
    padding: Design.spacing.md,
    borderRadius: Design.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Design.colors.border,
    backgroundColor: Design.colors.backgroundSecondary,
    marginRight: Design.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleTypeCardActive: {
    borderColor: Design.colors.primary,
    backgroundColor: Design.colors.primary + '15',
    borderWidth: 2,
  },
  vehicleTypeLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing.xs,
    fontSize: 12,
    textAlign: 'center',
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
    marginTop: Design.spacing.sm,
    gap: Design.spacing.sm,
  },
  deliveryTypeChip: {
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.sm + 2,
    borderRadius: Design.borderRadius.full,
    borderWidth: 1.5,
    borderColor: Design.colors.border,
    backgroundColor: Design.colors.backgroundSecondary,
    marginBottom: Design.spacing.xs,
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
  },
  deliveryTypeChipActive: {
    borderColor: Design.colors.primary,
    backgroundColor: Design.colors.primary,
    borderWidth: 1.5,
  },
  deliveryTypeChipText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  deliveryTypeChipTextActive: {
    color: Design.colors.white,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Design.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border + '50',
  },
  switchLabel: {
    ...Design.typography.body,
    color: Design.colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  switchSub: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  switchTextCol: {
    flex: 1,
    marginRight: Design.spacing.md,
  },
  capRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Design.spacing.sm,
    gap: Design.spacing.sm,
  },
  capCard: {
    flex: 1,
    backgroundColor: Design.colors.primary + '10',
    borderRadius: Design.borderRadius.md,
    padding: Design.spacing.md,
    borderWidth: 1,
    borderColor: Design.colors.primary + '30',
    alignItems: 'center',
  },
  capLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  capValue: {
    ...Design.typography.h4,
    color: Design.colors.textPrimary,
    marginTop: Design.spacing.xs,
    fontWeight: '700',
    fontSize: 18,
  },
});

export default DriverProfileSettingsScreen;
