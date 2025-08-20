declare global {
  var global: typeof globalThis;
  
  namespace NodeJS {
    interface Timeout {}
  }
  
  interface MessageEvent {
    data: any;
  }
  
  interface CloseEvent {
    code: number;
    reason: string;
  }
  
  var atob: (str: string) => string;
  var btoa: (str: string) => string;
  
  type HeadersInit = Record<string, string> | [string, string][] | Headers;
  
  // FCM and notification related globals
  var fcmToken: string | undefined;
  var pendingNotification: {
    type: string;
    order?: any;
    orderId?: string;
    receivedAt: string;
  } | undefined;
}

export {};