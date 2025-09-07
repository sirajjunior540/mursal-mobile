/**
 * NotificationBadge - Badge component to show unread notification count on tab bar
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { notificationApiService } from '../services/api/notificationService';

interface NotificationBadgeProps {
  focused: boolean;
  color: string;
  size: number;
  iconName: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  focused,
  color,
  size,
  iconName,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial load
    loadUnreadCount();

    // Set up polling for unread count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationApiService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread notification count:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* This would be the Ionicon component */}
      <View style={styles.iconPlaceholder} />
      
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    // This is just a placeholder - in the actual implementation,
    // this would be replaced with the Ionicons component
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationBadge;