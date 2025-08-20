import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DriverBalance } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

interface EarningsCardProps {
  earnings: DriverBalance | null;
  period: string;
  isLoading?: boolean;
}

export const EarningsCard: React.FC<EarningsCardProps> = ({
  earnings,
  period,
  isLoading = false
}) => {
  const getPeriodTitle = () => {
    switch (period) {
      case 'today': return "Today's Earnings";
      case 'week': return "This Week";
      case 'month': return "This Month";
      default: return "All Time";
    }
  };

  const getPeriodEarnings = () => {
    if (!earnings) return 0;
    
    switch (period) {
      case 'today':
        return earnings.breakdown?.today || 0;
      case 'week':
        return earnings.breakdown?.week || 0;
      case 'month':
        return earnings.breakdown?.month || 0;
      default:
        return earnings.totalEarnings || 0;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="trending-up" size={20} color={flatColors.accent.blue} />
          </View>
          <Text style={styles.title}>{getPeriodTitle()}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <Ionicons name="wallet-outline" size={20} color={flatColors.neutral[500]} />
        </View>
      </View>

      {/* Main Earnings */}
      <View style={styles.mainEarnings}>
        <Text style={styles.earningsAmount}>
          ${getPeriodEarnings().toFixed(2)}
        </Text>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownIcon, { backgroundColor: flatColors.cards.green.background }]}>
            <Ionicons name="car" size={14} color={flatColors.accent.green} />
          </View>
          <View style={styles.breakdownDetails}>
            <Text style={styles.breakdownValue}>
              ${earnings?.breakdown?.deliveryEarnings?.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.breakdownLabel}>Delivery Fees</Text>
          </View>
        </View>

        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownIcon, { backgroundColor: flatColors.cards.yellow.background }]}>
            <Ionicons name="gift" size={14} color={flatColors.accent.orange} />
          </View>
          <View style={styles.breakdownDetails}>
            <Text style={styles.breakdownValue}>
              ${earnings?.breakdown?.tips?.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.breakdownLabel}>Tips</Text>
          </View>
        </View>

        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownIcon, { backgroundColor: flatColors.cards.purple.background }]}>
            <Ionicons name="star" size={14} color={flatColors.accent.purple} />
          </View>
          <View style={styles.breakdownDetails}>
            <Text style={styles.breakdownValue}>
              ${earnings?.breakdown?.bonuses?.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.breakdownLabel}>Bonuses</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {earnings?.completedOrders || 0}
          </Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {earnings?.averageRating?.toFixed(1) || '0.0'}★
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {earnings?.successRate?.toFixed(0) || 0}%
          </Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    margin: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    ...premiumShadows.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[800],
  },
  mainEarnings: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: flatColors.neutral[800],
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: premiumTypography.caption.large.fontWeight,
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
  },
  breakdown: {
    gap: 12,
    marginBottom: 20,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
  },
  breakdownLabel: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[600],
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: flatColors.neutral[300],
  },
});