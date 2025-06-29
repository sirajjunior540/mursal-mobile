import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ConnectionTester } from '../../utils/connectionTest';
import { ENV } from '../../config/environment';

const LoginScreen = () => {
  const { login, isLoading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [deliveryProvider, setDeliveryProvider] = useState('');
  const [showDebug, setShowDebug] = useState(__DEV__);
  const [debugResults, setDebugResults] = useState<any>(null);
  
  // Default tenant for backend compatibility
  const selectedTenant = 'sirajjunior';

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

  const getEnvironmentInfo = () => {
    return ConnectionTester.getEnvironmentInfo();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="car-sport" size={40} color="#4CAF50" />
            </View>
            <Text style={styles.title}>Mursal Driver</Text>
            <Text style={styles.subtitle}>Sign in to start delivering</Text>
          </View>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Delivery Provider</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={deliveryProvider}
                onChangeText={setDeliveryProvider}
                placeholder="e.g., Uber Eats, DoorDash, Grubhub"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                editable={!isLoading}
              />
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.helpText}>
            New driver? Contact your delivery provider to get started
          </Text>

          {/* Debug Panel for Development */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <TouchableOpacity 
                style={styles.debugToggle}
                onPress={() => setShowDebug(!showDebug)}
              >
                <Text style={styles.debugToggleText}>
                  {showDebug ? '🔧 Hide Debug' : '🔧 Show Debug'}
                </Text>
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
                    <Text style={styles.testButtonText}>
                      {debugResults?.testing ? 'Testing...' : 'Test Connection'}
                    </Text>
                  </TouchableOpacity>

                  {debugResults && !debugResults.testing && (
                    <ScrollView style={styles.resultsContainer} nestedScrollEnabled>
                      <Text style={styles.resultsTitle}>Test Results:</Text>
                      {Object.entries(debugResults).map(([key, result]: [string, any]) => (
                        <View key={key} style={styles.resultItem}>
                          <Text style={[
                            styles.resultTitle,
                            { color: result.success ? '#4CAF50' : '#F44336' }
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  inputIcon: {
    paddingLeft: 15,
    paddingRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 15,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  errorText: {
    color: '#f44336',
    marginBottom: 15,
    textAlign: 'center',
  },
  helpText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  // Debug styles
  debugContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugToggle: {
    padding: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    alignItems: 'center',
  },
  debugToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  debugPanel: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  envInfo: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  envLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  envValue: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'monospace',
  },
  testButton: {
    padding: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    padding: 8,
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  resultItem: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultMessage: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  resultDetails: {
    fontSize: 9,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 2,
  },
});

export default LoginScreen;