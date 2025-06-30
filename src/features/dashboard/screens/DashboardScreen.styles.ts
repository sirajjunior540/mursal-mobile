/**
 * DashboardScreen component styles
 */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../shared/styles/theme';

export const createDashboardScreenStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  safeArea: {
    flex: 1,
  },
  
  content: {
    flex: 1,
  },
});