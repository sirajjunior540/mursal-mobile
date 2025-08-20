import { StyleSheet } from 'react-native';
import { Design } from '../../constants/designSystem';

export const mapSectionStyles = StyleSheet.create({
  container: {
    padding: 0,
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.textPrimary,
  },
  mapContainer: {
    borderTopWidth: 1,
    borderTopColor: Design.colors.border + '30',
  },
  map: {
    height: 200,
    width: '100%',
  },
  routeInfo: {
    padding: 16,
    backgroundColor: Design.colors.background,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: Design.colors.textPrimary,
  },
  routeLine: {
    marginLeft: 16,
    paddingVertical: 8,
  },
  routeDots: {
    alignItems: 'center',
    gap: 4,
  },
  routeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Design.colors.border,
  },
});