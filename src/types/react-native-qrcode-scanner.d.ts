declare module 'react-native-qrcode-scanner' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';
  
  interface QRCodeScannerProps {
    onRead: (e: { data: string }) => void;
    showMarker?: boolean;
    reactivate?: boolean;
    reactivateTimeout?: number;
    cameraStyle?: ViewStyle;
    topViewStyle?: ViewStyle;
    bottomViewStyle?: ViewStyle;
  }
  
  export default class QRCodeScanner extends Component<QRCodeScannerProps> {}
}