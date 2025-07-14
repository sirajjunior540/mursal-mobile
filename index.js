/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Import debugging utilities in development
if (__DEV__) {
  // Android login debugging
  import('./src/utils/fixAndroidLogin');
  import('./src/utils/testLogin');
  import('./src/utils/quickFix');
  import('./src/utils/testTenantHeader');
}

AppRegistry.registerComponent(appName, () => App);
