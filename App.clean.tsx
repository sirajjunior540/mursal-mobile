/**
 * Clean App.tsx for testing the refactored structure without legacy dependencies
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Infrastructure
import { logger } from './src/infrastructure/logging/logger';

// Feature providers and components
import { AuthProvider } from './src/features/auth/context/AuthContext';
import { OrderProvider } from './src/features/orders/context/OrderProvider';
import { DashboardScreen } from './src/features';

// Theme
import { theme } from './src/shared/styles/theme';

const App: React.FC = () => {
  React.useEffect(() => {
    logger.info('Mursal Driver App started successfully with refactored structure');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OrderProvider>
            <View style={styles.container}>
              <Text style={styles.title}>Mursal Driver App</Text>
              <Text style={styles.subtitle}>✅ Refactored Architecture</Text>
              <View style={styles.dashboardContainer}>
                <DashboardScreen />
              </View>
            </View>
          </OrderProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.headlineLarge,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.success,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    fontWeight: '600',
  },
  dashboardContainer: {
    flex: 1,
    marginTop: theme.spacing.lg,
  },
});

export default App;