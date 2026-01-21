import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import type { AppThemeMode } from "./theme";
import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY } from "./theme";

type ThemeCtx = {
  themeMode: AppThemeMode;
  setThemeMode: (m: AppThemeMode) => Promise<void>;
  isLoaded: boolean;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function useAppTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppTheme must be used within AppThemeProvider");
  return v;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, _setThemeMode] = useState<AppThemeMode>(DEFAULT_THEME_MODE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "system" || saved === "dark" || saved === "light") {
          _setThemeMode(saved);
        }
      } catch {
        // nada
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const navTheme = useMemo(() => {
    const effective = themeMode === "system" ? (systemScheme ?? "dark") : themeMode;
    return effective === "dark" ? DarkTheme : DefaultTheme;
  }, [themeMode, systemScheme]);

  async function setThemeMode(m: AppThemeMode) {
    _setThemeMode(m); // ✅ cambia al instante
    await AsyncStorage.setItem(THEME_STORAGE_KEY, m);
  }

  return (
    <Ctx.Provider value={{ themeMode, setThemeMode, isLoaded }}>
      <ThemeProvider value={navTheme}>{children}</ThemeProvider>
    </Ctx.Provider>
  );
}
