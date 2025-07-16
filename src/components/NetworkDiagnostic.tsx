import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ENV } from '../config/environment';

export const NetworkDiagnostic: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [details, setDetails] = useState<string>('');

  const checkConnection = async () => {
    setStatus('checking');
    setDetails('Checking connection...');
    
    try {
      const url = `${ENV.API_BASE_URL}/whoami/`;
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 5 seconds')), 5000);
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, {
          method: 'GET',
          headers: {
            'Host': ENV.API_HOST,
            'Content-Type': 'application/json',
          },
        }),
        timeoutPromise
      ]) as Response;
      
      if (response.ok) {
        const text = await response.text();
        setStatus('success');
        setDetails(`Connected to: ${ENV.API_BASE_URL}\nResponse: ${text}`);
      } else {
        setStatus('error');
        setDetails(`Failed: HTTP ${response.status}`);
      }
    } catch (error) {
      setStatus('error');
      setDetails(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nAPI URL: ${ENV.API_BASE_URL}\nHost: ${ENV.API_HOST}`);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, styles[status]]} />
      <Text style={styles.text}>{details}</Text>
      <TouchableOpacity style={styles.button} onPress={checkConnection}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  checking: {
    backgroundColor: 'orange',
  },
  success: {
    backgroundColor: 'green',
  },
  error: {
    backgroundColor: 'red',
  },
  text: {
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});