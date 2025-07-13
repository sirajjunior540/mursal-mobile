import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Design } from '../constants/designSystem';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  buttonText?: string;
  onRetry?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'cube-outline',
  title,
  message,
  buttonText = 'Refresh',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={64} color={Design.colors.gray400} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={20} color={Design.colors.primary} />
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Design.spacing.lg,
  },
  title: {
    ...Design.typography.h3,
    color: Design.colors.text.primary,
    marginTop: Design.spacing.md,
    marginBottom: Design.spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Design.typography.body,
    color: Design.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Design.spacing.lg,
    paddingHorizontal: Design.spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing.sm,
    paddingHorizontal: Design.spacing.md,
    borderRadius: Design.borderRadius.md,
    backgroundColor: Design.colors.background.primary,
    borderWidth: 1,
    borderColor: Design.colors.border,
    gap: Design.spacing.xs,
  },
  buttonText: {
    ...Design.typography.button,
    color: Design.colors.primary,
  },
});

export default EmptyState;