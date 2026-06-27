/**
 * Geolocalização e geofence (PRD seção 9). Distância de Haversine entre dois
 * pontos (metros) e validação por raio em torno do ponto da empresa.
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // raio da Terra em metros
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeofenceCheck {
  distancia_metros: number | null;
  dentro: boolean;
}

export function checkGeofence(
  empresa: { geofence_lat: number | null; geofence_lng: number | null; geofence_raio_metros: number },
  gpsLat?: number | null,
  gpsLng?: number | null
): GeofenceCheck {
  if (empresa.geofence_lat == null || empresa.geofence_lng == null || gpsLat == null || gpsLng == null) {
    return { distancia_metros: null, dentro: false };
  }
  const dist = haversineMeters(empresa.geofence_lat, empresa.geofence_lng, gpsLat, gpsLng);
  return { distancia_metros: Math.round(dist), dentro: dist <= empresa.geofence_raio_metros };
}
