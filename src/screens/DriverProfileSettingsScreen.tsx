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
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Design } from '../constants/designSystem';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { flatColors } from '../design/dashboard/flatColors';

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

  const preferenceOptions: Array<{
    key: keyof Pick<DriverProfile, 
      'accepts_cash_on_delivery' | 
      'accepts_fragile_items' | 
      'accepts_temperature_controlled' | 
      'prefers_single_pickup'>;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      key: 'accepts_cash_on_delivery',
      label: 'Cash on delivery',
      description: 'Take orders where the customer pays at dropoff',
      icon: 'cash-outline',
    },
    {
      key: 'accepts_fragile_items',
      label: 'Handle fragile items',
      description: 'Electronics, glassware, and delicate goods',
      icon: 'cube-outline',
    },
    {
      key: 'accepts_temperature_controlled',
      label: 'Temperature control',
      description: 'Coolers, hot bags, or insulated boxes',
      icon: 'thermometer-outline',
    },
    {
      key: 'prefers_single_pickup',
      label: 'Prefer single pickup',
      description: 'One pickup with multiple drops per route',
      icon: 'git-branch-outline',
    },
  ];

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
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.lighter} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[flatColors.brand.lighter, '#FFE7C7', '#FFF7ED']}
          style={styles.heroArea}
        >
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={22} color={flatColors.brand.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Driver & Vehicle</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={flatColors.backgrounds.primary} />
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <Ionicons name="car-sport-outline" size={28} color={flatColors.brand.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Vehicle profile</Text>
                <Text style={styles.heroValue}>
                  {VEHICLE_TYPES.find(v => v.value === profile.vehicle_type)?.label || 'Not set'}
                </Text>
                <Text style={styles.heroSub}>
                  {user?.firstName ? `${user.firstName}, we tailor jobs to your setup` : 'We tailor jobs to your setup'}
                </Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="shield-checkmark" size={16} color={flatColors.backgrounds.primary} />
                <Text style={styles.heroBadgeText}>Synced</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: flatColors.cards.orange.background }]}>
                <Text style={styles.statLabel}>Stops/route</Text>
                <Text style={styles.statValue}>{profile.max_stops_per_route}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: flatColors.cards.yellow.background }]}>
                <Text style={styles.statLabel}>Range</Text>
                <Text style={styles.statValue}>{profile.max_distance_km} km</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: flatColors.cards.green.background }]}>
                <Text style={styles.statLabel}>Weight</Text>
                <Text style={styles.statValue}>{profile.max_weight_capacity} kg</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Choose your vehicle</Text>
              <Text style={styles.sectionSubtitle}>We auto-adjust limits and delivery matches</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vehicleScroller}
          >
            {VEHICLE_TYPES.map((vehicle) => {
              const isSelected = profile.vehicle_type === vehicle.value;
              return (
                <TouchableOpacity
                  key={vehicle.value}
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
                  onPress={() => updateVehicleType(vehicle.value)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.vehicleIconWrap, isSelected && styles.vehicleIconWrapActive]}>
                    <Ionicons
                      name={vehicle.icon as any}
                      size={26}
                      color={isSelected ? flatColors.brand.secondary : flatColors.neutral[600]}
                    />
                  </View>
                  <Text style={[styles.vehicleLabel, isSelected && styles.vehicleLabelActive]}>
                    {vehicle.label}
                  </Text>
                  <Text style={styles.vehicleHint}>
                    {isSelected ? 'Selected' : 'Tap to switch'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <Text style={styles.sectionSubtitle}>Updated automatically per vehicle type</Text>
          </View>
          <View style={styles.capGrid}>
            <View style={styles.capCard}>
              <View style={[styles.capIcon, { backgroundColor: flatColors.cards.yellow.background }]}>
                <Ionicons name="speedometer-outline" size={18} color={flatColors.brand.secondary} />
              </View>
              <Text style={styles.capLabel}>Max distance</Text>
              <Text style={styles.capValue}>{profile.max_distance_km} km</Text>
            </View>
            <View style={styles.capCard}>
              <View style={[styles.capIcon, { backgroundColor: flatColors.cards.green.background }]}>
                <Ionicons name="cube-outline" size={18} color={flatColors.accent.green} />
              </View>
              <Text style={styles.capLabel}>Max weight</Text>
              <Text style={styles.capValue}>{profile.max_weight_capacity} kg</Text>
            </View>
            <View style={styles.capCard}>
              <View style={[styles.capIcon, { backgroundColor: flatColors.cards.blue.background }]}>
                <Ionicons name="navigate-outline" size={18} color={flatColors.accent.blue} />
              </View>
              <Text style={styles.capLabel}>Stops per route</Text>
              <Text style={styles.capValue}>{profile.max_stops_per_route}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Allowed delivery types</Text>
            <Text style={styles.sectionSubtitle}>Pick what you want to receive</Text>
          </View>
          <View style={styles.deliveryGrid}>
            {DELIVERY_TYPES.map((type) => {
              const isActive = profile.allowed_delivery_types.includes(type.value);
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.deliveryChip, isActive && styles.deliveryChipActive]}
                  onPress={() => toggleDeliveryType(type.value)}
                  activeOpacity={0.85}
                >
                  <View style={[
                    styles.deliveryDot,
                    { backgroundColor: isActive ? flatColors.brand.secondary : flatColors.neutral[300] },
                  ]}
                  />
                  <Text style={[styles.deliveryText, isActive && styles.deliveryTextActive]}>
                    {type.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={16} color={flatColors.brand.secondary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery preferences</Text>
            <Text style={styles.sectionSubtitle}>Fine-tune what you’re comfortable handling</Text>
          </View>
          {preferenceOptions.map((pref, idx) => {
            const value = profile[pref.key];
            const isLast = idx === preferenceOptions.length - 1;
            return (
              <View key={pref.key} style={[styles.preferenceRow, !isLast && styles.preferenceDivider]}>
                <View style={styles.preferenceIcon}>
                  <Ionicons name={pref.icon as any} size={18} color={flatColors.brand.secondary} />
                </View>
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceLabel}>{pref.label}</Text>
                  <Text style={styles.preferenceSub}>{pref.description}</Text>
                </View>
                <Switch
                  value={!!value}
                  onValueChange={(toggle) => setProfile({ ...profile, [pref.key]: toggle })}
                  trackColor={{ false: flatColors.neutral[300], true: flatColors.brand.secondary }}
                  thumbColor={flatColors.backgrounds.primary}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.brand.lighter,
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
  heroArea: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.brand.text,
  },
  primaryButton: {
    backgroundColor: flatColors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: flatColors.backgrounds.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 20,
    padding: 16,
    marginTop: 18,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: flatColors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: flatColors.brand.text,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  heroValue: {
    fontSize: 22,
    fontWeight: '800',
    color: flatColors.brand.text,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    color: flatColors.neutral[700],
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: flatColors.brand.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  heroBadgeText: {
    color: flatColors.backgrounds.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  statLabel: {
    fontSize: 12,
    color: flatColors.neutral[700],
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: flatColors.brand.text,
  },
  section: {
    backgroundColor: flatColors.backgrounds.primary,
    marginHorizontal: 16,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: flatColors.brand.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: flatColors.neutral[700],
    marginTop: 4,
  },
  vehicleScroller: {
    paddingVertical: 4,
    gap: 12,
  },
  vehicleCard: {
    width: 140,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    backgroundColor: flatColors.backgrounds.secondary,
    marginRight: 12,
  },
  vehicleCardActive: {
    borderColor: flatColors.brand.secondary,
    backgroundColor: flatColors.brand.light,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  vehicleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  vehicleIconWrapActive: {
    backgroundColor: flatColors.backgrounds.primary,
    borderColor: flatColors.brand.secondary,
  },
  vehicleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: flatColors.brand.text,
  },
  vehicleLabelActive: {
    color: flatColors.brand.secondary,
  },
  vehicleHint: {
    fontSize: 12,
    color: flatColors.neutral[600],
    marginTop: 4,
  },
  capGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  capCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    padding: 14,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  capIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  capLabel: {
    fontSize: 13,
    color: flatColors.neutral[700],
    marginBottom: 2,
  },
  capValue: {
    fontSize: 17,
    fontWeight: '800',
    color: flatColors.brand.text,
  },
  deliveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  deliveryChip: {
    flexBasis: '48%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: flatColors.backgrounds.secondary,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryChipActive: {
    backgroundColor: flatColors.brand.light,
    borderColor: flatColors.brand.secondary,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  deliveryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deliveryText: {
    flex: 1,
    fontSize: 13,
    color: flatColors.neutral[700],
  },
  deliveryTextActive: {
    color: flatColors.brand.text,
    fontWeight: '700',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceDivider: {
    borderBottomWidth: 1,
    borderBottomColor: flatColors.brand.border,
  },
  preferenceIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: flatColors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: flatColors.brand.text,
  },
  preferenceSub: {
    fontSize: 12,
    color: flatColors.neutral[700],
    marginTop: 2,
  },
});

export default DriverProfileSettingsScreen;
