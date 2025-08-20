/**
 * Enhanced Button component with accessibility and performance optimizations
 */
import React, { memo, useCallback, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  Animated,
  Platform,
  AccessibilityRole,
  GestureResponderEvent,
} from 'react-native';
import Haptics from 'react-native-haptic-feedback';
import { theme } from '../../styles/theme';
import { BaseComponentProps } from '../../types';
import { createButtonStyles } from './Button.styles';

export interface ButtonProps extends BaseComponentProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onPress?: (event: GestureResponderEvent) => void;
  style?: any;
  textStyle?: any;
  hapticFeedback?: boolean;
  accessibilityRole?: AccessibilityRole;
}

const Button: React.FC<ButtonProps> = memo(({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onPress,
  style,
  textStyle,
  hapticFeedback = true,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = createButtonStyles(theme);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [disabled, loading, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [disabled, loading, scaleAnim]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    if (disabled || loading || !onPress) return;

    if (hapticFeedback) {
      Haptics.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    onPress(event);
  }, [disabled, loading, onPress, hapticFeedback]);

  const getButtonStyle = useCallback(() => {
    const baseStyle = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      (disabled || loading) && styles.disabled,
      style,
    ];
    return baseStyle;
  }, [styles, variant, size, fullWidth, disabled, loading, style]);

  const getTextStyle = useCallback(() => {
    const baseStyle = [
      styles.text,
      styles[`${variant}Text`],
      styles[`${size}Text`],
      (disabled || loading) && styles.disabledText,
      textStyle,
    ];
    return baseStyle;
  }, [styles, variant, size, disabled, loading, textStyle]);

  const getAccessibilityState = useCallback(() => ({
    disabled: disabled || loading,
    busy: loading,
  }), [disabled, loading]);

  const renderContent = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            color={variant === 'primary' || variant === 'destructive' 
              ? theme.colors.white 
              : theme.colors.primary}
            size={size === 'small' ? 'small' : 'small'}
          />
          <Text style={[getTextStyle(), styles.loadingText]}>
            {title}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {icon && iconPosition === 'left' && (
          <View style={styles.iconLeft}>{icon}</View>
        )}
        <Text style={getTextStyle()}>{title}</Text>
        {icon && iconPosition === 'right' && (
          <View style={styles.iconRight}>{icon}</View>
        )}
      </View>
    );
  }, [loading, variant, size, title, icon, iconPosition, styles, getTextStyle]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        {...props}
        style={getButtonStyle()}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        testID={testID}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={getAccessibilityState()}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
});

Button.displayName = 'Button';

export default Button;