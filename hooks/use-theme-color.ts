import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type Theme = keyof typeof Colors; // "light" | "dark"
type ColorName = keyof typeof Colors.light; // keys comunes

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorName
) {
  const theme = (useColorScheme() ?? "light") as Theme;

  const colorFromProps = props[theme];
  if (colorFromProps) return colorFromProps;

  // TS a veces no entiende que Colors.light y Colors.dark comparten keys
  const palette = Colors[theme] as Record<ColorName, string>;
  return palette[colorName];
}
