import { useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";

import {
  getThemePreference,
  loadThemePreferenceOnce,
  resolveColorScheme,
  subscribeThemePreference,
} from "../src/lib/theme-preference";

export function useColorScheme(): NonNullable<ColorSchemeName> {
  const [scheme, setScheme] = useState<NonNullable<ColorSchemeName>>(() => {
    const pref = getThemePreference();
    return resolveColorScheme(pref);
  });

  useEffect(() => {
    // 1) Cargar preferencia guardada (solo 1 vez)
    loadThemePreferenceOnce();

    // 2) Escuchar cambios de preferencia (cuando eliges claro/oscuro)
    const unsubPref = subscribeThemePreference(() => {
      const pref = getThemePreference();
      setScheme(resolveColorScheme(pref));
    });

    // 3) Si está en "system", reaccionar cuando el sistema cambie
    const subSystem = Appearance.addChangeListener(() => {
      const pref = getThemePreference();
      setScheme(resolveColorScheme(pref));
    });

    return () => {
      unsubPref();
      subSystem.remove();
    };
  }, []);

  return scheme;
}
