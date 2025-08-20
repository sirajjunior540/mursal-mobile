import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BalanceTransaction } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface TransactionListProps {
  transactions: BalanceTransaction[];
  isLoading?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  isLoading = false
}) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
      case 'delivery_fee':
        return 'car';
      case 'tip':
        return 'gift';
      case 'bonus':
        return 'star';
      case 'penalty':
        return 'warning';
      case 'deposit':
        return 'add-circle';
      case 'withdrawal':
        return 'remove-circle';
      case 'cash_collection':
        return 'cash';
      default:
        return 'wallet';
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (type === 'penalty' || type === 'withdrawal') {
      return flatColors.accent.red;
    }
    return amount >= 0 ? flatColors.accent.green : flatColors.accent.red;
  };

  const getTransactionBackground = (type: string, amount: number) => {
    if (type === 'penalty' || type === 'withdrawal') {
      return flatColors.cards.red.background;
    }
    return amount >= 0 ? flatColors.cards.green.background : flatColors.cards.red.background;
  };

  const formatTransactionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderTransaction = ({ item }: { item: BalanceTransaction }) => {
    const iconName = getTransactionIcon(item.type);
    const color = getTransactionColor(item.type, item.amount);
    const backgroundColor = getTransactionBackground(item.type, item.amount);
    
    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor }]}>
          <Ionicons name={iconName as any} size={18} color={color} />
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionType}>
              {formatTransactionType(item.type)}
            </Text>
            <Text style={[styles.transactionAmount, { color }]}>
              {item.amount >= 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
            </Text>
          </View>
          
          {item.description && (
            <Text style={styles.transactionDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.transactionFooter}>
            <Text style={styles.transactionDate}>
              {formatDate(item.date)}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'completed' ? flatColors.cards.green.background : flatColors.cards.yellow.background }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.status === 'completed' ? flatColors.accent.green : flatColors.accent.orange }
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={48} color={flatColors.neutral[400]} />
        <Text style={styles.emptyTitle}>No Transactions</Text>
        <Text style={styles.emptyMessage}>
          Your transaction history will appear here once you start earning
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="receipt" size={16} color={flatColors.accent.blue} />
          </View>
          <Text style={styles.title}>Transaction History</Text>
        </View>
        <Text style={styles.count}>{transactions.length} items</Text>
      </View>
      
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
  },
  count: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  transactionDetails: {
    flex: 1,
    gap: 6,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    flex: 1,
  },
  transactionAmount: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.callout.lineHeight,
  },
  transactionDescription: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[600],
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionDate: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.small.lineHeight,
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[700],
    marginTop: 12,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[500],
    textAlign: 'center',
  },
});