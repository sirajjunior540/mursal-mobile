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
}

export {};