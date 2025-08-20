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
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { useDriver } from '../contexts/DriverContext';
import { useTenant } from '../contexts/TenantContext';

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
          <Ionicons name={icon as any} size={20} color="#3B82F6" />
        </View>
        <View style={styles.profileItemText}>
          <Text style={styles.profileItemLabel}>{label}</Text>
          <Text style={styles.profileItemValue}>{value}</Text>
        </View>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
        <Ionicons name="wallet-outline" size={24} color="#3B82F6" />
      </View>
      <Text style={styles.balanceCardTitle}>Balance Overview</Text>
    </View>
    {balance ? (
      <View style={styles.balanceGrid}>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: '#10B981' }]}>
            <Ionicons name="cash-outline" size={16} color="#ffffff" />
          </View>
          <Text style={styles.balanceValue}>${balance.cashOnHand?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceLabel}>Cash on Hand</Text>
        </View>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="card-outline" size={16} color="#ffffff" />
          </View>
          <Text style={styles.balanceValue}>${balance.depositBalance?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceLabel}>Deposit Balance</Text>
        </View>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="trending-up-outline" size={16} color="#ffffff" />
          </View>
          <Text style={styles.balanceValue}>${balance.todayEarnings?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceLabel}>Today's Earnings</Text>
        </View>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIconContainer, { backgroundColor: '#6B7280' }]}>
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
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
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
            tintColor="#3B82F6"
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
            <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
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
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Switch
                  value={driver?.isOnline || false}
                  onValueChange={handleToggleOnlineStatus}
                  trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
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
              onPress={() => Alert.alert('Coming Soon', 'Help section will be available soon.')}
            />
            <ProfileItem
              icon="document-text-outline"
              label="Terms & Privacy"
              value="Legal information"
              onPress={() => Alert.alert('Coming Soon', 'Legal documents will be available soon.')}
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
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
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
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 24,
    marginBottom: 12,
  },
  card: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileItemText: {
    flex: 1,
  },
  profileItemLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  profileItemValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
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
    color: '#111827',
    marginBottom: 2,
  },
  statusControlDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  balanceCard: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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
    color: '#111827',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  balanceLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  balanceLoadingText: {
    color: '#6B7280',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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