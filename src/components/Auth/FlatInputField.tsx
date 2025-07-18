import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInputProps,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface FlatInputFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (text: string) => void;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
  error?: string;
}

export const FlatInputField: React.FC<FlatInputFieldProps> = ({
  label,
  icon,
  value,
  onChangeText,
  showPasswordToggle,
  onTogglePassword,
  showPassword,
  error,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value, animatedLabel]);

  const labelStyle = {
    top: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 0],
    }),
    fontSize: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [flatColors.neutral[500], flatColors.accent.blue],
    }),
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        error && styles.inputError
      ]}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? flatColors.accent.blue : flatColors.neutral[500]}
          />
        </View>

        <View style={styles.inputContent}>
          <Animated.Text style={[styles.label, labelStyle]}>
            {label}
          </Animated.Text>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor="transparent"
            {...props}
          />
        </View>

        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={onTogglePassword}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={flatColors.neutral[500]}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={flatColors.accent.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: flatColors.neutral[200],
    paddingHorizontal: 16,
    minHeight: 64,
    position: 'relative',
  },
  inputFocused: {
    borderColor: flatColors.accent.blue,
  },
  inputError: {
    borderColor: flatColors.accent.red,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputContent: {
    flex: 1,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  textInput: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    paddingVertical: 16,
    paddingTop: 20,
    margin: 0,
  },
  passwordToggle: {
    padding: 8,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.accent.red,
    marginLeft: 4,
    flex: 1,
  },
});