/**
 * Enhanced Card component with accessibility and performance optimizations
 */
import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  GestureResponderEvent,
  ViewStyle,
} from 'react-native';
import Haptics from 'react-native-haptic-feedback';
import { theme } from '../../styles/theme';
import { BaseComponentProps } from '../../types';
import { createCardStyles } from './Card.styles';

export interface CardProps extends BaseComponentProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  animated?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  hapticFeedback?: boolean;
  disabled?: boolean;
}

const Card: React.FC<CardProps> = memo(({
  children,
  variant = 'elevated',
  padding = 'medium',
  onPress,
  onLongPress,
  animated = true,
  style,
  contentStyle,
  hapticFeedback = true,
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const styles = createCardStyles(theme);

  React.useEffect(() => {
    if (animated) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: theme.animation.timing.normal,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(1);
    }
  }, [animated, opacityAnim]);

  const handlePressIn = useCallback(() => {
    if (disabled || !onPress) return;
    
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [disabled, onPress, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (disabled || !onPress) return;
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [disabled, onPress, scaleAnim]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    if (disabled || !onPress) return;

    if (hapticFeedback) {
      Haptics.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    onPress(event);
  }, [disabled, onPress, hapticFeedback]);

  const handleLongPress = useCallback((event: GestureResponderEvent) => {
    if (disabled || !onLongPress) return;

    if (hapticFeedback) {
      Haptics.trigger('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    onLongPress(event);
  }, [disabled, onLongPress, hapticFeedback]);

  const cardStyle = [
    styles.card,
    styles[variant],
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
    disabled && styles.disabled,
    style,
  ];

  const contentContainerStyle = [
    styles.content,
    contentStyle,
  ];

  const animatedStyle = {
    opacity: opacityAnim,
    transform: [{ scale: scaleAnim }],
  };

  const getAccessibilityProps = useCallback(() => {
    const baseProps = {
      testID,
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole: accessibilityRole || (onPress ? 'button' : undefined),
      accessibilityState: { disabled },
    };

    return baseProps;
  }, [testID, accessibilityLabel, accessibilityHint, accessibilityRole, onPress, disabled]);

  if (onPress || onLongPress) {
    return (
      <Animated.View style={[cardStyle, animatedStyle]}>
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          disabled={disabled}
          style={styles.touchable}
          {...getAccessibilityProps()}
          {...props}
        >
          <View style={contentContainerStyle}>
            {children}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[cardStyle, animatedStyle]}
      {...getAccessibilityProps()}
      {...props}
    >
      <View style={contentContainerStyle}>
        {children}
      </View>
    </Animated.View>
  );
});

Card.displayName = 'Card';

export default Card;