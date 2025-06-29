import { ENV, apiDebug } from '../config/environment';

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export class ConnectionTester {
  /**
   * Test basic API connectivity
   */
  static async testAPIConnection(): Promise<ConnectionTestResult> {
    try {
      apiDebug('Testing API connection...');
      
      const url = `${ENV.API_BASE_URL}/api/v1/auth/`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Host': ENV.API_HOST,
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: 'API connection successful',
          details: {
            status: response.status,
            url,
            host: ENV.API_HOST,
          },
        };
      } else {
        return {
          success: false,
          message: `API connection failed with status ${response.status}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            url,
            host: ENV.API_HOST,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API connection error: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          error: error instanceof Error ? error.message : String(error),
          url: `${ENV.API_BASE_URL}/api/v1/auth/`,
          host: ENV.API_HOST,
        },
      };
    }
  }

  /**
   * Test Django tenant setup
   */
  static async testTenantSetup(): Promise<ConnectionTestResult> {
    try {
      apiDebug('Testing tenant setup...');
      
      // Test multiple tenant-related endpoints
      const tests = [
        { name: 'Auth endpoint', path: '/api/v1/auth/' },
        { name: 'Health check', path: '/health/' },
        { name: 'API root', path: '/api/' },
      ];

      const results = [];

      for (const test of tests) {
        const url = `${ENV.API_BASE_URL}${test.path}`;
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Host': ENV.API_HOST,
            },
          });

          results.push({
            name: test.name,
            url,
            status: response.status,
            success: response.ok || response.status === 404, // 404 is ok for some endpoints
          });
        } catch (error) {
          results.push({
            name: test.name,
            url,
            error: error instanceof Error ? error.message : String(error),
            success: false,
          });
        }
      }

      const allSuccessful = results.every(r => r.success);

      return {
        success: allSuccessful,
        message: allSuccessful 
          ? 'All tenant tests passed' 
          : 'Some tenant tests failed',
        details: {
          tests: results,
          host: ENV.API_HOST,
          baseUrl: ENV.API_BASE_URL,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Tenant test error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error },
      };
    }
  }

  /**
   * Test login endpoint specifically
   */
  static async testLoginEndpoint(username: string = 'test', password: string = 'test'): Promise<ConnectionTestResult> {
    try {
      apiDebug('Testing login endpoint...');
      
      const url = `${ENV.API_BASE_URL}/api/v1/auth/login/`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': ENV.API_HOST,
        },
        body: JSON.stringify({
          username,
          password,
          tenantId: ENV.DEFAULT_TENANT_ID,
        }),
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      return {
        success: true, // We consider any response a success (even errors show the endpoint works)
        message: `Login endpoint responded with status ${response.status}`,
        details: {
          status: response.status,
          response: responseData,
          url,
          host: ENV.API_HOST,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Login endpoint error: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          error: error instanceof Error ? error.message : String(error),
          url: `${ENV.API_BASE_URL}/api/v1/auth/login/`,
          host: ENV.API_HOST,
        },
      };
    }
  }

  /**
   * Test polling endpoint specifically
   */
  static async testPollingEndpoint(): Promise<ConnectionTestResult> {
    try {
      apiDebug('Testing polling endpoint...');
      
      const { apiService } = await import('../services/api');
      const result = await apiService.testPollingEndpoint();
      
      return {
        success: result.success,
        message: result.success 
          ? `Polling endpoint works - got ${result.data?.length || 0} orders` 
          : `Polling endpoint failed: ${result.error}`,
        details: {
          endpoint: '/api/v1/delivery/deliveries/available_orders/',
          orderCount: result.data?.length || 0,
          error: result.error
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Polling endpoint error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error },
      };
    }
  }

  /**
   * Run all connection tests
   */
  static async runAllTests(): Promise<{ [key: string]: ConnectionTestResult }> {
    apiDebug('Running all connection tests...');
    
    const results = {
      api: await this.testAPIConnection(),
      tenant: await this.testTenantSetup(),
      login: await this.testLoginEndpoint(),
      polling: await this.testPollingEndpoint(),
    };

    apiDebug('Connection test results:', results);
    return results;
  }

  /**
   * Get current environment info
   */
  static getEnvironmentInfo() {
    return {
      API_BASE_URL: ENV.API_BASE_URL,
      API_HOST: ENV.API_HOST,
      WS_BASE_URL: ENV.WS_BASE_URL,
      DEFAULT_TENANT_ID: ENV.DEFAULT_TENANT_ID,
      NODE_ENV: ENV.NODE_ENV,
      DEBUG_ENABLED: ENV.DEBUG_API_CALLS,
    };
  }
}