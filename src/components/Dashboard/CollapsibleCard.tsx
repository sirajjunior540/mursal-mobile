import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CollapsibleCardProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { dashboardStyles } from '../../design/dashboard/styles';

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
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
    <TouchableOpacity 
      style={dashboardStyles.collapsibleCard}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={dashboardStyles.collapsibleHeader}>
        <View style={dashboardStyles.collapsibleHeaderLeft}>
          <View style={[
            dashboardStyles.collapsibleHeaderIcon,
            { backgroundColor: `${iconColor}15` }
          ]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <View style={dashboardStyles.headerTextContainer}>
            <Text style={dashboardStyles.sectionTitle}>{title}</Text>
            {summaryText && (
              <Text style={dashboardStyles.summaryText}>{summaryText}</Text>
            )}
          </View>
        </View>
        <View style={dashboardStyles.collapsibleHeaderRight}>
          {showRefresh && onRefresh && isExpanded && (
            <TouchableOpacity
              style={dashboardStyles.refreshButton}
              onPress={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
            >
              <Ionicons name="refresh" size={20} color={Design.colors.textSecondary} />
            </TouchableOpacity>
          )}
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={Design.colors.textSecondary} 
          />
        </View>
      </View>

      {isExpanded && (
        <View style={dashboardStyles.collapsibleContent}>
          {children}
        </View>
      )}
    </TouchableOpacity>
  );
};