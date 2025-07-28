/**
 * Driver Balance Card Component
 * Shows driver's cash balance and financial status
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Card from '../../../shared/components/Card/Card';
import Button from '../../../shared/components/Button/Button';
import { theme } from '../../../shared/styles/theme';
import { formatCurrency } from '../../../utils/currency';
import { driverFinanceAPI } from '../../../services/api/driverFinanceAPI';
import { useTenant } from '../../../contexts/TenantContext';
import { useNavigation } from '@react-navigation/native';
import styles from './DriverBalanceCard.styles';

interface BalanceData {
  current_balance: {
    cash_in_hand: number;
    company_liability: number;
    earnings_balance: number;
    net_position: number;
  };
  today_summary: {
    collections: number;
    remittances: number;
    net_change: number;
  };
  limits: {
    daily_limit: number;
    remaining_capacity: number;
    can_accept_cod: boolean;
  };
  status: {
    is_blocked: boolean;
    block_reason: string;
  };
}

interface DriverBalanceCardProps {
  onRefresh?: () => void;
  compact?: boolean;
}

const DriverBalanceCard: React.FC<DriverBalanceCardProps> = ({ onRefresh, compact = false }) => {
  const navigation = useNavigation();
  const { tenantSettings } = useTenant();
  const currency = tenantSettings?.currency || 'SAR';
  
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalanceData();
  }, []);

  const fetchBalanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await driverFinanceAPI.getDriverBalance();
      setBalanceData(response.data);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  const handleRemitCash = () => {
    navigation.navigate('CashRemittance' as never);
  };

  const handleViewTransactions = () => {
    navigation.navigate('TransactionHistory' as never);
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </Card>
    );
  }

  if (error || !balanceData) {
    return (
      <Card style={styles.container}>
        <Text style={styles.errorText}>{error || 'No data available'}</Text>
      </Card>
    );
  }

  const { current_balance, today_summary, limits, status } = balanceData;
  const isNearLimit = current_balance.cash_in_hand >= limits.daily_limit * 0.8;
  const limitPercentage = (current_balance.cash_in_hand / limits.daily_limit) * 100;

  if (compact) {
    return (
      <Card style={styles.compactContainer} onPress={handleViewTransactions}>
        <View style={styles.compactHeader}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.compactInfo}>
            <Text style={styles.compactLabel}>Cash in Hand</Text>
            <Text style={styles.compactAmount}>
              {formatCurrency(current_balance.cash_in_hand, currency)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>
        
        {status.is_blocked && (
          <View style={styles.blockedBadge}>
            <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
            <Text style={styles.blockedText}>Blocked - Remit Cash</Text>
          </View>
        )}
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
            <Text style={styles.headerTitle}>Cash Balance</Text>
            <Text style={styles.headerSubtitle}>Financial Overview</Text>
          </View>
        </View>
        <Button
          variant="text"
          size="small"
          icon={<Ionicons name="refresh" size={20} />}
          onPress={() => {
            fetchBalanceData();
            onRefresh?.();
          }}
        />
      </View>

      {/* Status Alert */}
      {status.is_blocked && (
        <View style={styles.alertContainer}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={styles.alertText}>{status.block_reason}</Text>
        </View>
      )}

      {/* Balance Grid */}
      <View style={styles.balanceGrid}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Cash in Hand</Text>
          <Text style={[styles.balanceAmount, isNearLimit && styles.warningAmount]}>
            {formatCurrency(current_balance.cash_in_hand, currency)}
          </Text>
        </View>
        
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Company Owes</Text>
          <Text style={[
            styles.balanceAmount,
            current_balance.earnings_balance > 0 && styles.positiveAmount
          ]}>
            {formatCurrency(current_balance.earnings_balance, currency)}
          </Text>
        </View>
      </View>

      {/* Daily Limit Progress */}
      <View style={styles.limitSection}>
        <View style={styles.limitHeader}>
          <Text style={styles.limitLabel}>Daily Cash Limit</Text>
          <Text style={styles.limitText}>
            {formatCurrency(current_balance.cash_in_hand, currency, { compact: true })} / 
            {formatCurrency(limits.daily_limit, currency, { compact: true })}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${Math.min(limitPercentage, 100)}%` },
              isNearLimit && styles.warningProgress,
              status.is_blocked && styles.errorProgress,
            ]} 
          />
        </View>
      </View>

      {/* Today's Summary */}
      <View style={styles.todaySummary}>
        <Text style={styles.todayTitle}>Today's Activity</Text>
        <View style={styles.todayGrid}>
          <View style={styles.todayItem}>
            <Ionicons name="arrow-down-circle" size={16} color={theme.colors.success} />
            <Text style={styles.todayLabel}>Collected</Text>
            <Text style={styles.todayAmount}>
              {formatCurrency(today_summary.collections, currency, { compact: true })}
            </Text>
          </View>
          
          <View style={styles.todayItem}>
            <Ionicons name="arrow-up-circle" size={16} color={theme.colors.primary} />
            <Text style={styles.todayLabel}>Remitted</Text>
            <Text style={styles.todayAmount}>
              {formatCurrency(today_summary.remittances, currency, { compact: true })}
            </Text>
          </View>
          
          <View style={styles.todayItem}>
            <Ionicons name="trending-up" size={16} color={theme.colors.info} />
            <Text style={styles.todayLabel}>Net Change</Text>
            <Text style={[
              styles.todayAmount,
              today_summary.net_change > 0 ? styles.positiveAmount : styles.negativeAmount
            ]}>
              {formatCurrency(today_summary.net_change, currency, { compact: true })}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Remit Cash"
          variant={isNearLimit ? 'primary' : 'outline'}
          size="medium"
          icon={<Ionicons name="cash" size={18} color={isNearLimit ? theme.colors.white : theme.colors.primary} />}
          onPress={handleRemitCash}
          style={styles.actionButton}
          disabled={current_balance.cash_in_hand === 0}
        />
        
        <Button
          title="History"
          variant="outline"
          size="medium"
          icon={<Ionicons name="time-outline" size={18} />}
          onPress={handleViewTransactions}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
};

export default DriverBalanceCard;