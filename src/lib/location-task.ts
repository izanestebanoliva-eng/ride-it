import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const LOCATION_TASK_NAME = "location-background-task";

// Guardamos los puntos de la ruta actual aquí (solo mientras grabas)
export const STORAGE_KEY = "current_route_points_v1";

export type RoutePoint = {
  lat: number;
  lon: number;
  t: number; // timestamp ms
  accuracy: number | null;
  speed: number | null; // m/s
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
  if (!locations || locations.length === 0) return;

  const loc = locations[locations.length - 1];
  const coords = loc.coords;

  // Filtro básico: si viene sin accuracy, o accuracy malísima, lo ignoramos
  const accuracy = coords.accuracy ?? null;
  if (accuracy !== null && accuracy > 50) return; // 50m es demasiado impreciso

  const point: RoutePoint = {
    lat: coords.latitude,
    lon: coords.longitude,
    t: typeof loc.timestamp === "number" ? loc.timestamp : Date.now(),
    accuracy,
    speed: coords.speed ?? null,
  };

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: RoutePoint[] = raw ? JSON.parse(raw) : [];

    // Evitar duplicados por timestamp (a veces iOS manda “repetidos”)
    const last = arr[arr.length - 1];
    if (last && Math.abs(last.t - point.t) < 300) return;

    arr.push(point);

    // Capar tamaño por seguridad (por si alguien graba horas)
    if (arr.length > 20000) arr.splice(0, arr.length - 20000);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // No rompemos tracking si falla el storage
  }
});

export async function clearCurrentRoutePoints() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function getCurrentRoutePoints(): Promise<RoutePoint[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function startBackgroundTracking() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error("NO_FOREGROUND_LOCATION");

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") throw new Error("NO_BACKGROUND_LOCATION");

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Highest,
    timeInterval: 1000, // 1s
    distanceInterval: 3, // 3m
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true, // iOS

    // Android foreground service para que no lo mate
    foregroundService: {
      notificationTitle: "Grabando ruta",
      notificationBody: "Tu ruta se está grabando en segundo plano",
    },
  });
}

export async function stopBackgroundTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
