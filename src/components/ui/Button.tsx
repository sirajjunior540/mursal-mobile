import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  TouchableOpacityProps,
  Animated,
} from 'react-native';
import Haptics from 'react-native-haptic-feedback';
import { Design } from '../../constants/designSystem';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'large',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  onPress,
  ...props
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      ...Design.animation.spring,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...Design.animation.spring,
    }).start();
  };

  const handlePress = (event: object) => {
    if (!disabled && !loading) {
      // Haptic feedback
      Haptics.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      onPress?.(event);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[variant], styles[size]];
    if (fullWidth) baseStyle.push(styles.fullWidth);
    if (disabled || loading) baseStyle.push(styles.disabled);
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${variant}Text`], styles[`${size}Text`]];
    if (disabled || loading) baseStyle.push(styles.disabledText);
    return baseStyle;
  };

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
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' ? Design.colors.white : Design.colors.primary}
            size={size === 'small' ? 'small' : 'small'}
          />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
            <Text style={getTextStyle()}>{title}</Text>
            {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Design.borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: Design.shadows.small,
      android: { elevation: 2 },
    }),
  },
  
  // Variants
  primary: {
    backgroundColor: Design.colors.primary,
  },
  secondary: {
    backgroundColor: Design.colors.systemGray5,
  },
  destructive: {
    backgroundColor: Design.colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  
  // Sizes
  small: {
    paddingHorizontal: Design.spacing.m,
    paddingVertical: Design.spacing.s,
    minHeight: Design.touchTargets.minimum,
  },
  medium: {
    paddingHorizontal: Design.spacing.l,
    paddingVertical: Design.spacing.m,
    minHeight: Design.touchTargets.recommended,
  },
  large: {
    paddingHorizontal: Design.spacing.xl,
    paddingVertical: Design.spacing.m + 2,
    minHeight: Design.touchTargets.large,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Design.spacing.s,
  },
  iconRight: {
    marginLeft: Design.spacing.s,
  },
  
  // Text Styles
  text: {
    fontFamily: 'System',
    fontWeight: '600',
  },
  primaryText: {
    color: Design.colors.white,
  },
  secondaryText: {
    color: Design.colors.label,
  },
  destructiveText: {
    color: Design.colors.white,
  },
  ghostText: {
    color: Design.colors.primary,
  },
  
  // Text Sizes
  smallText: {
    ...Design.typography.footnote,
    fontWeight: '600',
  },
  mediumText: {
    ...Design.typography.subheadline,
    fontWeight: '600',
  },
  largeText: {
    ...Design.typography.body,
    fontWeight: '600',
  },
  
  disabledText: {
    opacity: 0.5,
  },
});

export default Button;