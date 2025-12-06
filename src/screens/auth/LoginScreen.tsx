import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLogo from '../../components/AppLogo';
import { FlatInputField } from '../../components/Auth/FlatInputField';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { useAuth } from '../../contexts/AuthContext';

// Navigation types
type RootStackParamList = {
  Login: undefined;
  OTPVerification: { phoneNumber: string; sessionId: string };
  Main: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LoginFormData {
  phone: string;
}

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { sendOTP, isLoading, error } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    phone: '',
  });
  const [sendingOTP, setSendingOTP] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<LoginFormData>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const updateFormData = (field: keyof LoginFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<LoginFormData> = {};

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (formData.phone.length < 9) {
      errors.phone = 'Enter a valid phone number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOTP = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setSendingOTP(true);
    try {
      // Format phone number - add + if not present
      let phone = formData.phone.trim();
      if (!phone.startsWith('+')) {
        // Assume Saudi Arabia if no country code
        phone = phone.startsWith('0') ? `+966${phone.substring(1)}` : `+966${phone}`;
      }

      // Send OTP to phone number
      const response = await sendOTP(phone);

      // Navigate to OTP verification screen
      navigation.navigate('OTPVerification', {
        phoneNumber: phone,
        sessionId: response.session_id,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
      Alert.alert('Error', errorMessage);
    } finally {
      setSendingOTP(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.light} />
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[flatColors.brand.lighter, '#FFE7C7']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.decorativeBlob, styles.blobTopRight]} />
        <View style={[styles.decorativeBlob, styles.blobBottomLeft]} />
        <View style={styles.ring} />

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
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.logoBadge}>
                    <AppLogo size="small" color={flatColors.brand.secondary} />
                  </View>
                  <View style={styles.tagBadge}>
                    <Ionicons name="sparkles" size={16} color={flatColors.brand.secondary} />
                    <Text style={styles.tagText}>Driver Home Look</Text>
                  </View>
                </View>

                <Text style={styles.heroTitle}>Drive the Mursal way</Text>
                <Text style={styles.heroSubtitle}>
                  Same crisp cards and calm palette from the home screen, now on sign-in.
                </Text>

                <View style={styles.heroPills}>
                  <View style={styles.pill}>
                    <Ionicons name="flash" size={16} color={flatColors.brand.secondary} />
                    <Text style={styles.pillText}>Live dispatch ready</Text>
                  </View>
                  <View style={styles.pill}>
                    <Ionicons name="shield-checkmark" size={16} color={flatColors.brand.text} />
                    <Text style={styles.pillText}>Secure session</Text>
                  </View>
                </View>
              </View>

              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Sign in to continue</Text>
                  <Text style={styles.formSubtitle}>Enter your phone number to receive a verification code</Text>
                </View>

                <FlatInputField
                  label="Phone number"
                  icon="call"
                  value={formData.phone}
                  onChangeText={updateFormData('phone')}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  editable={!isLoading && !sendingOTP}
                  error={validationErrors.phone}
                  placeholder="e.g., 0501234567"
                />

                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color={flatColors.accent.red} />
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.loginButton, (isLoading || sendingOTP) && styles.loginButtonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isLoading || sendingOTP}
                  activeOpacity={0.85}
                >
                  {sendingOTP ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator color={flatColors.backgrounds.primary} size="small" />
                      <Text style={styles.loginButtonText}>Sending code...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.loginButtonText}>Send verification code</Text>
                      <Ionicons name="chatbubbles" size={18} color={flatColors.backgrounds.primary} />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.supportRow}>
                  <Ionicons name="information-circle" size={16} color={flatColors.neutral[500]} />
                  <Text style={styles.supportText}>
                    You'll receive a 6-digit code via SMS. If you're not registered, contact your operations lead.
                  </Text>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.secondary,
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
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeBlob: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
    opacity: 1,
  },
  blobTopRight: {
    top: -40,
    right: -30,
  },
  blobBottomLeft: {
    bottom: -50,
    left: -20,
  },
  ring: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 16,
    borderColor: 'rgba(245, 166, 35, 0.08)',
    top: '12%',
    right: '-20%',
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: flatColors.brand.light,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.brand.lighter,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tagText: {
    ...premiumTypography.caption.medium,
    color: flatColors.brand.text,
    fontWeight: '600',
  },
  heroTitle: {
    ...premiumTypography.display.small,
    color: flatColors.brand.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[700],
    marginBottom: 14,
  },
  heroPills: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: flatColors.brand.light,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  pillText: {
    ...premiumTypography.caption.medium,
    color: flatColors.brand.text,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    shadowColor: flatColors.neutral[800],
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  formHeader: {
    marginBottom: 12,
    gap: 6,
  },
  formTitle: {
    ...premiumTypography.headline.large,
    color: flatColors.neutral[800],
    fontWeight: '700',
  },
  formSubtitle: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[600],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.red.background,
    borderWidth: 1,
    borderColor: flatColors.accent.red,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    marginTop: 2,
  },
  errorBannerText: {
    ...premiumTypography.callout,
    color: flatColors.accent.red,
    flex: 1,
  },
  loginButton: {
    backgroundColor: flatColors.brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.08,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    ...premiumTypography.button.large,
    color: flatColors.backgrounds.primary,
    fontWeight: '700',
  },
  supportRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  supportText: {
    ...premiumTypography.footnote,
    color: flatColors.neutral[600],
    flex: 1,
  },
});

export default LoginScreen;
