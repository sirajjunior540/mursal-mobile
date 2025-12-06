import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { useDriver } from '../contexts/DriverContext';
import { useTenant } from '../contexts/TenantContext';
import { notificationDebugUtils } from '../utils/notificationDebugUtils';
import { flatColors } from '../design/dashboard/flatColors';

interface ProfileItemProps {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  showDivider?: boolean;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon, label, value, onPress, showDivider = true }) => {
  return (
    <TouchableOpacity
      style={styles.profileItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.profileItemContent}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color={flatColors.brand.secondary} />
        </View>
        <View style={styles.profileItemText}>
          <Text style={styles.profileItemLabel}>{label}</Text>
          <Text style={styles.profileItemValue}>{value}</Text>
        </View>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={flatColors.neutral[600]} />
      )}
      {showDivider && <View style={styles.itemDivider} />}
    </TouchableOpacity>
  );
};

interface BalanceCardProps {
  balance: any;
  onPress?: () => void;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance, onPress }) => (
  <TouchableOpacity style={styles.balanceCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.balanceHeader}>
      <View style={styles.balanceHeaderIcon}>
        <Ionicons name="wallet-outline" size={24} color={flatColors.brand.secondary} />
      </View>
      <Text style={styles.balanceCardTitle}>Balance Overview</Text>
    </View>
    {balance ? (
      <View style={styles.balanceGrid}>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: flatColors.brand.secondary }]}>
            <Ionicons name="cash-outline" size={16} color="#ffffff" />
          </View>
          <Text style={styles.balanceValue}>${balance.cashOnHand?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceLabel}>Cash on Hand</Text>
        </View>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: flatColors.brand.primary }]}>
            <Ionicons name="card-outline" size={16} color="#ffffff" />
          </View>
          <Text style={styles.balanceValue}>${balance.depositBalance?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceLabel}>Deposit Balance</Text>
        </View>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: flatColors.brand.text }]}>
            <Ionicons name="trending-up-outline" size={16} color="#ffffff" />
          </View>
          <Text style={styles.balanceValue}>${balance.todayEarnings?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceLabel}>Today's Earnings</Text>
        </View>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: flatColors.neutral[600] }]}>
            <Ionicons name="calendar-outline" size={16} color="#ffffff" />
          </View>
          <Text style={styles.balanceValue}>${balance.weekEarnings?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceLabel}>Week Earnings</Text>
        </View>
      </View>
    ) : (
      <View style={styles.balanceLoading}>
        <Text style={styles.balanceLoadingText}>Balance information not available</Text>
      </View>
    )}
    
    {/* Tap indicator */}
    <View style={styles.balanceFooter}>
      <Text style={styles.balanceFooterText}>Tap to view earnings details</Text>
      <Ionicons name="chevron-forward" size={16} color="#6B7280" />
    </View>
  </TouchableOpacity>
);

type ProfileStackParamList = {
  Profile: undefined;
  DriverProfileSettings: undefined;
  HelpSupport: undefined;
};

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'Profile'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const { driver, balance, isLoading, error, updateOnlineStatus, getDriverProfile, getDriverBalance } = useDriver();
  const { settings } = useTenant();
  const [refreshing, setRefreshing] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getDriverProfile(),
        getDriverBalance(),
      ]);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleOnlineStatus = async () => {
    if (!driver) return;

    setOnlineLoading(true);
    try {
      await updateOnlineStatus(!driver.isOnline);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to update online status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !driver) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.light} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={flatColors.brand.secondary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.light} />
      <LinearGradient
        colors={[flatColors.brand.lighter, '#FFE7C7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.decorativeBlob, styles.blobTopLeft]} />
      <View style={[styles.decorativeBlob, styles.blobBottomRight]} />
      <View style={styles.ring} />
      <SafeAreaView style={styles.safeArea}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {driver?.firstName?.charAt(0) || user?.firstName?.charAt(0) || 'D'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {driver ? `${driver.firstName} ${driver.lastName}` : `${user?.firstName} ${user?.lastName}` || 'Driver'}
              </Text>
              <Text style={styles.profileEmail}>
                {driver?.email || user?.email || 'driver@example.com'}
              </Text>
              <View style={styles.onlineStatusBadge}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: driver?.isOnline ? '#10B981' : '#6B7280' }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: driver?.isOnline ? '#10B981' : '#6B7280' }
                ]}>
                  {driver?.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#FF6B00"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorContent}>
              <Ionicons name="warning-outline" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="star" size={20} color="#ffffff" />
            </View>
            <Text style={styles.statValue}>
              {balance?.averageRating?.toFixed(1) || driver?.rating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            </View>
            <Text style={styles.statValue}>
              {balance?.totalDeliveries || driver?.totalDeliveries || 0}
            </Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FF6B00' }]}>
              <Ionicons name="time" size={20} color="#ffffff" />
            </View>
            <Text style={styles.statValue}>
              {balance?.averageDeliveryTime ? `${balance.averageDeliveryTime.toFixed(0)}m` : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
        </View>


        {/* Driver Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Information</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="person-outline"
              label="Full Name"
              value={driver ? `${driver.firstName} ${driver.lastName}` : `${user?.firstName || ''} ${user?.lastName || ''}` || 'N/A'}
            />
            <ProfileItem
              icon="mail-outline"
              label="Email Address"
              value={driver?.email || user?.email || 'N/A'}
            />
            <ProfileItem
              icon="call-outline"
              label="Phone Number"
              value={driver?.phone || user?.phone || 'N/A'}
            />
            {driver?.vehicleInfo && (
              <ProfileItem
                icon="car-sport-outline"
                label="Vehicle"
                value={`${driver.vehicleInfo.type} - ${driver.vehicleInfo.licensePlate}`}
                showDivider={false}
              />
            )}
          </View>
        </View>

        {/* Online Status Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Control</Text>
          <View style={styles.card}>
            <View style={styles.statusControlItem}>
              <View style={styles.statusControlInfo}>
                <Text style={styles.statusControlLabel}>Online Status</Text>
                <Text style={styles.statusControlDescription}>
                  {driver?.isOnline ? 'Receiving new orders' : 'Not receiving orders'}
                </Text>
              </View>
              {onlineLoading ? (
                <ActivityIndicator size="small" color="#FF6B00" />
              ) : (
                <Switch
                  value={driver?.isOnline || false}
                  onValueChange={handleToggleOnlineStatus}
                  trackColor={{ false: '#E5E7EB', true: '#FF6B00' }}
                  thumbColor={driver?.isOnline ? '#ffffff' : '#ffffff'}
                  ios_backgroundColor="#E5E7EB"
                />
              )}
            </View>
          </View>
        </View>

        {/* Balance Section - Only show if enabled for this tenant */}
        {settings?.show_driver_balance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Balance</Text>
            <BalanceCard 
              balance={balance} 
              onPress={() => navigation.navigate('History' as any, { tab: 'earnings' })}
            />
          </View>
        )}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="car-outline"
              label="Driver Profile"
              value="Vehicle & delivery settings"
              onPress={() => navigation.navigate('DriverProfileSettings' as any)}
            />
            <ProfileItem
              icon="help-circle-outline"
              label="Help & Support"
              value="Get assistance"
              onPress={() => navigation.navigate('HelpSupport' as any)}
            />
            <ProfileItem
              icon="document-text-outline"
              label="Terms of Service"
              value="View terms and conditions"
              onPress={() => navigation.navigate('TermsOfService' as any)}
            />
            <ProfileItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              value="How we protect your data"
              onPress={() => navigation.navigate('PrivacyPolicy' as any)}
            />
            <ProfileItem
              icon="bug-outline"
              label="Debug Notifications"
              value="Test notification navigation flow"
              onPress={() => notificationDebugUtils.showDebugMenu()}
              showDivider={false}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.brand.lighter,
  },
  safeArea: {
    flex: 1,
  },
  decorativeBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
  },
  blobTopLeft: {
    top: -60,
    left: -40,
  },
  blobBottomRight: {
    bottom: -60,
    right: -20,
  },
  ring: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 16,
    borderColor: 'rgba(245, 166, 35, 0.08)',
    top: '10%',
    right: '-18%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: flatColors.neutral[700],
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: flatColors.brand.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: flatColors.brand.text,
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: flatColors.brand.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: flatColors.backgrounds.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: flatColors.brand.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: flatColors.neutral[700],
    marginBottom: 8,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.brand.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  errorContainer: {
    margin: 24,
    borderRadius: 12,
    backgroundColor: flatColors.cards.orange.background,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 14,
    marginLeft: 12,
    marginRight: 12,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: flatColors.brand.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: flatColors.neutral[700],
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: flatColors.brand.text,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  card: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 12,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  profileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.brand.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileItemText: {
    flex: 1,
  },
  profileItemLabel: {
    fontSize: 13,
    color: flatColors.neutral[700],
    marginBottom: 2,
    fontWeight: '500',
  },
  profileItemValue: {
    fontSize: 16,
    color: flatColors.brand.text,
    fontWeight: '600',
  },
  itemDivider: {
    height: 1,
    backgroundColor: flatColors.brand.border,
    marginLeft: 60,
  },
  statusControlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statusControlInfo: {
    flex: 1,
  },
  statusControlLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.brand.text,
    marginBottom: 2,
  },
  statusControlDescription: {
    fontSize: 13,
    color: flatColors.neutral[700],
  },
  balanceCard: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 12,
    padding: 20,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: flatColors.brand.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.brand.text,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  balanceItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.brand.text,
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: flatColors.neutral[700],
    textAlign: 'center',
  },
  balanceLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  balanceLoadingText: {
    color: flatColors.neutral[700],
    fontSize: 14,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  balanceFooterText: {
    fontSize: 12,
    color: flatColors.neutral[700],
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 12,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default ProfileScreen;
