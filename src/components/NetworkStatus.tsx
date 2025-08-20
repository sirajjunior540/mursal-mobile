import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { theme } from '../shared/styles/theme';

const { width } = Dimensions.get('window');

export const NetworkStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected;
      setIsConnected(connected);
      
      if (connected === false) {
        setIsVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      } else if (connected === true && isVisible) {
        // Hide after showing "Connected" briefly
        setTimeout(() => {
          Animated.spring(slideAnim, {
            toValue: -50,
            useNativeDriver: true,
          }).start(() => {
            setIsVisible(false);
          });
        }, 2000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [slideAnim, isVisible]);

  if (!isVisible) return null;

  const backgroundColor = isConnected 
    ? theme.colors.success 
    : theme.colors.error;
    
  const message = isConnected 
    ? 'Connected' 
    : 'No Internet Connection';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...theme.typography.bodySmall,
    color: theme.colors.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
});