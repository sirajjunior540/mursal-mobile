import { Design } from '../../constants/designSystem';

export const dashboardColors = {
  // Status colors
  online: {
    background: Design.colors.successBackground,
    text: Design.colors.success,
    indicator: '#10B981',
  },
  offline: {
    background: Design.colors.gray100,
    text: Design.colors.textSecondary,
    indicator: '#6B7280',
  },
  
  // Stat card colors
  statCards: {
    blue: {
      background: '#3B82F6',
      icon: '#FFFFFF',
      text: '#FFFFFF',
    },
    green: {
      background: '#10B981',
      icon: '#FFFFFF',
      text: '#FFFFFF',
    },
    yellow: {
      background: '#F59E0B',
      icon: '#FFFFFF',
      text: '#FFFFFF',
    },
    purple: {
      background: '#8B5CF6',
      icon: '#FFFFFF',
      text: '#FFFFFF',
    },
    orange: {
      background: '#F97316',
      icon: '#FFFFFF',
      text: '#FFFFFF',
    },
  },
  
  // Performance metric colors
  performanceIcons: {
    purple: '#8B5CF6',
    green: '#10B981',
    orange: '#F59E0B',
    red: '#EF4444',
  },
  
  // Card colors
  cardHeader: {
    iconBackground: '#EFF6FF',
    iconColor: '#3B82F6',
  },
  
  // Order status colors
  orderStatus: {
    pending: '#F59E0B',
    accepted: '#3B82F6',
    picked_up: '#8B5CF6',
    in_transit: '#6366F1',
    delivered: '#10B981',
    cancelled: '#EF4444',
  },
};