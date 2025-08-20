import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PerformanceMetricsProps } from '../../types/dashboard.types';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { PremiumCollapsibleCard } from './PremiumCollapsibleCard';

const PremiumMetricCard: React.FC<{
  icon: string;
  iconColor: string;
  gradientColors: string[];
  label: string;
  value: string | number;
  suffix?: string;
  subtitle?: string;
}> = ({ icon, iconColor, gradientColors, label, value, suffix, subtitle }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={styles.metricIconContainer}>
        <LinearGradient
          colors={gradientColors}
          style={styles.metricIconGradient}
        >
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </LinearGradient>
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

export const PremiumPerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
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

  const successRate = calculateSuccessRate();
  const performanceLevel = getPerformanceLevel(successRate);

  return (
    <PremiumCollapsibleCard
      title="Performance Metrics"
      icon="analytics"
      iconColor={premiumColors.gradients.royal[0]}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={`${data.todayCompletedOrders} completed today • ${successRate}% success rate`}
    >
      <View style={styles.content}>
        <View style={styles.metricsGrid}>
          <PremiumMetricCard
            icon="compass"
            iconColor={premiumColors.gradients.royal[0]}
            gradientColors={premiumColors.gradients.royal}
            label="Available Orders"
            value={data.availableOrders}
            subtitle="Ready to accept"
          />
          
          <PremiumMetricCard
            icon="checkmark-done"
            iconColor={premiumColors.gradients.success[0]}
            gradientColors={premiumColors.gradients.success}
            label="Total Completed"
            value={data.completedOrders}
            subtitle="All time"
          />
          
          <PremiumMetricCard
            icon="today"
            iconColor={premiumColors.gradients.ocean[0]}
            gradientColors={premiumColors.gradients.ocean}
            label="Today's Orders"
            value={data.todayCompletedOrders}
            subtitle="Completed today"
          />
          
          <PremiumMetricCard
            icon="trending-up"
            iconColor={premiumColors.gradients.sunset[0]}
            gradientColors={premiumColors.gradients.sunset}
            label="Success Rate"
            value={successRate}
            suffix="%"
            subtitle={performanceLevel}
          />
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Performance Level</Text>
            <Text style={styles.progressValue}>{performanceLevel}</Text>
          </View>
          
          <View style={styles.progressContainer}>
            <LinearGradient
              colors={[premiumColors.neutral[200], premiumColors.neutral[100]]}
              style={styles.progressBackground}
            />
            <LinearGradient
              colors={
                successRate >= 90 
                  ? premiumColors.gradients.success
                  : successRate >= 75
                  ? premiumColors.gradients.ocean
                  : successRate >= 60
                  ? premiumColors.gradients.warning
                  : premiumColors.gradients.sunset
              }
              style={[styles.progressFill, { width: `${Math.min(successRate, 100)}%` }]}
            />
          </View>
          
          <View style={styles.progressLegend}>
            <Text style={styles.progressLegendText}>0%</Text>
            <Text style={styles.progressLegendText}>50%</Text>
            <Text style={styles.progressLegendText}>100%</Text>
          </View>
        </View>
      </View>
    </PremiumCollapsibleCard>
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
    overflow: 'hidden',
    ...premiumShadows.subtle,
  },
  metricIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    ...premiumTypography.caption.large,
    color: premiumColors.neutral[600],
    fontWeight: '600',
    flex: 1,
  },
  metricContent: {
    paddingLeft: 40,
  },
  metricValue: {
    ...premiumTypography.numeric.small,
    color: premiumColors.neutral[800],
    marginBottom: 2,
  },
  metricSuffix: {
    ...premiumTypography.caption.medium,
    color: premiumColors.neutral[500],
  },
  metricSubtitle: {
    ...premiumTypography.caption.small,
    color: premiumColors.neutral[400],
    fontWeight: '500',
  },
  progressSection: {
    backgroundColor: premiumColors.neutral[50],
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
    color: premiumColors.neutral[700],
    fontWeight: '600',
  },
  progressValue: {
    ...premiumTypography.label.medium,
    color: premiumColors.neutral[800],
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
    color: premiumColors.neutral[400],
    fontWeight: '500',
  },
});