import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CollapsibleCardProps } from '../../types/dashboard.types';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const PremiumCollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  icon,
  iconColor,
  isExpanded,
  onToggle,
  summaryText,
  showRefresh,
  onRefresh,
  children,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.header}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
              <LinearGradient
                colors={[iconColor, `${iconColor}CC`]}
                style={styles.iconGradient}
              >
                <Ionicons name={icon} size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
              {summaryText && !isExpanded && (
                <Text style={styles.summary}>{summaryText}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.headerRight}>
            {showRefresh && onRefresh && isExpanded && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.refreshButtonBackground}>
                  <Ionicons name="refresh" size={18} color={premiumColors.neutral[600]} />
                </View>
              </TouchableOpacity>
            )}
            
            <View style={[styles.chevronContainer, isExpanded && styles.chevronExpanded]}>
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color={premiumColors.neutral[400]}
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.content}>
            <View style={styles.contentDivider} />
            {children}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 8,
  },
  card: {
    backgroundColor: premiumColors.cards.elevated.background,
    borderRadius: 20,
    overflow: 'hidden',
    ...premiumShadows.soft,
    borderWidth: 1,
    borderColor: premiumColors.cards.elevated.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: premiumColors.cards.frosted.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 16,
    overflow: 'hidden',
    ...premiumShadows.subtle,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...premiumTypography.headline.medium,
    color: premiumColors.neutral[800],
    marginBottom: 2,
    fontWeight: '700',
  },
  summary: {
    ...premiumTypography.caption.large,
    color: premiumColors.neutral[500],
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: premiumColors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.subtle,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: premiumColors.neutral[50],
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: premiumColors.neutral[100],
  },
  content: {
    backgroundColor: '#FFFFFF',
  },
  contentDivider: {
    height: 1,
    backgroundColor: premiumColors.neutral[100],
    marginHorizontal: 20,
  },
});