import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Props {
  children: ReactNode;
  contextName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ContextErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error(`🚨 Context Error in ${this.props.contextName}:`, error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRestart = () => {
    // Reset the error boundary
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={48} color={COLORS.error} />
            </View>
            
            <Text style={styles.errorTitle}>Context Error</Text>
            <Text style={styles.errorMessage}>
              An error occurred in {this.props.contextName}
            </Text>
            
            {this.state.error && (
              <Text style={styles.errorDetails}>
                {this.state.error.message}
              </Text>
            )}
            
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={this.handleRestart}
            >
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            {__DEV__ && this.state.errorInfo && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorDetails: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.default,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  debugInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    maxHeight: 200,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.text.primary,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.text.secondary,
  },
});

export default ContextErrorBoundary;