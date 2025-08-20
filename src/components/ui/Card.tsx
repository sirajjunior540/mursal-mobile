import React from 'react';
import {
  View,
  StyleSheet,
  ViewProps,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Haptics from 'react-native-haptic-feedback';
import { Design } from '../../constants/designSystem';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  animated?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'medium',
  onPress,
  animated = true,
  style,
  ...props
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: Design.animation.medium,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(1);
    }
  }, [animated]);

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        ...Design.animation.spring,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...Design.animation.spring,
      }).start();
    }
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      onPress();
    }
  };

  const cardStyle = [
    styles.card,
    styles[variant],
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
    style,
  ];

  const AnimatedContent = (
    <Animated.View
      style={[
        cardStyle,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {AnimatedContent}
      </TouchableOpacity>
    );
  }

  return AnimatedContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Design.borderRadius.large,
    overflow: 'hidden',
  },
  
  // Variants
  elevated: {
    backgroundColor: Design.colors.secondarySystemGroupedBackground,
    ...Platform.select({
      ios: Design.shadows.medium,
      android: { elevation: 4 },
    }),
  },
  filled: {
    backgroundColor: Design.colors.secondarySystemBackground,
  },
  outlined: {
    backgroundColor: Design.colors.systemBackground,
    borderWidth: 1,
    borderColor: Design.colors.separator,
  },
  
  // Padding
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: Design.spacing.s,
  },
  paddingMedium: {
    padding: Design.spacing.m,
  },
  paddingLarge: {
    padding: Design.spacing.l,
  },
});

export default Card;