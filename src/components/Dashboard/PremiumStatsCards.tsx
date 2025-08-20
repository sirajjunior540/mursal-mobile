import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StatsCardsProps, StatCardProps } from '../../types/dashboard.types';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface PremiumStatCardProps extends StatCardProps {
  gradientColors: string[];
  iconBackground: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

const PremiumStatCard: React.FC<PremiumStatCardProps> = ({
  icon,
  value,
  label,
  gradientColors,
  iconBackground,
  trend,
  trendValue,
}) => (
  <View style={styles.cardContainer}>
    <LinearGradient
      colors={gradientColors}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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
        <View style={styles.sparkline} />
      </View>
    </LinearGradient>
  </View>
);

export const PremiumStatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatTime = (minutes: number | null) => minutes ? `${minutes}m` : 'N/A';
  const formatRating = (rating: number) => rating > 0 ? rating.toFixed(1) : '0.0';

  const cards = [
    {
      icon: 'cube',
      value: stats.activeDeliveries.toString(),
      label: 'Active Deliveries',
      gradientColors: [premiumColors.statsCards.deliveries.primary, premiumColors.statsCards.deliveries.secondary],
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'up' as const,
      trendValue: '+12%',
    },
    {
      icon: 'checkmark-circle',
      value: stats.totalOrders.toString(),
      label: 'Total Orders',
      gradientColors: [premiumColors.statsCards.orders.primary, premiumColors.statsCards.orders.secondary],
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'up' as const,
      trendValue: '+5%',
    },
    {
      icon: 'star',
      value: formatRating(stats.rating),
      label: 'Rating',
      gradientColors: [premiumColors.statsCards.rating.primary, premiumColors.statsCards.rating.secondary],
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'stable' as const,
    },
    {
      icon: 'wallet',
      value: formatCurrency(stats.todayEarnings),
      label: "Today's Earnings",
      gradientColors: [premiumColors.statsCards.earnings.primary, premiumColors.statsCards.earnings.secondary],
      iconBackground: 'rgba(255, 255, 255, 0.2)',
      trend: 'up' as const,
      trendValue: '+8%',
    },
    {
      icon: 'time',
      value: formatTime(stats.averageDeliveryTime),
      label: 'Avg Time',
      gradientColors: [premiumColors.statsCards.time.primary, premiumColors.statsCards.time.secondary],
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
          <PremiumStatCard
            key={index}
            icon={card.icon}
            iconColor="#FFFFFF"
            value={card.value}
            label={card.label}
            backgroundColor=""
            gradientColors={card.gradientColors}
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
  sparkline: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    position: 'relative',
    overflow: 'hidden',
  },
});