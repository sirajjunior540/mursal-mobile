import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { FlatInputField } from './FlatInputField';

interface LoginFormData {
  username: string;
  password: string;
  deliveryProvider: string;
  rememberMe: boolean;
}

interface FlatLoginFormProps {
  onLogin: (username: string, password: string, tenant: string) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export const FlatLoginForm: React.FC<FlatLoginFormProps> = ({
  onLogin,
  isLoading,
  error,
}) => {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    deliveryProvider: '',
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<LoginFormData>>({});

  const updateFormData = (field: keyof LoginFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<LoginFormData> = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }
    
    if (!formData.deliveryProvider.trim()) {
      errors.deliveryProvider = 'Delivery provider is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    try {
      await onLogin(formData.username, formData.password, 'sirajjunior');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      Alert.alert(
        'Login Error',
        errorMessage,
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <FlatInputField
        label="Delivery Provider"
        icon="business"
        value={formData.deliveryProvider}
        onChangeText={updateFormData('deliveryProvider')}
        autoCapitalize="words"
        editable={!isLoading}
        error={validationErrors.deliveryProvider}
      />

      <FlatInputField
        label="Username"
        icon="person"
        value={formData.username}
        onChangeText={updateFormData('username')}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
        error={validationErrors.username}
      />

      <FlatInputField
        label="Password"
        icon="lock-closed"
        value={formData.password}
        onChangeText={updateFormData('password')}
        secureTextEntry={!showPassword}
        showPasswordToggle
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        editable={!isLoading}
        error={validationErrors.password}
      />

      {/* Remember Me Checkbox */}
      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => updateFormData('rememberMe')(String(!formData.rememberMe))}
          activeOpacity={0.7}
        >
          <View style={[styles.checkboxBox, formData.rememberMe && styles.checkboxChecked]}>
            {formData.rememberMe && (
              <Ionicons name="checkmark" size={16} color={flatColors.backgrounds.primary} />
            )}
          </View>
          <Text style={styles.checkboxText}>Keep me signed in</Text>
        </TouchableOpacity>
      </View>

      {/* Global Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={flatColors.accent.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <>
              <ActivityIndicator color={flatColors.backgrounds.primary} size="small" />
              <Text style={styles.buttonText}>Signing in...</Text>
            </>
          ) : (
            <>
              <Text style={styles.buttonText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={20} color={flatColors.backgrounds.primary} />
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Help Section */}
      <View style={styles.helpSection}>
        <Text style={styles.helpText}>
          Need help getting started? Contact your delivery provider
        </Text>
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color={flatColors.accent.green} />
          <Text style={styles.securityText}>
            Your login is secured and will be remembered for convenience
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  checkboxContainer: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: flatColors.brand.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: flatColors.brand.lighter,
  },
  checkboxChecked: {
    backgroundColor: flatColors.brand.secondary,
    borderColor: flatColors.brand.secondary,
  },
  checkboxText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.brand.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.red.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: flatColors.accent.red,
  },
  errorText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.accent.red,
    marginLeft: 8,
    flex: 1,
  },
  loginButton: {
    backgroundColor: flatColors.brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.backgrounds.primary,
  },
  helpSection: {
    alignItems: 'center',
    gap: 12,
  },
  helpText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
    textAlign: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.brand.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  securityText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.brand.text,
    textAlign: 'center',
  },
});
