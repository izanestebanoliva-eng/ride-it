export type AppThemeMode = "system" | "dark" | "light";

export const THEME_STORAGE_KEY = "themeMode";
export const DEFAULT_THEME_MODE: AppThemeMode = "system";

export const THEME_LABEL: Record<AppThemeMode, string> = {
  system: "Automático",
  dark: "Oscuro",
  light: "Claro",
};
