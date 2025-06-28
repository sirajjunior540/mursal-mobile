import React, { useState, useEffect } from 'react';
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
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useAuth } from '../contexts/AuthContext';
import { useDriver } from '../contexts/DriverContext';
import { useTenant } from '../contexts/TenantContext';
import { COLORS, SPACING } from '../constants';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { driver, balance, isLoading, error, updateOnlineStatus, getDriverProfile, getDriverBalance } = useDriver();
  const { settings } = useTenant();
  const [refreshing, setRefreshing] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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
    showDivider?: boolean;
  }> = ({ icon, label, value, onPress, showDivider = true }) => {
    const animatedScale = useState(new Animated.Value(1))[0];

    const handlePressIn = () => {
      if (onPress) {
        Animated.spring(animatedScale, {
          toValue: 0.98,
          useNativeDriver: true,
        }).start();
      }
    };

    const handlePressOut = () => {
      if (onPress) {
        Animated.spring(animatedScale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    };

    return (
      <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
        <TouchableOpacity 
          style={styles.profileItem} 
          onPress={onPress} 
          disabled={!onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View style={styles.profileItemContent}>
            <View style={styles.iconContainer}>
              <Ionicons name={icon as any} size={20} color={COLORS.primary.default} />
            </View>
            <View style={styles.profileItemText}>
              <Text style={styles.profileItemLabel}>{label}</Text>
              <Text style={styles.profileItemValue}>{value}</Text>
            </View>
          </View>
          {onPress && (
            <Ionicons name="chevron-forward" size={16} color={COLORS.text.secondary} />
          )}
        </TouchableOpacity>
        {showDivider && <View style={styles.itemDivider} />}
      </Animated.View>
    );
  };

  const BalanceCard: React.FC = () => (
    <Animated.View style={[styles.balanceCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.balanceHeader}>
        <Ionicons name="wallet-outline" size={24} color={COLORS.primary.default} />
        <Text style={styles.balanceCardTitle}>Balance Overview</Text>
      </View>
      {balance ? (
        <View style={styles.balanceGrid}>
          <View style={styles.balanceItem}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="cash-outline" size={16} color={COLORS.success} />
            </View>
            <Text style={styles.balanceValue}>${balance.cashOnHand.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Cash on Hand</Text>
          </View>
          <View style={styles.balanceItem}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="card-outline" size={16} color={COLORS.primary.default} />
            </View>
            <Text style={styles.balanceValue}>${balance.depositBalance.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Deposit Balance</Text>
          </View>
          <View style={styles.balanceItem}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="trending-up-outline" size={16} color={COLORS.warning} />
            </View>
            <Text style={styles.balanceValue}>${balance.todayEarnings.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.balanceItem}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.text.secondary} />
            </View>
            <Text style={styles.balanceValue}>${balance.weekEarnings.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Week Earnings</Text>
          </View>
        </View>
      ) : (
        <View style={styles.balanceLoading}>
          <Text style={styles.balanceLoadingText}>Balance information not available</Text>
        </View>
      )}
    </Animated.View>
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
      {/* Profile Header */}
      <View style={styles.header}>
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
                { backgroundColor: driver?.isOnline ? COLORS.success : COLORS.text.secondary }
              ]} />
              <Text style={[
                styles.statusText,
                { color: driver?.isOnline ? COLORS.success : COLORS.text.secondary }
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
            tintColor={COLORS.primary.default}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
            <Ionicons name="warning-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stats Cards */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.statCard}>
            <Ionicons name="star" size={20} color={COLORS.warning} />
            <Text style={styles.statValue}>{driver?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.statValue}>{driver?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={20} color={COLORS.primary.default} />
            <Text style={styles.statValue}>4.2</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
        </Animated.View>

        {/* Driver Information */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.sectionTitle}>Driver Information</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="person-outline"
              label="Full Name"
              value={driver ? `${driver.firstName} ${driver.lastName}` : user?.firstName + ' ' + user?.lastName || 'N/A'}
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
        </Animated.View>

        {/* Online Status Control */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
                <ActivityIndicator size="small" color={COLORS.primary.default} />
              ) : (
                <Switch
                  value={driver?.isOnline || false}
                  onValueChange={handleToggleOnlineStatus}
                  trackColor={{ false: '#E5E5EA', true: COLORS.primary.light }}
                  thumbColor={driver?.isOnline ? COLORS.primary.default : COLORS.white}
                  ios_backgroundColor="#E5E5EA"
                />
              )}
            </View>
          </View>
        </Animated.View>

        {/* Balance Section - Only show if enabled for this tenant */}
        {settings?.show_driver_balance && (
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionTitle}>Balance</Text>
            <BalanceCard />
          </Animated.View>
        )}

        {/* App Settings */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="settings-outline"
              label="Preferences"
              value="App configuration"
              onPress={() => Alert.alert('Coming Soon', 'Settings will be available soon.')}
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
        </Animated.View>

        {/* Logout */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.error + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
    marginLeft: 12,
    marginRight: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileItemText: {
    flex: 1,
  },
  profileItemLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  profileItemValue: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
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
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  statusControlDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  balanceCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
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
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  balanceLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  balanceLoadingText: {
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});

export default ProfileScreen;