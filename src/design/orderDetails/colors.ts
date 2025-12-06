export const orderDetailsColors = {
  specialHandling: {
    fragile: { bg: '#FFEBEE', text: '#FF6B6B', icon: 'alert-octagram' },
    temperature: { bg: '#E0F7FA', text: '#4ECDC4', icon: 'thermometer' },
    hazardous: { bg: '#FFE5E5', text: '#FF4757', icon: 'radioactive' },
    liquid: { bg: '#E3F2FD', text: '#FF6B00', icon: 'water' },
    perishable: { bg: '#FFF3E0', text: '#FF9F43', icon: 'clock-fast' },
  },
  requirements: {
    cod: { bg: '#E0F7FA', text: '#00D2D3', icon: 'cash' },
    signature: { bg: '#F3E5F5', text: '#8B78E6', icon: 'draw' },
    idCheck: { bg: '#EDE7F6', text: '#5F3DC4', icon: 'card-account-details' },
  },
  gradients: {
    distribution: ['#FF6B6B', '#FF8E53'],
    consolidated: ['#4ECDC4', '#44A08D'],
    primary: ['#6366F1', '#8B5CF6'],
    success: ['#10B981', '#34D399'],
    warning: ['#F59E0B', '#FBBF24'],
    danger: ['#EF4444', '#F87171'],
  },
  status: {
    pending: { bg: '#FFF3E0', text: '#FF6F00', gradient: ['#FF6F00', '#FF8F00'] },
    assigned: { bg: '#FFF3E0', text: '#FF6F00', gradient: ['#FF6F00', '#FF8F00'] },
    accepted: { bg: '#E8F5E9', text: '#2E7D32', gradient: ['#2E7D32', '#388E3C'] },
    confirmed: { bg: '#E8F5E9', text: '#2E7D32', gradient: ['#2E7D32', '#388E3C'] },
    picked_up: { bg: '#E3F2FD', text: '#1565C0', gradient: ['#1565C0', '#1976D2'] },
    in_transit: { bg: '#F3E5F5', text: '#6A1B9A', gradient: ['#6A1B9A', '#7B1FA2'] },
    delivered: { bg: '#E8F5E9', text: '#1B5E20', gradient: ['#1B5E20', '#2E7D32'] },
  },
};