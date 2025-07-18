import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

interface HistoryHeaderProps {
  currentTab: 'history' | 'earnings';
  onTabChange: (tab: 'history' | 'earnings') => void;
  onBack: () => void;
  showEarningsTab?: boolean;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  currentTab,
  onTabChange,
  onBack,
  showEarningsTab = false
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={flatColors.neutral[800]} />
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {currentTab === 'history' ? 'Order History' : 'Earnings'}
        </Text>
        
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => {/* Handle info */}}
        >
          <Ionicons name="information-circle-outline" size={24} color={flatColors.neutral[500]} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher - Only show if earnings tab is enabled */}
      {showEarningsTab && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'history' && styles.activeTab]}
            onPress={() => onTabChange('history')}
          >
            <Ionicons 
              name="time-outline" 
              size={20} 
              color={currentTab === 'history' ? flatColors.accent.blue : flatColors.neutral[500]} 
            />
            <Text style={[
              styles.tabText,
              currentTab === 'history' && styles.activeTabText
            ]}>
              History
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, currentTab === 'earnings' && styles.activeTab]}
            onPress={() => onTabChange('earnings')}
          >
            <Ionicons 
              name="wallet-outline" 
              size={20} 
              color={currentTab === 'earnings' ? flatColors.accent.blue : flatColors.neutral[500]} 
            />
            <Text style={[
              styles.tabText,
              currentTab === 'earnings' && styles.activeTabText
            ]}>
              Earnings
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    ...premiumShadows.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  title: {
    fontSize: premiumTypography.headline.large.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.large.lineHeight,
    color: flatColors.neutral[800],
  },
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: flatColors.accent.blue,
  },
  tabText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[600],
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});