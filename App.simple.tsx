/**
 * Simplified App.tsx for testing the refactored structure
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Test imports
import { theme } from './src/shared/styles/theme';
import { logger } from './src/infrastructure/logging/logger';
import { DashboardScreen } from './src/features';

const App: React.FC = () => {
  React.useEffect(() => {
    logger.info('App started successfully');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <Text style={styles.title}>Mursal Driver App</Text>
          <Text style={styles.subtitle}>Refactored Structure Test</Text>
          <DashboardScreen />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.headlineLarge,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
});

export default App;