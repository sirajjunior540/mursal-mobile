import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface HeartbeatIndicatorProps {
  isActive: boolean;
  size?: number;
  color?: string;
  pulseColor?: string;
}

const HeartbeatIndicator: React.FC<HeartbeatIndicatorProps> = ({
  isActive,
  size = 12,
  color = COLORS.success,
  pulseColor = COLORS.success + '30', // 30% opacity
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      // Create heartbeat animation
      const heartbeat = Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 2,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(800), // Pause between heartbeats
      ]);

      // Loop the animation
      const loopAnimation = Animated.loop(heartbeat, { iterations: -1 });
      loopAnimation.start();

      return () => {
        loopAnimation.stop();
        pulseAnim.setValue(1);
        scaleAnim.setValue(1);
      };
    } else {
      // Stop animation and reset values
      pulseAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [isActive, pulseAnim, scaleAnim]);

  if (!isActive) {
    return (
      <View style={[styles.indicator, { width: size, height: size }]}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: COLORS.text.secondary,
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.indicator, { width: size * 2, height: size * 2 }]}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            borderColor: pulseColor,
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 2],
              outputRange: [0.8, 0],
            }),
          },
        ]}
      />
      {/* Center dot */}
      <Animated.View
        style={[
          styles.centerDot,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  indicator: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  centerDot: {
    position: 'absolute',
  },
  dot: {
    // Static dot styles
  },
});

export default HeartbeatIndicator;