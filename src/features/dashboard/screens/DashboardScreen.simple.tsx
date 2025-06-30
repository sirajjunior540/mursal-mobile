/**
 * Simplified DashboardScreen for testing the refactored structure
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../shared/styles/theme';

const DashboardScreen: React.FC = memo(() => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Refactored Dashboard Screen</Text>
    </View>
  );
});

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
  },
});

DashboardScreen.displayName = 'DashboardScreen';

export default DashboardScreen;