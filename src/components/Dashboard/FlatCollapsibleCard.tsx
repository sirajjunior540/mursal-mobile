import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CollapsibleCardProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const FlatCollapsibleCard: React.FC<CollapsibleCardProps> = ({
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
            <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
              <Ionicons name={icon} size={20} color="#FFFFFF" />
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
                  <Ionicons name="refresh" size={18} color={flatColors.neutral[600]} />
                </View>
              </TouchableOpacity>
            )}
            
            <View style={[styles.chevronContainer, isExpanded && styles.chevronExpanded]}>
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color={flatColors.neutral[400]}
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
    backgroundColor: flatColors.cards.white.background,
    borderRadius: 20,
    overflow: 'hidden',
    ...premiumShadows.soft,
    borderWidth: 1,
    borderColor: flatColors.cards.white.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: flatColors.backgrounds.primary,
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
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.subtle,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...premiumTypography.headline.medium,
    color: flatColors.neutral[800],
    marginBottom: 2,
    fontWeight: '700',
  },
  summary: {
    ...premiumTypography.caption.large,
    color: flatColors.neutral[500],
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
    backgroundColor: flatColors.neutral[100],
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
    backgroundColor: flatColors.neutral[50],
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: flatColors.neutral[100],
  },
  content: {
    backgroundColor: flatColors.backgrounds.primary,
  },
  contentDivider: {
    height: 1,
    backgroundColor: flatColors.neutral[100],
    marginHorizontal: 20,
  },
});