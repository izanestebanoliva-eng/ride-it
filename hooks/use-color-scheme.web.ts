import type { ColorSchemeName } from "react-native";
import { useColorScheme as useRNColorScheme } from "react-native";
import { useAppTheme } from "../src/lib/theme-provider";

export function useColorScheme(): NonNullable<ColorSchemeName> {
  const rn = useRNColorScheme() ?? "dark";

  try {
    const { themeMode } = useAppTheme();

    if (themeMode === "system") return rn;
    if (themeMode === "dark") return "dark";
    if (themeMode === "light") return "light";

    return rn;
  } catch {
    return rn;
  }
}
