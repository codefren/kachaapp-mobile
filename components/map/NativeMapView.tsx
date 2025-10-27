// Este archivo actúa como un proxy que importa el componente correcto según la plataforma
// Metro bundler automáticamente elegirá .native.tsx para iOS/Android y .web.tsx para web

import { Platform } from 'react-native';

// Importación condicional para evitar problemas con Metro bundler
let NativeMapViewComponent;

if (Platform.OS === 'web') {
  NativeMapViewComponent = require('./NativeMapView.web').default;
} else {
  NativeMapViewComponent = require('./NativeMapView.native').default;
}

export default NativeMapViewComponent;
