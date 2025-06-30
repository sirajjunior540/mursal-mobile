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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ConnectionTester } from '../../utils/connectionTest';
import { ENV } from '../../config/environment';
import { Design } from '../../constants/designSystem';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const { login, isLoading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [deliveryProvider, setDeliveryProvider] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDebug, setShowDebug] = useState(__DEV__);
  const [debugResults, setDebugResults] = useState<any>(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  
  // Default tenant for backend compatibility
  const selectedTenant = 'sirajjunior';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    
    if (!deliveryProvider.trim()) {
      Alert.alert('Error', 'Please enter your delivery provider');
      return;
    }

    try {
      await login(username, password, selectedTenant);
    } catch (err) {
      console.error('Login error:', err);
      // Error is handled by the context and displayed below
    }
  };

  const runConnectionTest = async () => {
    setDebugResults({ testing: true });
    const results = await ConnectionTester.runAllTests();
    setDebugResults(results);
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
                {/* Header */}
                <Animated.View
                  style={[
                    styles.header,
                    {
                      transform: [{ scale: logoScale }],
                    }
                  ]}
                >
                  <View style={styles.logoContainer}>
                    <View style={styles.logoBackground}>
                      <Ionicons name="car-sport" size={48} color="#ffffff" />
                    </View>
                  </View>
                  <Text style={styles.title}>MURSAL</Text>
                  <Text style={styles.subtitle}>Driver Portal</Text>
                  <Text style={styles.tagline}>Sign in to start delivering</Text>
                </Animated.View>

                {/* Form Card */}
                <View style={styles.formCard}>
                    {/* Delivery Provider Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Delivery Provider</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputIconContainer}>
                          <Ionicons name="business-outline" size={20} color="#667eea" />
                        </View>
                        <TextInput
                          style={styles.inputWithIcon}
                          value={deliveryProvider}
                          onChangeText={setDeliveryProvider}
                          placeholder="e.g., Uber Eats, DoorDash, Grubhub"
                          placeholderTextColor="#9ca3af"
                          autoCapitalize="words"
                          editable={!isLoading}
                        />
                      </View>
                    </View>

                    {/* Username Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Username</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputIconContainer}>
                          <Ionicons name="person-outline" size={20} color="#667eea" />
                        </View>
                        <TextInput
                          style={styles.inputWithIcon}
                          value={username}
                          onChangeText={setUsername}
                          placeholder="Enter your username"
                          placeholderTextColor="#9ca3af"
                          autoCapitalize="none"
                          editable={!isLoading}
                        />
                      </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputIconContainer}>
                          <Ionicons name="lock-closed-outline" size={20} color="#667eea" />
                        </View>
                        <TextInput
                          style={styles.inputWithIcon}
                          value={password}
                          onChangeText={setPassword}
                          placeholder="Enter your password"
                          placeholderTextColor="#9ca3af"
                          secureTextEntry={!showPassword}
                          editable={!isLoading}
                        />
                        <TouchableOpacity
                          style={styles.passwordToggle}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Ionicons 
                            name={showPassword ? "eye-off" : "eye"} 
                            size={20} 
                            color="#6b7280" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Error Display */}
                    {error && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Login Button */}
                    <TouchableOpacity
                      style={[styles.loginButton, isLoading && styles.disabledButton]}
                      onPress={handleLogin}
                      disabled={isLoading}
                    >
                      <LinearGradient
                        colors={isLoading ? ['#9ca3af', '#6b7280'] : ['#667eea', '#764ba2']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {isLoading ? (
                          <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.loadingText}>Signing in...</Text>
                          </View>
                        ) : (
                          <View style={styles.buttonContent}>
                            <Text style={styles.loginButtonText}>Sign In</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Help Text */}
                    <Text style={styles.helpText}>
                      New driver? Contact your delivery provider to get started
                    </Text>
                </View>

                {/* Debug Panel for Development */}
                {__DEV__ && (
                  <View style={styles.debugContainer}>
                    <TouchableOpacity 
                      style={styles.debugToggle}
                      onPress={() => setShowDebug(!showDebug)}
                    >
                      <LinearGradient
                        colors={['#3b82f6', '#2563eb']}
                        style={styles.debugToggleGradient}
                      >
                        <Text style={styles.debugToggleText}>
                          {showDebug ? '🔧 Hide Debug' : '🔧 Show Debug'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {showDebug && (
                      <View style={styles.debugPanel}>
                        <Text style={styles.debugTitle}>Connection Debug</Text>
                        
                        <View style={styles.envInfo}>
                          <Text style={styles.envLabel}>Current Environment:</Text>
                          <Text style={styles.envValue}>API: {ENV.API_BASE_URL}</Text>
                          <Text style={styles.envValue}>Host: {ENV.API_HOST}</Text>
                          <Text style={styles.envValue}>Tenant: {ENV.DEFAULT_TENANT_ID}</Text>
                        </View>

                        <TouchableOpacity 
                          style={styles.testButton}
                          onPress={runConnectionTest}
                          disabled={debugResults?.testing}
                        >
                          <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.testButtonGradient}
                          >
                            <Text style={styles.testButtonText}>
                              {debugResults?.testing ? 'Testing...' : 'Test Connection'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        {debugResults && !debugResults.testing && (
                          <ScrollView style={styles.resultsContainer} nestedScrollEnabled>
                            <Text style={styles.resultsTitle}>Test Results:</Text>
                            {Object.entries(debugResults).map(([key, result]: [string, any]) => (
                              <View key={key} style={styles.resultItem}>
                                <Text style={[
                                  styles.resultTitle,
                                  { color: result.success ? '#10b981' : '#ef4444' }
                                ]}>
                                  {key}: {result.success ? '✅' : '❌'}
                                </Text>
                                <Text style={styles.resultMessage}>{result.message}</Text>
                                {result.details && (
                                  <Text style={styles.resultDetails}>
                                    {JSON.stringify(result.details, null, 2).substring(0, 200)}...
                                  </Text>
                                )}
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </View>
                )}
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
    paddingVertical: Design.spacing[10],
  },
  contentContainer: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Design.spacing[10],
  },
  logoContainer: {
    marginBottom: Design.spacing[6],
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Design.shadows.medium,
  },
  title: {
    ...Design.typography.h1,
    color: Design.colors.textInverse,
    textAlign: 'center',
    marginBottom: Design.spacing[2],
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...Design.typography.h5,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Design.spacing[1],
  },
  tagline: {
    ...Design.typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formCard: {
    width: width * 0.9,
    borderRadius: Design.borderRadius.xl,
    backgroundColor: Design.colors.background,
    padding: Design.spacing[8],
    ...Design.shadows.large,
  },
  inputContainer: {
    marginBottom: Design.spacing[5],
  },
  label: {
    ...Design.typography.label,
    color: Design.colors.text,
    marginBottom: Design.spacing[3],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.inputBackground,
    borderRadius: Design.borderRadius.md,
    borderWidth: 1,
    borderColor: Design.colors.inputBorder,
    ...Design.shadows.small,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Design.borderRadius.base,
    backgroundColor: `${Design.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Design.spacing[2],
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: Design.spacing[3],
    paddingHorizontal: Design.spacing[4],
    ...Design.typography.body,
    color: Design.colors.text,
    minHeight: 48,
  },
  passwordToggle: {
    padding: Design.spacing[3],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.errorBackground,
    padding: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[5],
    borderWidth: 1,
    borderColor: Design.colors.errorBorder,
  },
  errorText: {
    ...Design.typography.bodySmall,
    color: Design.colors.errorText,
    marginLeft: Design.spacing[2],
    flex: 1,
  },
  loginButton: {
    borderRadius: Design.borderRadius.md,
    overflow: 'hidden',
    marginTop: Design.spacing[3],
    ...Design.shadows.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: Design.spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Design.spacing[2],
  },
  loginButtonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Design.spacing[3],
  },
  loadingText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
  },
  helpText: {
    marginTop: Design.spacing[6],
    textAlign: 'center',
    ...Design.typography.bodySmall,
    color: Design.colors.textSecondary,
  },
  // Debug styles
  debugContainer: {
    width: width * 0.9,
    marginTop: Design.spacing[5],
    borderRadius: Design.borderRadius.lg,
    overflow: 'hidden',
  },
  debugToggle: {
    borderRadius: Design.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Design.spacing[3],
  },
  debugToggleGradient: {
    padding: Design.spacing[3],
    alignItems: 'center',
  },
  debugToggleText: {
    ...Design.typography.buttonSmall,
    color: Design.colors.textInverse,
  },
  debugPanel: {
    backgroundColor: Design.colors.background,
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.md,
    ...Design.shadows.small,
  },
  debugTitle: {
    ...Design.typography.h5,
    color: Design.colors.text,
    marginBottom: Design.spacing[3],
  },
  envInfo: {
    marginBottom: Design.spacing[4],
    padding: Design.spacing[3],
    backgroundColor: Design.colors.backgroundSecondary,
    borderRadius: Design.borderRadius.base,
  },
  envLabel: {
    ...Design.typography.label,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing[2],
  },
  envValue: {
    ...Design.typography.caption,
    color: Design.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: Design.spacing[1],
  },
  testButton: {
    borderRadius: Design.borderRadius.base,
    overflow: 'hidden',
    marginBottom: Design.spacing[4],
  },
  testButtonGradient: {
    padding: Design.spacing[3],
    alignItems: 'center',
  },
  testButtonText: {
    ...Design.typography.buttonSmall,
    color: Design.colors.textInverse,
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: Design.colors.backgroundTertiary,
    borderRadius: Design.borderRadius.base,
    padding: Design.spacing[3],
  },
  resultsTitle: {
    ...Design.typography.label,
    color: Design.colors.text,
    marginBottom: Design.spacing[3],
  },
  resultItem: {
    marginBottom: Design.spacing[3],
    padding: Design.spacing[3],
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.sm,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  resultTitle: {
    ...Design.typography.bodySmall,
    fontWeight: '600',
  },
  resultMessage: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[1],
  },
  resultDetails: {
    fontSize: 10,
    color: Design.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: Design.spacing[1],
  },
});

export default LoginScreen;