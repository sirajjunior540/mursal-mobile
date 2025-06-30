/**
 * API-related TypeScript types and interfaces
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  pagination?: PaginationInfo;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  defaultHeaders: Record<string, string>;
  retryConfig: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: ApiError) => boolean;
}

// HTTP Status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// Request interceptor types
export interface RequestInterceptor {
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onError?: (error: any) => Promise<never>;
}

// Response interceptor types
export interface ResponseInterceptor {
  onResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
  onError?: (error: ApiError) => Promise<never>;
}

// Specific API endpoint types
export interface OrderEndpoints {
  getOrders: (params?: Record<string, any>) => Promise<ApiResponse<any[]>>;
  getOrder: (id: string) => Promise<ApiResponse<any>>;
  updateOrderStatus: (id: string, status: string) => Promise<ApiResponse<any>>;
  acceptOrder: (id: string) => Promise<ApiResponse<any>>;
  declineOrder: (id: string, reason?: string) => Promise<ApiResponse<any>>;
}

export interface AuthEndpoints {
  login: (credentials: any) => Promise<ApiResponse<any>>;
  logout: () => Promise<ApiResponse<any>>;
  refreshToken: () => Promise<ApiResponse<any>>;
  getProfile: () => Promise<ApiResponse<any>>;
  updateProfile: (data: any) => Promise<ApiResponse<any>>;
}

export interface LocationEndpoints {
  updateLocation: (data: any) => Promise<ApiResponse<any>>;
  getDriverLocation: (driverId: string) => Promise<ApiResponse<any>>;
}

// WebSocket types
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  heartbeatInterval?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  id?: string;
}

export interface WebSocketEventHandlers {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: () => void;
  onReconnectFailed?: () => void;
}

// Network status types
export interface NetworkStatus {
  isConnected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  isInternetReachable: boolean;
  strength?: number;
}

// Upload types
export interface FileUpload {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadConfig {
  onProgress?: (progress: UploadProgress) => void;
  timeout?: number;
  headers?: Record<string, string>;
}

// Cache types
export interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
  key: string;
}

export interface CachedResponse<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}