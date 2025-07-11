import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants';

export type ConnectionType = 'api' | 'websocket' | 'connecting' | 'disconnected';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface ConnectionStatusIndicatorProps {
  type: ConnectionType;
  status: ConnectionStatus;
  size?: number;
  showLabel?: boolean;
  label?: string;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  type,
  status,
  size = 12,
  showLabel = false,
  label,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'connecting') {
      // Connecting animation - pulsing gray
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
        pulseAnim.setValue(1);
      };
    } else if (status === 'connected' && type === 'websocket') {
      // WebSocket animation - wave effect
      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      wave.start();

      return () => {
        wave.stop();
        waveAnim.setValue(0);
      };
    } else if (status === 'connected' && type === 'api') {
      // API calls animation - heartbeat
      const heartbeat = Animated.loop(
        Animated.sequence([
          Animated.timing(heartbeatAnim, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(heartbeatAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(1500), // Pause between heartbeats
        ])
      );
      heartbeat.start();

      return () => {
        heartbeat.stop();
        heartbeatAnim.setValue(1);
      };
    } else {
      // Reset all animations
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
      heartbeatAnim.setValue(1);
    }
  }, [status, type, pulseAnim, waveAnim, heartbeatAnim]);

  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
        return COLORS.success || '#4CAF50';
      case 'connecting':
        return COLORS.warning || '#FF9800';
      case 'error':
        return COLORS.error || '#F44336';
      case 'disconnected':
      default:
        return COLORS.text?.secondary || '#9E9E9E';
    }
  };

  // const getIcon = (): string => {
  //   switch (type) {
  //     case 'api':
  //       return 'pulse-outline';
  //     case 'websocket':
  //       return 'radio-outline';
  //     case 'connecting':
  //       return 'ellipsis-horizontal';
  //     case 'disconnected':
  //     default:
  //       return 'radio-button-off-outline';
  //   }
  // };

  const getDisplayLabel = (): string => {
    if (label) return label;
    
    const typeLabels = {
      api: 'API',
      websocket: 'WebSocket', 
      connecting: 'Connecting',
      disconnected: 'Offline'
    };
    
    const statusLabels = {
      connected: 'Connected',
      connecting: 'Connecting',
      error: 'Error',
      disconnected: 'Offline'
    };
    
    return showLabel ? `${typeLabels[type]} ${statusLabels[status]}` : typeLabels[type];
  };

  const renderIndicator = () => {
    const color = getStatusColor();
    
    if (status === 'connecting') {
      // Pulsing gray dot for connecting
      return (
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      );
    }
    
    if (status === 'connected' && type === 'websocket') {
      // Wave effect for WebSocket
      return (
        <View style={[styles.indicator, { width: size * 2, height: size * 2 }]}>
          <Animated.View
            style={[
              styles.waveRing,
              {
                width: size * 2,
                height: size * 2,
                borderRadius: size,
                borderColor: `${color}60`,
                transform: [{ scale: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.8]
                }) }],
                opacity: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 0]
                }),
              },
            ]}
          />
          <View
            style={[
              styles.centerDot,
              {
                backgroundColor: color,
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          />
        </View>
      );
    }
    
    if (status === 'connected' && type === 'api') {
      // Heartbeat for API calls
      return (
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: heartbeatAnim }],
            },
          ]}
        />
      );
    }
    
    // Static dot for other states
    return (
      <View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { width: size * 2, height: size * 2 }]}>
        {renderIndicator()}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: getStatusColor() }]}>
          {getDisplayLabel()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
  },
  centerDot: {
    position: 'absolute',
  },
  waveRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ConnectionStatusIndicator;