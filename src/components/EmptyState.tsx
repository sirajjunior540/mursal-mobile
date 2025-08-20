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
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={64} color={Design.colors.gray400} />
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
    padding: Design.spacing[6],
  },
  title: {
    ...Design.typography.h3,
    color: Design.colors.textPrimary,
    marginTop: Design.spacing[3],
    marginBottom: Design.spacing[2],
    textAlign: 'center',
  },
  message: {
    ...Design.typography.body,
    color: Design.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Design.spacing[6],
    paddingHorizontal: Design.spacing[3],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing[2],
    paddingHorizontal: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    backgroundColor: Design.colors.primary,
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