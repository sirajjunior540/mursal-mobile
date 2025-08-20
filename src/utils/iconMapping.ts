// Mapping from MaterialCommunityIcons to Ionicons
export const iconMap: Record<string, string> = {
  // Status icons
  'clock-outline': 'time-outline',
  'check-circle-outline': 'checkmark-circle-outline',
  'check-circle': 'checkmark-circle',
  'package-variant': 'cube-outline',
  'truck-delivery': 'car-outline',
  'check-all': 'checkmark-done-outline',
  'help-circle-outline': 'help-circle-outline',
  
  // Special handling icons
  'alert-octagram': 'warning-outline',
  'thermometer': 'thermometer-outline',
  'radioactive': 'nuclear-outline',
  'water': 'water-outline',
  'clock-fast': 'timer-outline',
  
  // Requirements icons
  'cash': 'cash-outline',
  'draw': 'create-outline',
  'card-account-details': 'card-outline',
  
  // Navigation icons
  'close': 'close',
  'package': 'cube-outline',
  'package-variant-closed': 'cube',
  'truck-fast': 'car-sport-outline',
  'arrow-left': 'arrow-back',
  'chevron-right': 'chevron-forward',
  
  // Customer & Order icons
  'account-outline': 'person-outline',
  'account': 'person',
  'format-list-bulleted': 'list-outline',
  'note-text': 'document-text-outline',
  'cash-multiple': 'wallet-outline',
  'credit-card': 'card-outline',
  
  // Contact icons
  'phone': 'call-outline',
  'navigation-variant': 'navigate-outline',
  'map-marker': 'location-outline',
  'map-marker-path': 'location-outline',
  
  // Action icons
  'check': 'checkmark',
  'close-circle': 'close-circle',
  'arrow-up-bold-box': 'arrow-up-outline',
  'information-outline': 'information-circle-outline',
  'information': 'information-circle-outline',
  'warehouse': 'business-outline',
};

export const getIoniconsName = (materialIcon: string): string => {
  return iconMap[materialIcon] || 'help-circle-outline';
};