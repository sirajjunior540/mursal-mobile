/**
 * Login Diagnostics Utility
 * Helps debug login issues in the mobile app
 */

import { ENV, apiDebug } from '../config/environment';
import { SecureStorage, Storage } from '../utils';
import { STORAGE_KEYS } from '../constants';

export interface LoginDiagnosticReport {
  timestamp: string;
  environment: {
    nodeEnv: string;
    apiBaseUrl: string;
    serverIP: string;
    serverPort: number;
    protocol: string;
    tenantId: string;
    apiTimeout: number;
  };
  connectivity: {
    canReachServer: boolean;
    serverResponse?: string;
    error?: string;
  };
  storage: {
    hasAuthToken: boolean;
    hasRefreshToken: boolean;
    hasUserData: boolean;
    hasDriverData: boolean;
  };
  apiTest: {
    loginEndpointTest: {
      url: string;
      reachable: boolean;
      response?: any;
      error?: string;
    };
  };
}

export class LoginDiagnostics {
  /**
   * Run comprehensive diagnostics for login issues
   */
  static async runDiagnostics(): Promise<LoginDiagnosticReport> {
    const report: LoginDiagnosticReport = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: ENV.NODE_ENV,
        apiBaseUrl: ENV.API_BASE_URL,
        serverIP: ENV.SERVER_IP,
        serverPort: ENV.SERVER_PORT,
        protocol: ENV.SERVER_PROTOCOL,
        tenantId: ENV.TENANT_ID,
        apiTimeout: ENV.API_TIMEOUT,
      },
      connectivity: {
        canReachServer: false,
      },
      storage: {
        hasAuthToken: false,
        hasRefreshToken: false,
        hasUserData: false,
        hasDriverData: false,
      },
      apiTest: {
        loginEndpointTest: {
          url: `${ENV.API_BASE_URL}/api/v1/auth/token/`,
          reachable: false,
        },
      },
    };

    // 1. Test connectivity to server
    try {
      apiDebug('🔍 Testing connectivity to server...');
      
      // Try a simple GET request first
      const connectivityResponse = await fetch(`${ENV.API_BASE_URL}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }).catch(async (error) => {
        // If HTTPS fails and we're using HTTP in dev, note it
        if (ENV.SERVER_PROTOCOL === 'http' && error.message.includes('cleartext')) {
          apiDebug('⚠️ HTTP cleartext traffic may be blocked on Android 9+');
        }
        throw error;
      });
      
      report.connectivity.canReachServer = true;
      report.connectivity.serverResponse = `Status: ${connectivityResponse.status} ${connectivityResponse.statusText}`;
      
      // Check if it's a Django server by looking at headers
      const serverHeader = connectivityResponse.headers.get('server');
      const poweredBy = connectivityResponse.headers.get('x-powered-by');
      if (serverHeader || poweredBy) {
        report.connectivity.serverResponse += ` (${serverHeader || poweredBy})`;
      }
    } catch (error) {
      report.connectivity.canReachServer = false;
      report.connectivity.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          report.connectivity.error += ' - Check if server is running and IP is correct';
        } else if (error.message.includes('cleartext')) {
          report.connectivity.error += ' - HTTP blocked on Android 9+. Add network security config.';
        } else if (error.message.includes('timeout')) {
          report.connectivity.error += ' - Server not responding. Check firewall/network.';
        }
      }
      
      apiDebug('❌ Connectivity test failed:', error);
    }

    // 2. Check storage status
    try {
      apiDebug('🔍 Checking storage status...');
      const [authToken, refreshToken, userData, driverData] = await Promise.all([
        SecureStorage.getAuthToken(),
        SecureStorage.getRefreshToken(),
        Storage.getItem(STORAGE_KEYS.USER_DATA),
        Storage.getItem(STORAGE_KEYS.DRIVER_DATA),
      ]);

      report.storage.hasAuthToken = !!authToken;
      report.storage.hasRefreshToken = !!refreshToken;
      report.storage.hasUserData = !!userData;
      report.storage.hasDriverData = !!driverData;
    } catch (error) {
      apiDebug('❌ Storage check failed:', error);
    }

    // 3. Test login endpoint directly
    try {
      apiDebug('🔍 Testing login endpoint...');
      const testResponse = await fetch(report.apiTest.loginEndpointTest.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: 'test_connection',
          password: 'test_connection',
          tenantId: ENV.TENANT_ID,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      report.apiTest.loginEndpointTest.reachable = true;
      
      const responseText = await testResponse.text();
      try {
        report.apiTest.loginEndpointTest.response = JSON.parse(responseText);
      } catch {
        report.apiTest.loginEndpointTest.response = responseText;
      }
    } catch (error) {
      report.apiTest.loginEndpointTest.reachable = false;
      report.apiTest.loginEndpointTest.error = error instanceof Error ? error.message : 'Unknown error';
      apiDebug('❌ Login endpoint test failed:', error);
    }

    return report;
  }

  /**
   * Log diagnostic report in a readable format
   */
  static logReport(report: LoginDiagnosticReport): void {
    console.log('\n========== LOGIN DIAGNOSTICS REPORT ==========');
    console.log(`Timestamp: ${report.timestamp}`);
    
    console.log('\n📱 ENVIRONMENT:');
    console.log(`  • Node Env: ${report.environment.nodeEnv}`);
    console.log(`  • API Base URL: ${report.environment.apiBaseUrl}`);
    console.log(`  • Server: ${report.environment.protocol}://${report.environment.serverIP}:${report.environment.serverPort}`);
    console.log(`  • Tenant ID: ${report.environment.tenantId}`);
    console.log(`  • API Timeout: ${report.environment.apiTimeout}ms`);
    
    console.log('\n🌐 CONNECTIVITY:');
    console.log(`  • Can reach server: ${report.connectivity.canReachServer ? '✅ YES' : '❌ NO'}`);
    if (report.connectivity.serverResponse) {
      console.log(`  • Server response: ${report.connectivity.serverResponse}`);
    }
    if (report.connectivity.error) {
      console.log(`  • Error: ${report.connectivity.error}`);
    }
    
    console.log('\n💾 STORAGE:');
    console.log(`  • Auth Token: ${report.storage.hasAuthToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`  • Refresh Token: ${report.storage.hasRefreshToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`  • User Data: ${report.storage.hasUserData ? '✅ Present' : '❌ Missing'}`);
    console.log(`  • Driver Data: ${report.storage.hasDriverData ? '✅ Present' : '❌ Missing'}`);
    
    console.log('\n🔌 API TEST:');
    console.log(`  • Login endpoint: ${report.apiTest.loginEndpointTest.url}`);
    console.log(`  • Reachable: ${report.apiTest.loginEndpointTest.reachable ? '✅ YES' : '❌ NO'}`);
    if (report.apiTest.loginEndpointTest.response) {
      console.log(`  • Response:`, report.apiTest.loginEndpointTest.response);
    }
    if (report.apiTest.loginEndpointTest.error) {
      console.log(`  • Error: ${report.apiTest.loginEndpointTest.error}`);
    }
    
    console.log('\n==============================================\n');
  }

  /**
   * Test login with specific credentials
   */
  static async testLogin(username: string, password: string): Promise<void> {
    console.log(`\n🔐 Testing login for user: ${username}`);
    
    try {
      const url = `${ENV.API_BASE_URL}/api/v1/auth/token/`;
      console.log(`📍 Login URL: ${url}`);
      
      // Try different variations of the request body
      const requestBody = {
        username,
        password,
        // Note: The backend might expect 'tenantId' or 'tenant_id'
        tenant_id: ENV.TENANT_ID,
      };
      
      console.log('📤 Request body:', { ...requestBody, password: '***' });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tenant-ID': ENV.TENANT_ID,
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log(`📥 Response status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
        console.log('📥 Response data:', responseData);
      } catch {
        console.log('📥 Response text:', responseText);
      }
      
      if (response.ok && responseData?.access) {
        console.log('✅ Login successful! Token received.');
      } else {
        console.log('❌ Login failed.');
      }
    } catch (error) {
      console.error('💥 Login test error:', error);
    }
  }
}

// Export a convenient function to run diagnostics
export const runLoginDiagnostics = async (): Promise<void> => {
  const report = await LoginDiagnostics.runDiagnostics();
  LoginDiagnostics.logReport(report);
};