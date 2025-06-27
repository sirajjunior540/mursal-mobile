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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useDriver } from '../contexts/DriverContext';
import { COLORS, SPACING } from '../constants';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { driver, balance, isLoading, error, updateOnlineStatus, getDriverProfile, getDriverBalance } = useDriver();
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

  const ProfileItem: React.FC<{
    icon: string;
    label: string;
    value: string;
    onPress?: () => void;
  }> = ({ icon, label, value, onPress }) => (
    <TouchableOpacity style={styles.profileItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.profileItemContent}>
        <Ionicons name={icon as any} size={24} color={COLORS.primary.default} />
        <View style={styles.profileItemText}>
          <Text style={styles.profileItemLabel}>{label}</Text>
          <Text style={styles.profileItemValue}>{value}</Text>
        </View>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
      )}
    </TouchableOpacity>
  );

  const BalanceCard: React.FC = () => (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceCardTitle}>Balance Overview</Text>
      {balance ? (
        <View style={styles.balanceGrid}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceValue}>${balance.cashOnHand.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Cash on Hand</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceValue}>${balance.depositBalance.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Deposit Balance</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceValue}>${balance.todayEarnings.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceValue}>${balance.weekEarnings.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Week Earnings</Text>
          </View>
        </View>
      ) : (
        <View style={styles.balanceLoading}>
          <ActivityIndicator size="small" color={COLORS.primary.default} />
          <Text style={styles.balanceLoadingText}>Loading balance...</Text>
        </View>
      )}
    </View>
  );

  if (isLoading && !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.default} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Driver Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Information</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="person-outline"
              label="Name"
              value={driver ? `${driver.firstName} ${driver.lastName}` : user?.firstName + ' ' + user?.lastName || 'N/A'}
            />
            <ProfileItem
              icon="mail-outline"
              label="Email"
              value={driver?.email || user?.email || 'N/A'}
            />
            <ProfileItem
              icon="call-outline"
              label="Phone"
              value={driver?.phone || user?.phone || 'N/A'}
            />
            <ProfileItem
              icon="star-outline"
              label="Rating"
              value={driver ? `${driver.rating.toFixed(1)} ⭐` : 'N/A'}
            />
            <ProfileItem
              icon="car-outline"
              label="Total Deliveries"
              value={driver ? driver.totalDeliveries.toString() : '0'}
            />
            {driver?.vehicleInfo && (
              <ProfileItem
                icon="car-sport-outline"
                label="Vehicle"
                value={`${driver.vehicleInfo.type} - ${driver.vehicleInfo.licensePlate}`}
              />
            )}
          </View>
        </View>

        {/* Online Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.card}>
            <View style={styles.onlineStatusContainer}>
              <View style={styles.onlineStatusInfo}>
                <Ionicons 
                  name={driver?.isOnline ? "radio-button-on" : "radio-button-off"} 
                  size={24} 
                  color={driver?.isOnline ? COLORS.success : COLORS.text.secondary} 
                />
                <View style={styles.onlineStatusText}>
                  <Text style={styles.onlineStatusLabel}>Online Status</Text>
                  <Text style={[
                    styles.onlineStatusValue,
                    { color: driver?.isOnline ? COLORS.success : COLORS.text.secondary }
                  ]}>
                    {driver?.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
              <View style={styles.switchContainer}>
                {onlineLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary.default} />
                ) : (
                  <Switch
                    value={driver?.isOnline || false}
                    onValueChange={handleToggleOnlineStatus}
                    trackColor={{ false: COLORS.text.secondary, true: COLORS.primary.light }}
                    thumbColor={driver?.isOnline ? COLORS.primary.default : COLORS.background}
                  />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Balance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance</Text>
          <BalanceCard />
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="settings-outline"
              label="App Settings"
              value="Preferences & Configuration"
              onPress={() => Alert.alert('Coming Soon', 'Settings will be available soon.')}
            />
            <ProfileItem
              icon="help-circle-outline"
              label="Help & Support"
              value="Get help and contact support"
              onPress={() => Alert.alert('Coming Soon', 'Help section will be available soon.')}
            />
            <ProfileItem
              icon="document-text-outline"
              label="Terms & Privacy"
              value="Legal information"
              onPress={() => Alert.alert('Coming Soon', 'Legal documents will be available soon.')}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    margin: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '20',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  retryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: 6,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  profileItemLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  profileItemValue: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  onlineStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  onlineStatusText: {
    marginLeft: SPACING.md,
  },
  onlineStatusLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  onlineStatusValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  switchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  balanceCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  balanceItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary.default,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  balanceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  balanceLoadingText: {
    marginLeft: SPACING.sm,
    color: COLORS.text.secondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});

export default ProfileScreen;