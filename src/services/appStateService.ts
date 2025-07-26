import { AppState, AppStateStatus } from 'react-native';
import { realtimeService } from './realtimeService';

class AppStateService {
  private appStateSubscription: any = null;
  private isInBackground: boolean = false;
  private previousAppState: AppStateStatus = AppState.currentState;

  /**
   * Initialize app state monitoring
   */
  initialize(): void {
    console.log('[AppStateService] Initializing app state monitoring');
    
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    // Set initial state
    this.isInBackground = AppState.currentState === 'background';
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    console.log(`[AppStateService] App state changed: ${this.previousAppState} -> ${nextAppState}`);

    // Detect transition from background to foreground
    if (this.previousAppState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('[AppStateService] App came to foreground');
      this.handleAppForeground();
    }
    
    // Detect transition to background
    if (nextAppState === 'background') {
      console.log('[AppStateService] App went to background');
      this.handleAppBackground();
    }

    this.previousAppState = nextAppState;
    this.isInBackground = nextAppState === 'background';
  }

  /**
   * Handle app coming to foreground
   */
  private handleAppForeground(): void {
    // Reconnect WebSocket if needed
    if (!realtimeService.isConnectedToServer()) {
      console.log('[AppStateService] Reconnecting WebSocket after coming to foreground');
      realtimeService.initialize().catch(error => {
        console.error('[AppStateService] Failed to reconnect WebSocket:', error);
      });
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    // Keep WebSocket connected in background for push notifications
    // The OS will eventually suspend the connection if needed
    console.log('[AppStateService] App in background, keeping WebSocket for now');
  }

  /**
   * Get current background state
   */
  getIsInBackground(): boolean {
    return this.isInBackground;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export const appStateService = new AppStateService();