/**
 * Order synchronization hook with WebSocket and polling fallback
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { logger } from '../../../infrastructure/logging/logger';
import { Order, OrderWebSocketMessage } from '../../../shared/types';

interface UseOrderSyncConfig {
  websocketUrl: string;
  pollInterval: number;
  maxReconnectAttempts: number;
  getAuthToken: () => Promise<string | null>;
  onOrderReceived: (order: Order) => void;
  onOrderUpdated: (order: Order) => void;
  onOrderRemoved: (orderId: string) => void;
  onConnectionChange: (connected: boolean) => void;
  enabled: boolean;
}

export const useOrderSync = (config: UseOrderSyncConfig) => {
  const {
    websocketUrl,
    pollInterval,
    maxReconnectAttempts,
    getAuthToken,
    onOrderReceived,
    onOrderUpdated,
    onOrderRemoved,
    onConnectionChange,
    enabled,
  } = config;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'none'>('none');
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      isActiveRef.current = nextAppState === 'active';
      
      if (nextAppState === 'active') {
        logger.debug('App became active, resuming order sync');
        startSync();
      } else {
        logger.debug('App became inactive, pausing order sync');
        cleanup();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Simplified network handling - will rely on WebSocket connection state
  // for network status instead of NetInfo package

  const cleanup = useCallback(() => {
    // Clear WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear timers
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }, []);

  const connectWebSocket = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        logger.warn('No auth token available for WebSocket connection');
        return false;
      }

      const wsUrl = `${websocketUrl}?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        logger.websocketConnected(websocketUrl);
        setIsConnected(true);
        setConnectionType('websocket');
        onConnectionChange(true);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: OrderWebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'new_order':
              logger.orderReceived(message.data.id, message.data.status);
              onOrderReceived(message.data);
              break;
            case 'order_updated':
              logger.orderStatusChanged(message.data.id, 'unknown', message.data.status);
              onOrderUpdated(message.data);
              break;
            case 'order_cancelled':
              onOrderRemoved(message.data.id);
              break;
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error as Error);
        }
      };

      wsRef.current.onclose = (event) => {
        logger.websocketDisconnected(websocketUrl, event.reason);
        setIsConnected(false);
        setConnectionType('none');
        onConnectionChange(false);
        
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else {
          // Fallback to polling
          startPolling();
        }
      };

      wsRef.current.onerror = (error) => {
        logger.websocketError(websocketUrl, error as any);
      };

      return true;
    } catch (error) {
      logger.error('Failed to connect WebSocket', error as Error);
      return false;
    }
  }, [websocketUrl, getAuthToken, onConnectionChange, onOrderReceived, onOrderUpdated, onOrderRemoved]);

  const scheduleReconnect = useCallback(() => {
    if (!isActiveRef.current || !enabled) return;

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;

    logger.debug(`Scheduling WebSocket reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimerRef.current = setTimeout(() => {
      if (isActiveRef.current && enabled) {
        connectWebSocket();
      }
    }, delay);
  }, [enabled, connectWebSocket]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current || connectionType === 'websocket') return;

    logger.debug('Starting polling fallback');
    setConnectionType('polling');
    
    // Implement polling logic here - fetch orders periodically
    pollTimerRef.current = setInterval(async () => {
      if (!isActiveRef.current || !enabled) return;

      try {
        // This would call your polling API
        logger.debug('Polling for order updates');
        // const orders = await pollOrderUpdates();
        // Handle received orders...
      } catch (error) {
        logger.error('Polling failed', error as Error);
      }
    }, pollInterval);
  }, [connectionType, pollInterval, enabled]);

  const startSync = useCallback(async () => {
    if (!enabled || !isActiveRef.current) return;

    cleanup();
    
    const wsConnected = await connectWebSocket();
    if (!wsConnected) {
      startPolling();
    }
  }, [enabled, connectWebSocket, startPolling, cleanup]);

  const stopSync = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setConnectionType('none');
    onConnectionChange(false);
  }, [cleanup, onConnectionChange]);

  // Start sync when enabled
  useEffect(() => {
    if (enabled && isActiveRef.current) {
      startSync();
    } else {
      stopSync();
    }

    return () => {
      cleanup();
    };
  }, [enabled, startSync, stopSync, cleanup]);

  return {
    isConnected,
    connectionType,
    startSync,
    stopSync,
    reconnect: connectWebSocket,
  };
};