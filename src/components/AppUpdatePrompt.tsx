import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { theme } from '../shared/styles/theme';
import { logger } from '../infrastructure/logging/logger';

interface AppVersion {
  current: string;
  latest: string;
  required: boolean;
  releaseNotes?: string;
}

interface AppUpdatePromptProps {
  checkForUpdates?: boolean;
}

export const AppUpdatePrompt: React.FC<AppUpdatePromptProps> = ({
  checkForUpdates = true,
}) => {
  const [updateInfo, setUpdateInfo] = useState<AppVersion | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!checkForUpdates) return;

    const checkAppVersion = async () => {
      try {
        const currentVersion = DeviceInfo.getVersion();
        
        // In a real app, this would call your backend API to check for updates
        const mockLatestVersion = '1.2.0'; // This would come from your API
        const mockRequired = false; // Whether this update is mandatory
        
        if (shouldShowUpdate(currentVersion, mockLatestVersion)) {
          setUpdateInfo({
            current: currentVersion,
            latest: mockLatestVersion,
            required: mockRequired,
            releaseNotes: 'Bug fixes and performance improvements',
          });
          setShowPrompt(true);
        }
      } catch (error) {
        logger.error('Error checking app version', error as Error);
      }
    };

    // Check for updates on app start
    checkAppVersion();
  }, [checkForUpdates]);

  const shouldShowUpdate = (current: string, latest: string): boolean => {
    // Simple version comparison (in production, use a proper semver library)
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (latestPart > currentPart) {
        return true;
      } else if (latestPart < currentPart) {
        return false;
      }
    }
    
    return false;
  };

  const handleUpdate = () => {
    setShowPrompt(false);
    
    Alert.alert(
      'Update Available',
      'Please update the app from your app store to get the latest features and bug fixes.',
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => {
            if (updateInfo?.required) {
              // For required updates, you might want to close the app
              logger.warn('Required update declined');
            }
          },
        },
        {
          text: 'Update',
          onPress: () => {
            // In a real app, this would open the app store
            logger.info('User chose to update app');
          },
        },
      ]
    );
  };

  const handleDismiss = () => {
    if (updateInfo?.required) {
      Alert.alert(
        'Update Required',
        'This update is required to continue using the app.',
        [
          {
            text: 'Update Now',
            onPress: handleUpdate,
          },
        ]
      );
      return;
    }
    
    setShowPrompt(false);
  };

  if (!showPrompt || !updateInfo) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={showPrompt}
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {updateInfo.required ? 'Update Required' : 'Update Available'}
          </Text>
          
          <Text style={styles.subtitle}>
            Version {updateInfo.latest} is now available
          </Text>
          
          {updateInfo.releaseNotes && (
            <Text style={styles.releaseNotes}>
              {updateInfo.releaseNotes}
            </Text>
          )}
          
          <View style={styles.buttonContainer}>
            {!updateInfo.required && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleDismiss}
              >
                <Text style={styles.secondaryButtonText}>Later</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleUpdate}
            >
              <Text style={styles.primaryButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  releaseNotes: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  secondaryButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text,
    fontWeight: '600',
  },
});