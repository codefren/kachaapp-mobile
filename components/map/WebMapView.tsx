// Este archivo actúa como un proxy que importa el componente correcto según la plataforma
// Metro bundler automáticamente elegirá .native.tsx para iOS/Android y .web.tsx para web

export { default } from './WebMapView.web';
