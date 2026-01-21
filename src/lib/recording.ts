import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    clearCurrentRoutePoints,
    getCurrentRoutePoints,
    RoutePoint,
    startBackgroundTracking,
    stopBackgroundTracking,
} from "./location-task";

const STATUS_KEY = "recording_status";

export type RecordingStatus = {
  isRecording: boolean;
  startedAt: number | null;
};

export async function startRecording() {
  await clearCurrentRoutePoints();
  await startBackgroundTracking();

  const status: RecordingStatus = {
    isRecording: true,
    startedAt: Date.now(),
  };
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));
  return status;
}

export async function stopRecording() {
  await stopBackgroundTracking();

  const points: RoutePoint[] = await getCurrentRoutePoints();

  const status: RecordingStatus = {
    isRecording: false,
    startedAt: null,
  };
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));

  return { status, points };
}

export async function getRecordingStatus(): Promise<RecordingStatus> {
  const raw = await AsyncStorage.getItem(STATUS_KEY);
  if (!raw) return { isRecording: false, startedAt: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { isRecording: false, startedAt: null };
  }
}
