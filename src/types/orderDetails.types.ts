import { Order, SpecialHandling } from './order';

export interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onAccept?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
  onNavigate?: (order: Order) => void;
  onCall?: (phoneNumber: string) => void;
  onAcceptRoute?: (orderIds: string[]) => void;
  showStatusButton?: boolean;
  readonly?: boolean;
  title?: string;
}

export interface BatchProperties {
  orders: Order[];
  totalValue: number;
  isBatch: boolean;
}

export interface OrderHeaderProps {
  order: Order;
  onClose: () => void;
  title?: string;
  isBatchView?: boolean;
  batchType?: 'distribution' | 'consolidated' | null;
  orderCount?: number;
}

export interface OrderInfoSectionProps {
  order: Order;
  readonly?: boolean;
  onCall?: (phoneNumber: string) => void;
  onNavigate?: (order: Order) => void;
}

export interface SpecialHandlingBadgesProps {
  order: Order;
  compact?: boolean;
}

export interface BatchOrdersListProps {
  orders: Order[];
  totalValue: number;
  onSelectOrder: (order: Order) => void;
  batchType: 'distribution' | 'consolidated';
}

export interface OrderActionsProps {
  order: Order;
  showStatusButton?: boolean;
  readonly?: boolean;
  isBatchOrder: boolean;
  isConsolidatedBatch: boolean;
  batchProperties?: BatchProperties;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onAccept?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
  onAcceptRoute?: (orderIds: string[]) => void;
  onClose: () => void;
}

export interface MapSectionProps {
  order: Order;
}

export interface InfoRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string;
  onPress?: () => void;
  highlight?: boolean;
}

export interface StatusBadgeProps {
  status: string;
}

export interface BatchTypeBadgeProps {
  type: 'distribution' | 'consolidated';
}