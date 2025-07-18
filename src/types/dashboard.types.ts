import { Order } from '../types';
import { Driver } from '../contexts/DriverContext';

// Dashboard Header Props
export interface DashboardHeaderProps {
  driver: Driver | null;
  isOnline: boolean;
  onToggleOnline: () => void;
}

// Stats Card Props
export interface StatsData {
  activeDeliveries: number;
  totalOrders: number;
  rating: number;
  todayEarnings: number;
  averageDeliveryTime: number | null;
  trends?: {
    totalDeliveries?: {
      percentage: number;
      direction: 'up' | 'down' | 'neutral';
    };
    todayEarnings?: {
      percentage: number;
      direction: 'up' | 'down' | 'neutral';
    };
    averageDeliveryTime?: {
      percentage: number;
      direction: 'up' | 'down' | 'neutral';
    };
    rating?: {
      percentage: number;
      direction: 'up' | 'down' | 'neutral';
    };
  };
}

export interface StatsCardsProps {
  stats: StatsData;
}

export interface StatCardProps {
  icon: string;
  iconColor: string;
  value: string | number;
  label: string;
  backgroundColor: string;
}

// Performance Metrics Props
export interface PerformanceData {
  availableOrders: number;
  completedOrders: number;
  todayCompletedOrders: number;
  successRate: number;
}

export interface PerformanceMetricsProps {
  data: PerformanceData;
  isExpanded: boolean;
  onToggle: () => void;
}

// Status Card Props
export interface StatusCardProps {
  isOnline: boolean;
  onToggleOnline: () => void;
}

// Available Orders Card Props
export interface AvailableOrdersCardProps {
  orders: Order[];
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onOrderPress: (order: Order) => void;
  onViewAll: () => void;
  canAcceptOrder: (order: Order) => boolean;
  isOnline: boolean;
}

// Active Deliveries Card Props
export interface ActiveDeliveriesCardProps {
  orders: Order[];
  isExpanded: boolean;
  onToggle: () => void;
  onOrderPress: (order: Order) => void;
  onViewAll: () => void;
}

// Order Item Props
export interface OrderItemProps {
  order: Order;
  onPress: () => void;
  showChevron?: boolean;
  chevronColor?: string;
}

// Collapsible Card Props
export interface CollapsibleCardProps {
  title: string;
  icon: string;
  iconColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  summaryText?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}