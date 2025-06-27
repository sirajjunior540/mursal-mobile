import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { locationService } from '../services/locationService';
import { realtimeService, RealtimeMode, RealtimeConfig } from '../services/realtimeService';
import { Storage } from '../utils';

const SettingsScreen: React.FC = () => {
  const [locationTracking, setLocationTracking] = useState(false);
  const [realtimeConfig, setRealtimeConfig] = useState<RealtimeConfig>({
    mode: 'polling',
    pollingInterval: 5000,
    enabled: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [locationWebSocket, setLocationWebSocket] = useState(false);
  const [orderWebSocket, setOrderWebSocket] = useState(false);

  useEffect(() => {
    // Initialize services and load current state
    initializeSettings();
    
    // Set up realtime service callbacks
    realtimeService.setCallbacks({
      onConnectionChange: (connected) => {
        setIsConnected(connected);
      },
      onError: (error) => {
        Alert.alert('Connection Error', error);
      },
    });

    return () => {
      // Cleanup on unmount
      if (!realtimeConfig.enabled) {
        realtimeService.stop();
      }
    };
  }, []);

  const initializeSettings = async () => {
    try {
      // Initialize realtime service
      await realtimeService.initialize();
      
      // Get current configuration
      const config = realtimeService.getConfig();
      setRealtimeConfig(config);
      
      // Check if location tracking is active
      setLocationTracking(locationService.isLocationTracking());
      
      // Check connection status
      setIsConnected(realtimeService.isConnectedToServer());

      // Load WebSocket preferences from storage
      const locationWsEnabled = await Storage.getItem('location_websocket_enabled') || false;
      const orderWsEnabled = await Storage.getItem('order_websocket_enabled') || false;
      setLocationWebSocket(locationWsEnabled);
      setOrderWebSocket(orderWsEnabled);
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  };

  const toggleLocationTracking = async () => {
    try {
      if (locationTracking) {
        locationService.stopLocationTracking();
        setLocationTracking(false);
        Alert.alert('Location Tracking', 'Location tracking has been disabled.');
      } else {
        await locationService.startLocationTracking();
        setLocationTracking(true);
        Alert.alert('Location Tracking', 'Location tracking has been enabled.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle location tracking. Please try again.');
      console.error('Location tracking toggle error:', error);
    }
  };

  const toggleRealtimeOrders = async () => {
    try {
      const newEnabled = !realtimeConfig.enabled;
      const newConfig = { ...realtimeConfig, enabled: newEnabled };
      
      await realtimeService.setConfig(newConfig);
      setRealtimeConfig(newConfig);
      
      if (newEnabled) {
        realtimeService.start();
        Alert.alert('Real-time Orders', 'Real-time order notifications have been enabled.');
      } else {
        realtimeService.stop();
        Alert.alert('Real-time Orders', 'Real-time order notifications have been disabled.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle real-time orders. Please try again.');
      console.error('Realtime orders toggle error:', error);
    }
  };

  const switchRealtimeMode = async (mode: RealtimeMode) => {
    try {
      const newConfig = { ...realtimeConfig, mode };
      await realtimeService.setConfig(newConfig);
      setRealtimeConfig(newConfig);
      
      Alert.alert(
        'Mode Changed',
        `Switched to ${mode === 'polling' ? 'Polling' : 'WebSocket'} mode.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to switch mode. Please try again.');
      console.error('Mode switch error:', error);
    }
  };

  const adjustPollingInterval = (interval: number) => {
    Alert.alert(
      'Polling Interval',
      `Set polling interval to ${interval / 1000} seconds?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const newConfig = { ...realtimeConfig, pollingInterval: interval };
              await realtimeService.setConfig(newConfig);
              setRealtimeConfig(newConfig);
            } catch (error) {
              Alert.alert('Error', 'Failed to update polling interval.');
              console.error('Polling interval update error:', error);
            }
          },
        },
      ]
    );
  };

  const toggleLocationWebSocket = async () => {
    try {
      const newEnabled = !locationWebSocket;
      await Storage.setItem('location_websocket_enabled', newEnabled);
      setLocationWebSocket(newEnabled);
      
      Alert.alert(
        'Location WebSocket',
        `Location sharing via WebSocket ${newEnabled ? 'enabled' : 'disabled'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update location WebSocket setting.');
      console.error('Location WebSocket toggle error:', error);
    }
  };

  const toggleOrderWebSocket = async () => {
    try {
      const newEnabled = !orderWebSocket;
      await Storage.setItem('order_websocket_enabled', newEnabled);
      setOrderWebSocket(newEnabled);
      
      // Update realtime service mode if orders are enabled
      if (realtimeConfig.enabled) {
        const newMode: RealtimeMode = newEnabled ? 'websocket' : 'polling';
        await switchRealtimeMode(newMode);
      }
      
      Alert.alert(
        'Order WebSocket',
        `Order notifications via WebSocket ${newEnabled ? 'enabled' : 'disabled'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update order WebSocket setting.');
      console.error('Order WebSocket toggle error:', error);
    }
  };

  const ConnectionStatus = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.statusDot, { backgroundColor: isConnected ? COLORS.success : COLORS.error }]} />
      <Text style={styles.statusText}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Driver Settings</Text>

      {/* Location Tracking Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Tracking</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Location Tracking</Text>
            <Text style={styles.settingDescription}>
              Share your location for real-time delivery tracking
            </Text>
          </View>
          <Switch
            value={locationTracking}
            onValueChange={toggleLocationTracking}
            trackColor={{ false: COLORS.gray300, true: COLORS.primary + '40' }}
            thumbColor={locationTracking ? COLORS.primary : COLORS.gray500}
          />
        </View>

        {/* Location WebSocket Toggle */}
        {locationTracking && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Use WebSocket for Location</Text>
              <Text style={styles.settingDescription}>
                Real-time location sharing via WebSocket (more battery intensive)
              </Text>
            </View>
            <Switch
              value={locationWebSocket}
              onValueChange={toggleLocationWebSocket}
              trackColor={{ false: COLORS.gray300, true: COLORS.primary + '40' }}
              thumbColor={locationWebSocket ? COLORS.primary : COLORS.gray500}
            />
          </View>
        )}
      </View>

      {/* Real-time Orders Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Real-time Orders</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Real-time Orders</Text>
            <Text style={styles.settingDescription}>
              Receive new order notifications instantly
            </Text>
          </View>
          <Switch
            value={realtimeConfig.enabled}
            onValueChange={toggleRealtimeOrders}
            trackColor={{ false: COLORS.gray300, true: COLORS.primary + '40' }}
            thumbColor={realtimeConfig.enabled ? COLORS.primary : COLORS.gray500}
          />
        </View>

        {/* Order WebSocket Toggle */}
        {realtimeConfig.enabled && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Use WebSocket for Orders</Text>
              <Text style={styles.settingDescription}>
                Instant order notifications via WebSocket
              </Text>
            </View>
            <Switch
              value={orderWebSocket}
              onValueChange={toggleOrderWebSocket}
              trackColor={{ false: COLORS.gray300, true: COLORS.primary + '40' }}
              thumbColor={orderWebSocket ? COLORS.primary : COLORS.gray500}
            />
          </View>
        )}

        {realtimeConfig.enabled && (
          <>
            <ConnectionStatus />
            
            {/* Mode Selection */}
            <View style={styles.modeContainer}>
              <Text style={styles.subSectionTitle}>Connection Mode</Text>
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    realtimeConfig.mode === 'polling' && styles.modeButtonActive,
                  ]}
                  onPress={() => switchRealtimeMode('polling')}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      realtimeConfig.mode === 'polling' && styles.modeButtonTextActive,
                    ]}
                  >
                    Polling
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    realtimeConfig.mode === 'websocket' && styles.modeButtonActive,
                  ]}
                  onPress={() => switchRealtimeMode('websocket')}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      realtimeConfig.mode === 'websocket' && styles.modeButtonTextActive,
                    ]}
                  >
                    WebSocket
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Polling Interval (only show in polling mode) */}
            {realtimeConfig.mode === 'polling' && (
              <View style={styles.intervalContainer}>
                <Text style={styles.subSectionTitle}>Polling Interval</Text>
                <Text style={styles.intervalDescription}>
                  Current: {realtimeConfig.pollingInterval / 1000} seconds
                </Text>
                <View style={styles.intervalButtons}>
                  {[3000, 5000, 10000, 15000].map((interval) => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.intervalButton,
                        realtimeConfig.pollingInterval === interval && styles.intervalButtonActive,
                      ]}
                      onPress={() => adjustPollingInterval(interval)}
                    >
                      <Text
                        style={[
                          styles.intervalButtonText,
                          realtimeConfig.pollingInterval === interval && styles.intervalButtonTextActive,
                        ]}
                      >
                        {interval / 1000}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information</Text>
        <Text style={styles.infoText}>
          • Location tracking is required for delivery assignments and customer updates
        </Text>
        <Text style={styles.infoText}>
          • Polling mode checks for new orders at regular intervals
        </Text>
        <Text style={styles.infoText}>
          • WebSocket mode provides instant notifications but may use more battery
        </Text>
        <Text style={styles.infoText}>
          • Lower polling intervals provide faster updates but use more data
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  subSectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  settingDescription: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  statusText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  modeContainer: {
    marginBottom: SPACING.md,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modeButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeButtonText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: COLORS.white,
  },
  intervalContainer: {
    marginBottom: SPACING.md,
  },
  intervalDescription: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  intervalButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
  },
  intervalButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intervalButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  intervalButtonTextActive: {
    color: COLORS.white,
  },
  infoText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
});

export default SettingsScreen;