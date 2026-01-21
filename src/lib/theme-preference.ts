import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, ColorSchemeName } from "react-native";

export const THEME_STORAGE_KEY = "theme_preference";
export type ThemePref = "system" | "light" | "dark";

let currentPref: ThemePref = "system";
let loaded = false;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeThemePreference(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThemePreference(): ThemePref {
  return currentPref;
}

export async function loadThemePreferenceOnce() {
  if (loaded) return;
  loaded = true;

  try {
    const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      currentPref = saved;
      notify();
    }
  } catch {
    // nada
  }
}

export async function setThemePreference(pref: ThemePref) {
  currentPref = pref;
  notify();
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // nada
  }
}

export function resolveColorScheme(pref: ThemePref): NonNullable<ColorSchemeName> {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return Appearance.getColorScheme() ?? "light";
}
