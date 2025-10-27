export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface LocationPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface LocationService {
  getCurrentLocation: () => Promise<Coordinates>;
  watchLocation: (callback: (coords: Coordinates) => void) => () => void;
  requestPermissions: () => Promise<LocationPermission>;
}

// Tipos específicos para la API de KCH Digital
export interface LoginWithLocationCredentials {
  username: string;
  password: string;
  latitude: number;
  longitude: number;
}

export interface KCHAuthResponse {
  access: string;
  refresh: string;
  market_name: string;
  login_time: string; // Formato "dd/mm/yyyy HH:MM"
}

export interface KCHRefreshPayload {
  refresh: string;
  latitude: number;
  longitude: number;
}

export interface KCHErrorResponse {
  non_field_errors: string[];
}

export interface AuthResponseWithLocation {
  success: boolean;
  access?: string;
  refresh?: string;
  market_name?: string;
  login_time?: string;
  user?: {
    id: string;
    username: string;
    name?: string;
    market_name?: string;
    login_time?: string;
  };
  message?: string;
  error?: string;
}
