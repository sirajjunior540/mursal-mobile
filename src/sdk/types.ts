/**
 * Mursal Realtime SDK Types
 * This file contains type definitions for the Mursal Realtime SDK
 */

import { Order } from '../types';

/**
 * Communication modes supported by the SDK
 */
export type CommunicationMode = 'polling' | 'websocket' | 'push' | 'all';

/**
 * SDK Configuration
 */
export interface RealtimeSDKConfig {
  // Base configuration
  baseUrl: string;
  authToken?: string;
  tenantId?: string; // Tenant identifier for multi-tenant support
  
  // Communication modes
  enabledModes: CommunicationMode[];
  primaryMode: CommunicationMode;
  
  // Polling configuration
  pollingInterval: number; // in milliseconds
  pollingEndpoint: string;
  
  // WebSocket configuration
  websocketEndpoint: string;
  websocketReconnectInterval: number; // in milliseconds
  websocketMaxReconnectAttempts: number;
  
  // Push notification configuration
  pushEnabled: boolean;
  fcmToken?: string;
  apnsToken?: string;
  
  // Logging and observability
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
  enableMetrics: boolean;
  
  // Advanced options
  deduplicationEnabled: boolean;
  deduplicationWindow: number; // in milliseconds
}

/**
 * SDK Event Callbacks
 */
export interface RealtimeSDKCallbacks {
  onNewOrder?: (order: Order, source: CommunicationMode) => void;
  onOrderUpdate?: (order: Order, source: CommunicationMode) => void;
  onNewBatchLeg?: (batchLeg: any, source: CommunicationMode) => void;
  onBatchLegUpdate?: (batchLeg: any, source: CommunicationMode) => void;
  onConnectionChange?: (connected: boolean, mode: CommunicationMode) => void;
  onError?: (error: string, mode: CommunicationMode) => void;
  onMetrics?: (metrics: RealtimeMetrics) => void;
}

/**
 * SDK Connection Status
 */
export interface ConnectionStatus {
  polling: boolean;
  websocket: boolean;
  push: boolean;
  overall: boolean;
}

/**
 * SDK Metrics for observability
 */
export interface RealtimeMetrics {
  // Connection metrics
  connectionAttempts: Record<CommunicationMode, number>;
  connectionSuccesses: Record<CommunicationMode, number>;
  connectionFailures: Record<CommunicationMode, number>;
  
  // Message metrics
  messagesReceived: Record<CommunicationMode, number>;
  messagesSent: Record<CommunicationMode, number>;
  
  // Order metrics
  ordersReceived: number;
  uniqueOrdersReceived: number;
  duplicateOrdersFiltered: number;
  
  // Latency metrics
  averageLatency: Record<CommunicationMode, number>;
  
  // Timestamp of last update
  lastUpdated: Date;
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Authentication message
 */
export interface AuthMessage extends WebSocketMessage {
  type: 'authenticate';
  token: string;
}

/**
 * New order message
 */
export interface NewOrderMessage extends WebSocketMessage {
  type: 'new_order';
  order: Order;
}

/**
 * Order update message
 */
export interface OrderUpdateMessage extends WebSocketMessage {
  type: 'order_update';
  order: Order;
}

/**
 * Error message
 */
export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

/**
 * Authentication success message
 */
export interface AuthSuccessMessage extends WebSocketMessage {
  type: 'auth_success';
}

/**
 * Authentication error message
 */
export interface AuthErrorMessage extends WebSocketMessage {
  type: 'auth_error';
  message: string;
}