import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  Dimensions,
  TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Design } from '../../constants/designSystem';
import AppLogo from '../../components/AppLogo';

const { width } = Dimensions.get('window');

interface LoginFormData {
  username: string;
  password: string;
  deliveryProvider: string;
  rememberMe: boolean;
}

interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (text: string) => void;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
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
  const animatedBorder = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    Animated.timing(animatedBorder, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value, animatedLabel, animatedBorder]);

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
      outputRange: [Design.colors.textTertiary, Design.colors.primary],
    }),
  };

  const borderStyle = {
    borderColor: animatedBorder.interpolate({
      inputRange: [0, 1],
      outputRange: [Design.colors.border, Design.colors.primary],
    }),
  };

  return (
    <View style={styles.inputGroup}>
      <Animated.View style={[styles.inputContainer, borderStyle, error && styles.inputError]}>
        <View style={styles.inputIconWrapper}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFocused ? Design.colors.primary : Design.colors.textSecondary} 
          />
        </View>
        
        <View style={styles.inputTextContainer}>
          <Animated.Text style={[styles.inputLabel, labelStyle]}>
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
              color={Design.colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={Design.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const LoginScreen: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    deliveryProvider: '',
    rememberMe: true, // Default to true for better UX
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<LoginFormData>>({});
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  
  // Default tenant for backend compatibility
  const selectedTenant = 'sirajjunior';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale]);

  const updateFormData = (field: keyof LoginFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
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
      await login(formData.username, formData.password, selectedTenant);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      Alert.alert('Login Error', errorMessage);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Design.colors.primary} translucent />
      <LinearGradient
        colors={[Design.colors.primary, Design.colors.primaryDark]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View
                style={[
                  styles.contentContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                {/* Header with Logo */}
                <Animated.View
                  style={[
                    styles.header,
                    {
                      transform: [{ scale: logoScale }],
                    }
                  ]}
                >
                  <View style={styles.logoContainer}>
                    <AppLogo size="large" color={Design.colors.textInverse} />
                  </View>
                  <Text style={styles.welcomeText}>Welcome Back</Text>
                  <Text style={styles.subtitle}>Sign in to start delivering</Text>
                </Animated.View>

                {/* Form Card */}
                <View style={styles.formCard}>
                  <InputField
                    label="Delivery Provider"
                    icon="business"
                    value={formData.deliveryProvider}
                    onChangeText={updateFormData('deliveryProvider')}
                    autoCapitalize="words"
                    editable={!isLoading}
                    error={validationErrors.deliveryProvider}
                  />

                  <InputField
                    label="Username"
                    icon="person"
                    value={formData.username}
                    onChangeText={updateFormData('username')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    error={validationErrors.username}
                  />

                  <InputField
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
                  <View style={styles.rememberMeContainer}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => updateFormData('rememberMe')(String(!formData.rememberMe))}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, formData.rememberMe && styles.checkboxChecked]}>
                        {formData.rememberMe && (
                          <Ionicons name="checkmark" size={16} color={Design.colors.textInverse} />
                        )}
                      </View>
                      <Text style={styles.rememberMeText}>Keep me signed in</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Global Error Display */}
                  {error && (
                    <View style={styles.globalErrorContainer}>
                      <Ionicons name="alert-circle" size={16} color={Design.colors.error} />
                      <Text style={styles.globalErrorText}>{error}</Text>
                    </View>
                  )}

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.disabledButton]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isLoading 
                        ? [Design.colors.gray400, Design.colors.gray500] 
                        : [Design.colors.success, '#48bb78']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator color={Design.colors.textInverse} size="small" />
                          <Text style={styles.buttonText}>Signing in...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Text style={styles.buttonText}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={20} color={Design.colors.textInverse} />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Help Section */}
                  <View style={styles.helpSection}>
                    <Text style={styles.helpText}>
                      Need help getting started? Contact your delivery provider
                    </Text>
                    <Text style={styles.securityNote}>
                      🔒 Your login is secured and will be remembered for convenience
                    </Text>
                  </View>
                </View>

                {/* Bottom Decoration */}
                <View style={styles.bottomDecoration}>
                  <View style={styles.decorativeDot} />
                  <View style={styles.decorativeDot} />
                  <View style={styles.decorativeDot} />
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Design.spacing[5],
    paddingVertical: Design.spacing[8],
  },
  contentContainer: {
    alignItems: 'center',
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: Design.spacing[8],
  },
  logoContainer: {
    marginBottom: Design.spacing[6],
  },
  welcomeText: {
    ...Design.typography.h2,
    color: Design.colors.textInverse,
    textAlign: 'center',
    marginBottom: Design.spacing[2],
    fontWeight: '700',
  },
  subtitle: {
    ...Design.typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Form Styles
  formCard: {
    width: width * 0.9,
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.xl,
    padding: Design.spacing[8],
    ...Design.shadows.large,
  },
  inputGroup: {
    marginBottom: Design.spacing[6],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.backgroundSecondary,
    borderRadius: Design.borderRadius.md,
    borderWidth: 2,
    borderColor: Design.colors.border,
    paddingHorizontal: Design.spacing[4],
    minHeight: 64,
    position: 'relative',
  },
  inputError: {
    borderColor: Design.colors.error,
  },
  inputIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: Design.borderRadius.base,
    backgroundColor: `${Design.colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing[3],
  },
  inputTextContainer: {
    flex: 1,
    position: 'relative',
  },
  inputLabel: {
    position: 'absolute',
    left: 0,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  textInput: {
    ...Design.typography.body,
    color: Design.colors.text,
    paddingVertical: Design.spacing[4],
    paddingTop: Design.spacing[5],
    margin: 0,
  },
  passwordToggle: {
    padding: Design.spacing[2],
    marginLeft: Design.spacing[2],
  },
  
  // Error Styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Design.spacing[2],
  },
  errorText: {
    ...Design.typography.bodySmall,
    color: Design.colors.error,
    marginLeft: Design.spacing[1],
    flex: 1,
  },
  globalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.errorBackground,
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[6],
    borderWidth: 1,
    borderColor: Design.colors.errorBorder,
  },
  globalErrorText: {
    ...Design.typography.bodySmall,
    color: Design.colors.errorText,
    marginLeft: Design.spacing[2],
    flex: 1,
  },
  
  // Button Styles
  loginButton: {
    borderRadius: Design.borderRadius.md,
    overflow: 'hidden',
    marginTop: Design.spacing[4],
    ...Design.shadows.medium,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: Design.spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Design.spacing[2],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Design.spacing[3],
  },
  buttonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
    fontWeight: '600',
  },
  
  // Remember Me Styles
  rememberMeContainer: {
    marginBottom: Design.spacing[4],
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing[2],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Design.borderRadius.base,
    borderWidth: 2,
    borderColor: Design.colors.border,
    marginRight: Design.spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Design.colors.backgroundSecondary,
  },
  checkboxChecked: {
    backgroundColor: Design.colors.primary,
    borderColor: Design.colors.primary,
  },
  rememberMeText: {
    ...Design.typography.body,
    color: Design.colors.text,
    fontWeight: '500',
  },

  // Help Section
  helpSection: {
    marginTop: Design.spacing[8],
    alignItems: 'center',
  },
  helpText: {
    ...Design.typography.bodySmall,
    color: Design.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Design.spacing[3],
  },
  securityNote: {
    ...Design.typography.bodySmall,
    color: Design.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  
  // Bottom Decoration
  bottomDecoration: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Design.spacing[8],
    gap: Design.spacing[2],
  },
  decorativeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default LoginScreen;