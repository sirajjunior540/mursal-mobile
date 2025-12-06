import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLogo from '../../components/AppLogo';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { useAuth } from '../../contexts/AuthContext';

// Define route params type
type OTPVerificationParams = {
  phoneNumber: string;
  sessionId: string;
};

type RootStackParamList = {
  Login: undefined;
  OTPVerification: OTPVerificationParams;
  Main: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'OTPVerification'>;

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { phoneNumber, sessionId: initialSessionId } = route.params;
  const { verifyOTP, resendOTP, isLoading } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);

  const inputRefs = useRef<Array<TextInput | null>>([]);
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

    // Focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 600);
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify when all digits are entered
    if (index === 5 && text) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleVerifyOTP(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOTP(phoneNumber, code, currentSessionId);

      if (response.is_new_driver) {
        // Driver not registered - show message
        Alert.alert(
          'Registration Required',
          'Your phone number is not registered as a driver. Please contact your operations team to register.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      // If existing driver, login is handled automatically by verifyOTP
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid OTP code. Please try again.'
      );
      // Clear OTP inputs
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;

    setResending(true);
    try {
      const response = await resendOTP(phoneNumber, currentSessionId);
      setCurrentSessionId(response.session_id);
      setTimer(60);
      Alert.alert('Success', 'OTP code has been resent');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend OTP. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display
    if (phone.startsWith('+966')) {
      const num = phone.slice(4);
      return `+966 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
    }
    return phone;
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
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={flatColors.brand.text} />
            </TouchableOpacity>

            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.logoBadge}>
                  <Ionicons name="chatbubbles" size={32} color={flatColors.brand.secondary} />
                </View>
              </View>

              <Text style={styles.heroTitle}>Verify Phone Number</Text>
              <Text style={styles.heroSubtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.phoneHighlight}>{formatPhoneNumber(phoneNumber)}</Text>
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : undefined,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!loading && !isLoading}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (loading || isLoading || otp.join('').length !== 6) && styles.verifyButtonDisabled,
                ]}
                onPress={() => handleVerifyOTP()}
                disabled={loading || isLoading || otp.join('').length !== 6}
                activeOpacity={0.85}
              >
                {loading || isLoading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color={flatColors.backgrounds.primary} size="small" />
                    <Text style={styles.verifyButtonText}>Verifying...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                    <Ionicons name="checkmark-circle" size={20} color={flatColors.backgrounds.primary} />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didn't receive the code?{' '}
                </Text>
                {timer > 0 ? (
                  <Text style={styles.timerText}>Resend in {timer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOTP} disabled={resending}>
                    {resending ? (
                      <ActivityIndicator size="small" color={flatColors.brand.secondary} />
                    ) : (
                      <Text style={styles.resendLink}>Resend Code</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.changeNumberButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="pencil" size={16} color={flatColors.brand.text} />
                <Text style={styles.changeNumberText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
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
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  content: {
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
    top: '18%',
    left: '-18%',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: flatColors.brand.lighter,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
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
    alignItems: 'center',
  },
  heroHeader: {
    marginBottom: 16,
  },
  logoBadge: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 36,
    backgroundColor: flatColors.brand.light,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  heroTitle: {
    ...premiumTypography.display.small,
    color: flatColors.brand.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: flatColors.brand.secondary,
  },
  formCard: {
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: flatColors.brand.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: flatColors.brand.text,
    textAlign: 'center',
    backgroundColor: flatColors.brand.lighter,
  },
  otpInputFilled: {
    borderColor: flatColors.brand.secondary,
    backgroundColor: flatColors.brand.light,
  },
  verifyButton: {
    backgroundColor: flatColors.brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.08,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verifyButtonText: {
    ...premiumTypography.button.large,
    color: flatColors.backgrounds.primary,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  resendText: {
    ...premiumTypography.body.small,
    color: flatColors.neutral[700],
  },
  timerText: {
    ...premiumTypography.body.small,
    color: flatColors.neutral[600],
    fontWeight: '600',
  },
  resendLink: {
    ...premiumTypography.body.small,
    color: flatColors.brand.secondary,
    fontWeight: '700',
  },
  changeNumberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  changeNumberText: {
    ...premiumTypography.body.small,
    color: flatColors.brand.text,
    fontWeight: '600',
  },
});

export default OTPVerificationScreen;
