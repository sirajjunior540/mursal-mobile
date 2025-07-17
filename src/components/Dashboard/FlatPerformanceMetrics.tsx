import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PerformanceMetricsProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { FlatCollapsibleCard } from './FlatCollapsibleCard';

const FlatMetricCard: React.FC<{
  icon: string;
  iconColor: string;
  iconBackground: string;
  label: string;
  value: string | number;
  suffix?: string;
  subtitle?: string;
}> = ({ icon, iconColor, iconBackground, label, value, suffix, subtitle }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={[styles.metricIconContainer, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
    
    <View style={styles.metricContent}>
      <Text style={styles.metricValue}>
        {value}
        {suffix && <Text style={styles.metricSuffix}>{suffix}</Text>}
      </Text>
      {subtitle && (
        <Text style={styles.metricSubtitle}>{subtitle}</Text>
      )}
    </View>
  </View>
);

export const FlatPerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  data,
  isExpanded,
  onToggle,
}) => {
  const calculateSuccessRate = () => {
    if (data.completedOrders === 0) return 0;
    return Math.round(data.successRate);
  };

  const getPerformanceLevel = (rate: number) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 75) return 'Good';
    if (rate >= 60) return 'Average';
    return 'Needs Improvement';
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return flatColors.performance.excellent;
    if (rate >= 75) return flatColors.performance.good;
    if (rate >= 60) return flatColors.performance.average;
    return flatColors.performance.poor;
  };

  const successRate = calculateSuccessRate();
  const performanceLevel = getPerformanceLevel(successRate);
  const performanceColor = getPerformanceColor(successRate);

  return (
    <FlatCollapsibleCard
      title="Performance Metrics"
      icon="analytics"
      iconColor={flatColors.accent.purple}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={`${data.todayCompletedOrders} completed today • ${successRate}% success rate`}
    >
      <View style={styles.content}>
        <View style={styles.metricsGrid}>
          <FlatMetricCard
            icon="compass"
            iconColor={flatColors.accent.purple}
            iconBackground={flatColors.cards.purple.background}
            label="Available Orders"
            value={data.availableOrders}
            subtitle="Ready to accept"
          />
          
          <FlatMetricCard
            icon="checkmark-done"
            iconColor={flatColors.accent.green}
            iconBackground={flatColors.cards.green.background}
            label="Total Completed"
            value={data.completedOrders}
            subtitle="All time"
          />
          
          <FlatMetricCard
            icon="today"
            iconColor={flatColors.accent.blue}
            iconBackground={flatColors.cards.blue.background}
            label="Today's Orders"
            value={data.todayCompletedOrders}
            subtitle="Completed today"
          />
          
          <FlatMetricCard
            icon="trending-up"
            iconColor={flatColors.accent.orange}
            iconBackground={flatColors.cards.yellow.background}
            label="Success Rate"
            value={successRate}
            suffix="%"
            subtitle={performanceLevel}
          />
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Performance Level</Text>
            <Text style={[styles.progressValue, { color: performanceColor.color }]}>
              {performanceLevel}
            </Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground} />
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${Math.min(successRate, 100)}%`,
                  backgroundColor: performanceColor.color
                }
              ]}
            />
          </View>
          
          <View style={styles.progressLegend}>
            <Text style={styles.progressLegendText}>0%</Text>
            <Text style={styles.progressLegendText}>50%</Text>
            <Text style={styles.progressLegendText}>100%</Text>
          </View>
        </View>
      </View>
    </FlatCollapsibleCard>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  metricCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.subtle,
  },
  metricLabel: {
    ...premiumTypography.caption.large,
    color: flatColors.neutral[600],
    fontWeight: '600',
    flex: 1,
  },
  metricContent: {
    paddingLeft: 40,
  },
  metricValue: {
    ...premiumTypography.numeric.small,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  metricSuffix: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[500],
  },
  metricSubtitle: {
    ...premiumTypography.caption.small,
    color: flatColors.neutral[400],
    fontWeight: '500',
  },
  progressSection: {
    backgroundColor: flatColors.backgrounds.secondary,
    padding: 16,
    borderRadius: 12,
    ...premiumShadows.subtle,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[700],
    fontWeight: '600',
  },
  progressValue: {
    ...premiumTypography.label.medium,
    fontWeight: '700',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: flatColors.neutral[200],
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLegendText: {
    ...premiumTypography.caption.small,
    color: flatColors.neutral[400],
    fontWeight: '500',
  },
});