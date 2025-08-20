import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PerformanceMetricsProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { dashboardColors } from '../../design/dashboard/colors';
import { dashboardStyles } from '../../design/dashboard/styles';

const MetricItem: React.FC<{
  icon: string;
  iconColor: string;
  label: string;
  value: string | number;
  suffix?: string;
}> = ({ icon, iconColor, label, value, suffix }) => (
  <View style={styles.metricItem}>
    <View style={[styles.metricIcon, { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.metricText}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value}{suffix && <Text style={styles.metricSuffix}>{suffix}</Text>}
      </Text>
    </View>
  </View>
);

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  data,
  isExpanded,
  onToggle,
}) => {
  const calculateSuccessRate = () => {
    if (data.completedOrders === 0) return '0';
    return Math.round(data.successRate).toString();
  };

  return (
    <TouchableOpacity 
      style={dashboardStyles.collapsibleCard}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={dashboardStyles.collapsibleHeader}>
        <View style={dashboardStyles.collapsibleHeaderLeft}>
          <View style={[dashboardStyles.collapsibleHeaderIcon, styles.performanceIcon]}>
            <Ionicons name="analytics" size={20} color="#8B5CF6" />
          </View>
          <View style={dashboardStyles.headerTextContainer}>
            <Text style={dashboardStyles.sectionTitle}>Performance Metrics</Text>
            <Text style={dashboardStyles.summaryText}>
              {data.todayCompletedOrders} orders completed today
            </Text>
          </View>
        </View>
        <View style={dashboardStyles.collapsibleHeaderRight}>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={Design.colors.textSecondary} 
          />
        </View>
      </View>

      {isExpanded && (
        <View style={dashboardStyles.collapsibleContent}>
          <View style={styles.metricsGrid}>
            <MetricItem
              icon="compass"
              iconColor={dashboardColors.performanceIcons.purple}
              label="Available Orders"
              value={data.availableOrders}
            />
            <MetricItem
              icon="checkmark-done"
              iconColor={dashboardColors.performanceIcons.green}
              label="Completed Orders"
              value={data.completedOrders}
            />
            <MetricItem
              icon="time"
              iconColor={dashboardColors.performanceIcons.orange}
              label="Today's Orders"
              value={data.todayCompletedOrders}
            />
            <MetricItem
              icon="trending-up"
              iconColor={dashboardColors.performanceIcons.red}
              label="Success Rate"
              value={calculateSuccessRate()}
              suffix="%"
            />
          </View>

          <View style={styles.progressBar}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${Math.min(data.successRate, 100)}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {calculateSuccessRate()}% Success Rate
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  performanceIcon: {
    backgroundColor: '#F3E8FF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Design.spacing[2],
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingHorizontal: Design.spacing[2],
    marginBottom: Design.spacing[4],
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  metricText: {
    flex: 1,
  },
  metricLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    ...Design.typography.h3,
    color: Design.colors.textPrimary,
  },
  metricSuffix: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  progressBar: {
    marginTop: Design.spacing[4],
  },
  progressBackground: {
    height: 8,
    backgroundColor: Design.colors.gray100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: dashboardColors.performanceIcons.green,
    borderRadius: 4,
  },
  progressText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    textAlign: 'center',
    marginTop: Design.spacing[2],
  },
});