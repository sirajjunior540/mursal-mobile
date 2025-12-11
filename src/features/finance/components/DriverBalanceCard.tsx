/**
 * Driver Balance Card Component
 * Shows driver's earnings and performance stats
 * Uses existing driver stats endpoint: /api/v1/drivers/{id}/stats/
 */
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Card from '../../../shared/components/Card/Card';
import Button from '../../../shared/components/Button/Button';
import { theme } from '../../../shared/styles/theme';
import { formatCurrency } from '../../../utils/currency';
import { useDriver } from '../../../contexts/DriverContext';
import { useTenant } from '../../../contexts/TenantContext';
import { useNavigation } from '@react-navigation/native';
import styles from './DriverBalanceCard.styles';

interface DriverBalanceCardProps {
  onRefresh?: () => void;
  compact?: boolean;
}

const DriverBalanceCard: React.FC<DriverBalanceCardProps> = ({ onRefresh, compact = false }) => {
  const navigation = useNavigation();
  const { tenantSettings } = useTenant();
  const currency = tenantSettings?.currency || 'SDG';
  const { driver, balance, loading, getDriverBalance } = useDriver();

  const handleViewEarnings = () => {
    // Navigate to History tab with earnings view
    // @ts-ignore - nested navigation params
    navigation.navigate('MainTabs', { screen: 'History', params: { tab: 'earnings' } });
  };

  const handleRefresh = async () => {
    await getDriverBalance();
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </Card>
    );
  }

  // Use balance from context or driver profile data
  const totalEarnings = balance?.todayEarnings || driver?.totalEarnings || 0;
  const totalDeliveries = balance?.totalDeliveries || driver?.totalDeliveries || 0;
  const successRate = balance?.successRate || driver?.successRate || 0;
  const averageRating = balance?.averageRating || driver?.rating || 0;
  const todayCompletedOrders = balance?.todayCompletedOrders || 0;

  if (compact) {
    return (
      <Card style={styles.compactContainer} onPress={handleViewEarnings}>
        <View style={styles.compactHeader}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.compactInfo}>
            <Text style={styles.compactLabel}>Today's Earnings</Text>
            <Text style={styles.compactAmount}>
              {formatCurrency(totalEarnings, currency)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.quickStatText}>{todayCompletedOrders} today</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.quickStatText}>{averageRating.toFixed(1)}</Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={28} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Earnings</Text>
            <Text style={styles.headerSubtitle}>Performance Overview</Text>
          </View>
        </View>
        <Button
          variant="text"
          size="small"
          icon={<Ionicons name="refresh" size={20} />}
          onPress={handleRefresh}
        />
      </View>

      {/* Balance Grid */}
      <View style={styles.balanceGrid}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Today's Earnings</Text>
          <Text style={[styles.balanceAmount, styles.positiveAmount]}>
            {formatCurrency(totalEarnings, currency)}
          </Text>
        </View>

        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Total Deliveries</Text>
          <Text style={styles.balanceAmount}>
            {totalDeliveries}
          </Text>
        </View>
      </View>

      {/* Performance Stats */}
      <View style={styles.todaySummary}>
        <Text style={styles.todayTitle}>Performance</Text>
        <View style={styles.todayGrid}>
          <View style={styles.todayItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.todayLabel}>Success Rate</Text>
            <Text style={styles.todayAmount}>
              {successRate.toFixed(0)}%
            </Text>
          </View>

          <View style={styles.todayItem}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={styles.todayLabel}>Rating</Text>
            <Text style={styles.todayAmount}>
              {averageRating.toFixed(1)}
            </Text>
          </View>

          <View style={styles.todayItem}>
            <Ionicons name="bicycle" size={16} color={theme.colors.primary} />
            <Text style={styles.todayLabel}>Today</Text>
            <Text style={styles.todayAmount}>
              {todayCompletedOrders} orders
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="View Earnings"
          variant="primary"
          size="medium"
          icon={<Ionicons name="stats-chart" size={18} color={theme.colors.white} />}
          onPress={handleViewEarnings}
          style={styles.actionButton}
        />

        <Button
          title="History"
          variant="outline"
          size="medium"
          icon={<Ionicons name="time-outline" size={18} />}
          onPress={handleViewEarnings}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
};

export default DriverBalanceCard;