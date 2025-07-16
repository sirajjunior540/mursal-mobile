/**
 * WebSocket Client for Mursal Realtime SDK
 * Handles WebSocket connections, authentication, and message processing
 */

import { WebSocketMessage } from './types';

export interface WebSocketClientConfig {
  baseUrl: string;
  endpoint: string;
  authToken?: string;
  tenantId?: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface WebSocketClientCallbacks {
  onMessage?: (message: WebSocketMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

export class WebSocketClient {
  private config: WebSocketClientConfig;
  private callbacks: WebSocketClientCallbacks = {};
  private websocket: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Constructor
   * @param config WebSocket client configuration
   */
  constructor(config: WebSocketClientConfig) {
    this.config = config;
  }

  /**
   * Set callbacks
   * @param callbacks WebSocket client callbacks
   */
  setCallbacks(callbacks: WebSocketClientCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start WebSocket client
   */
  start(): void {
    this.connect();
  }

  /**
   * Stop WebSocket client
   */
  stop(): void {
    this.clearReconnectTimer();

    if (this.websocket) {
      // Use 1000 (Normal Closure) as the close code
      this.websocket.close(1000, 'Client stopped');
      this.websocket = null;
    }

    if (this.connected) {
      this.connected = false;
      this.callbacks.onConnectionChange?.(false);
    }
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    // Clear any existing connection
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log(`[WebSocketClient] Connecting to ${wsUrl}`);
      console.log('[WebSocketClient] Config:', {
        baseUrl: this.config.baseUrl,
        endpoint: this.config.endpoint,
        hasToken: !!this.config.authToken,
        tenantId: this.config.tenantId
      });

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = this.handleOpen.bind(this);
      this.websocket.onmessage = this.handleMessage.bind(this);
      this.websocket.onclose = this.handleClose.bind(this);
      this.websocket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WebSocketClient] Connection error:', error);
      this.callbacks.onError?.(`WebSocket connection error: ${error}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('[WebSocketClient] Connected');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.callbacks.onConnectionChange?.(true);

    // Send authentication if token is available
    this.authenticate();
  }

  /**
   * Handle WebSocket message event
   * @param event WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      console.log('[WebSocketClient] Raw message received:', event.data);
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Log authentication responses
      if (message.type === 'auth_success' || message.type === 'auth_error' || message.type === 'authenticated') {
        console.log('[WebSocketClient] Authentication response:', message);
      }
      
      this.callbacks.onMessage?.(message);
    } catch (error) {
      console.error('[WebSocketClient] Error parsing message:', error);
      console.error('[WebSocketClient] Raw data:', event.data);
      this.callbacks.onError?.(`Error parsing WebSocket message: ${error}`);
    }
  }

  /**
   * Handle WebSocket close event
   * @param event WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log(`[WebSocketClient] Disconnected: ${event.code} ${event.reason}`);

    const wasConnected = this.connected;
    this.connected = false;
    this.websocket = null;

    if (wasConnected) {
      this.callbacks.onConnectionChange?.(false);
    }

    // Don't reconnect if closed normally (code 1000)
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   * @param event WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('[WebSocketClient] WebSocket error:', event);
    
    // Extract error details if available
    const errorDetails = (event as any).message || (event as any).reason || 'Unknown error';
    const errorMessage = `WebSocket error: ${errorDetails}`;
    
    console.error('[WebSocketClient] Error details:', errorDetails);
    this.callbacks.onError?.(errorMessage);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    // Clear any existing reconnect timer
    this.clearReconnectTimer();

    // Check if max reconnect attempts reached
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('[WebSocketClient] Max reconnect attempts reached');
      this.callbacks.onError?.('Max reconnect attempts reached');
      return;
    }

    // Increment reconnect attempts
    this.reconnectAttempts++;

    // Calculate backoff time (with jitter to prevent thundering herd)
    const jitter = Math.random() * 0.5 + 0.75; // 0.75-1.25 multiplier
    const backoff = this.config.reconnectInterval * jitter;

    console.log(`[WebSocketClient] Reconnecting in ${Math.round(backoff)}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    // Schedule reconnect
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, backoff);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    // Convert HTTP URL to WebSocket URL
    let wsUrl = this.config.baseUrl;

    // Replace http:// with ws:// and https:// with wss://
    wsUrl = wsUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');

    // Ensure URL ends with a slash before appending endpoint
    if (!wsUrl.endsWith('/')) {
      wsUrl += '/';
    }

    // Remove leading slash from endpoint if present
    const endpoint = this.config.endpoint.startsWith('/') 
      ? this.config.endpoint.substring(1) 
      : this.config.endpoint;

    const fullUrl = `${wsUrl}${endpoint}`;
    console.log('[WebSocketClient] WebSocket URL:', fullUrl);
    return fullUrl;
  }

  /**
   * Send authentication message
   */
  private authenticate(): void {
    if (!this.config.authToken || !this.connected || !this.websocket) {
      console.log('[WebSocketClient] Cannot authenticate:', {
        hasToken: !!this.config.authToken,
        connected: this.connected,
        hasWebSocket: !!this.websocket
      });
      return;
    }

    try {
      // Add "Bearer" prefix to token for proper authentication
      const token = this.config.authToken.startsWith('Bearer ') 
        ? this.config.authToken 
        : `Bearer ${this.config.authToken}`;

      const authMessage = {
        type: 'authenticate',
        token,
        // Add tenant information for multi-tenant WebSocket
        tenant: this.config.tenantId || 'sirajjunior'
      };

      this.sendMessage(authMessage);
      console.log('[WebSocketClient] Authentication message sent with tenant info');
    } catch (error) {
      console.error('[WebSocketClient] Error sending authentication:', error);
      this.callbacks.onError?.(`Error sending authentication: ${error}`);
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connected && this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Send message to WebSocket server
   * @param message Message to send
   */
  sendMessage(message: any): void {
    if (!this.connected || !this.websocket) {
      console.warn('[WebSocketClient] Cannot send message: not connected');
      return;
    }

    try {
      const messageString = JSON.stringify(message);
      this.websocket.send(messageString);
    } catch (error) {
      console.error('[WebSocketClient] Error sending message:', error);
      this.callbacks.onError?.(`Error sending message: ${error}`);
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Update authentication token
   * @param token New authentication token
   */
  updateAuthToken(token: string): void {
    this.config.authToken = token;

    // If connected, re-authenticate with new token
    if (this.connected && this.websocket) {
      this.authenticate();
    }
  }
}
