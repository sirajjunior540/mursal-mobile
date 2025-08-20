import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StatsCardsProps, StatCardProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { dashboardColors } from '../../design/dashboard/colors';

const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconColor,
  value,
  label,
  backgroundColor,
}) => (
  <View style={[styles.statCard, { backgroundColor }]}>
    <View style={styles.statIcon}>
      <Ionicons name={icon} size={24} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatTime = (minutes: number | null) => minutes ? `${minutes}m` : 'N/A';
  const formatRating = (rating: number) => rating > 0 ? rating.toFixed(1) : '0.0';

  const cards = [
    {
      icon: 'cube',
      value: stats.activeDeliveries.toString(),
      label: 'Active Deliveries',
      backgroundColor: dashboardColors.statCards.blue.background,
      iconColor: dashboardColors.statCards.blue.icon,
    },
    {
      icon: 'checkmark-circle',
      value: stats.totalOrders.toString(),
      label: 'Total Orders',
      backgroundColor: dashboardColors.statCards.green.background,
      iconColor: dashboardColors.statCards.green.icon,
    },
    {
      icon: 'star',
      value: formatRating(stats.rating),
      label: 'Rating',
      backgroundColor: dashboardColors.statCards.yellow.background,
      iconColor: dashboardColors.statCards.yellow.icon,
    },
    {
      icon: 'cash',
      value: formatCurrency(stats.todayEarnings),
      label: "Today's Earnings",
      backgroundColor: dashboardColors.statCards.purple.background,
      iconColor: dashboardColors.statCards.purple.icon,
    },
    {
      icon: 'time',
      value: formatTime(stats.averageDeliveryTime),
      label: 'Avg Time',
      backgroundColor: dashboardColors.statCards.orange.background,
      iconColor: dashboardColors.statCards.orange.icon,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card, index) => (
          <StatCard
            key={index}
            icon={card.icon}
            iconColor={card.iconColor}
            value={card.value}
            label={card.label}
            backgroundColor={card.backgroundColor}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Design.spacing[4],
  },
  scrollContent: {
    paddingHorizontal: Design.spacing[4],
    gap: Design.spacing[3],
  },
  statCard: {
    width: 120,
    paddingVertical: Design.spacing[4],
    paddingHorizontal: Design.spacing[3],
    borderRadius: Design.borderRadius.lg,
    alignItems: 'center',
    ...Design.shadows.medium,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Design.spacing[3],
  },
  statValue: {
    ...Design.typography.h2,
    color: '#FFFFFF',
    marginBottom: Design.spacing[1],
  },
  statLabel: {
    ...Design.typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
});