import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StatsCardsProps, StatCardProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface FlatStatCardProps extends StatCardProps {
  cardColor: string;
  iconBackground: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

const FlatStatCard: React.FC<FlatStatCardProps> = ({
  icon,
  value,
  label,
  cardColor,
  iconBackground,
  trend,
  trendValue,
}) => (
  <View style={styles.cardContainer}>
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={24} color="#FFFFFF" />
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons 
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'} 
              size={16} 
              color="rgba(255, 255, 255, 0.8)" 
            />
            {trendValue && (
              <Text style={styles.trendText}>{trendValue}</Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.accentBar} />
      </View>
    </View>
  </View>
);

export const FlatStatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatTime = (minutes: number | null) => minutes ? `${minutes}m` : 'N/A';
  const formatRating = (rating: number) => rating > 0 ? rating.toFixed(1) : '0.0';

  const cards = [
    {
      icon: 'cube',
      value: stats.activeDeliveries.toString(),
      label: 'Active Deliveries',
      cardColor: flatColors.statsCards.deliveries.primary,
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'up' as const,
      trendValue: '+12%',
    },
    {
      icon: 'checkmark-circle',
      value: stats.totalOrders.toString(),
      label: 'Total Orders',
      cardColor: flatColors.statsCards.orders.primary,
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'up' as const,
      trendValue: '+5%',
    },
    {
      icon: 'star',
      value: formatRating(stats.rating),
      label: 'Rating',
      cardColor: flatColors.statsCards.rating.primary,
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'stable' as const,
    },
    {
      icon: 'wallet',
      value: formatCurrency(stats.todayEarnings),
      label: "Today's Earnings",
      cardColor: flatColors.statsCards.earnings.primary,
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'up' as const,
      trendValue: '+8%',
    },
    {
      icon: 'time',
      value: formatTime(stats.averageDeliveryTime),
      label: 'Avg Time',
      cardColor: flatColors.statsCards.time.primary,
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'down' as const,
      trendValue: '-2m',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={160}
        snapToAlignment="start"
      >
        {cards.map((card, index) => (
          <FlatStatCard
            key={index}
            icon={card.icon}
            iconColor="#FFFFFF"
            value={card.value}
            label={card.label}
            backgroundColor=""
            cardColor={card.cardColor}
            iconBackground={card.iconBackground}
            trend={card.trend}
            trendValue={card.trendValue}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingRight: 44, // Extra padding for last card
  },
  cardContainer: {
    width: 140,
    height: 160,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...premiumShadows.medium,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.subtle,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: {
    ...premiumTypography.caption.small,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 2,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardValue: {
    ...premiumTypography.numeric.medium,
    color: '#FFFFFF',
    marginBottom: 4,
    fontWeight: '700',
  },
  cardLabel: {
    ...premiumTypography.caption.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 12,
  },
  accentBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
});