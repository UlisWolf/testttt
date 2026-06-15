export type RouteType = 'nuit' | 'securite' | 'chill' | 'panoramique';

export type Difficulty = 'Facile' | 'Moyen' | 'Expert';

export interface PointOfInterest {
  name: string;
  lat: number;
  lng: number;
  icon: string;
  description?: string;
}

export interface ScootRoute {
  id: string;
  name: string;
  description: string;
  type: RouteType;
  distance: number; // km
  duration: number; // minutes
  difficulty: Difficulty;
  waypoints: [number, number][]; // [lat, lng]
  score: number; // 0-100 score for the specific characteristic
  scoreLabel: string; // label for the score (luminosité, fréquentation, etc.)
  pois: PointOfInterest[];
  tags: string[];
  color: string; // hex color for the route line
  elevationGain?: number; // meters
}

export interface RouteTypeConfig {
  id: RouteType;
  name: string;
  emoji: string;
  description: string;
  scoreLabel: string;
  gradient: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeColor: string;
}
