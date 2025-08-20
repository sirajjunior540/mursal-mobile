import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface DateRange {
  id: string;
  label: string;
  days: number;
  icon: string;
}

interface DateRangeFilterProps {
  selectedRange: string;
  onRangeChange: (rangeId: string) => void;
  orderCounts?: Record<string, number>;
}

const dateRanges: DateRange[] = [
  { id: 'today', label: 'Today', days: 1, icon: 'today-outline' },
  { id: 'week', label: 'This Week', days: 7, icon: 'calendar-outline' },
  { id: 'month', label: 'This Month', days: 30, icon: 'calendar-number-outline' },
  { id: 'all', label: 'All Time', days: 0, icon: 'time-outline' },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  selectedRange,
  onRangeChange,
  orderCounts = {}
}) => {
  const renderDateRangeButton = ({ item }: { item: DateRange }) => {
    const isSelected = selectedRange === item.id;
    const orderCount = orderCounts[item.id] || 0;

    return (
      <TouchableOpacity
        style={[styles.rangeButton, isSelected && styles.rangeButtonActive]}
        onPress={() => onRangeChange(item.id)}
      >
        <View style={styles.rangeContent}>
          <View style={[styles.iconContainer, isSelected && styles.iconContainerActive]}>
            <Ionicons 
              name={item.icon} 
              size={16} 
              color={isSelected ? '#FFFFFF' : flatColors.neutral[600]} 
            />
          </View>
          
          <View style={styles.rangeText}>
            <Text style={[styles.rangeLabel, isSelected && styles.rangeLabelActive]}>
              {item.label}
            </Text>
            {orderCount > 0 && (
              <Text style={[styles.orderCount, isSelected && styles.orderCountActive]}>
                {orderCount} orders
              </Text>
            )}
          </View>
        </View>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={dateRanges}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderDateRangeButton}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  rangeButton: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    padding: 16,
    minWidth: 120,
    borderWidth: 2,
    borderColor: flatColors.neutral[200],
    position: 'relative',
  },
  rangeButtonActive: {
    backgroundColor: flatColors.accent.blue,
    borderColor: flatColors.accent.blue,
  },
  rangeContent: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  rangeText: {
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
    marginBottom: 2,
  },
  rangeLabelActive: {
    color: '#FFFFFF',
  },
  orderCount: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: premiumTypography.caption.small.fontWeight,
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.neutral[500],
  },
  orderCountActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});