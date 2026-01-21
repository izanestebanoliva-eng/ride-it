/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import { Platform } from "react-native";

// Colores base (no los usamos directamente, pero los dejamos)
const tintColorLight = "#1e88e5";
const tintColorDark = "#1e88e5";

export const Colors = {
  light: {
    // Texto
    text: "#111111",
    textMuted: "#666666",

    // Fondos
    background: "#F7F7F7",   // fondo general (no blanco puro)
    card: "#FFFFFF",        // tarjetas / listas / panels
    overlay: "#FFFFFF",     // overlays claros (botones flotantes)

    // Bordes / separadores
    border: "#E5E5E5",

    // Iconos
    icon: "#333333",

    // Accento principal
    tint: tintColorLight,

    // Estados
    success: "#1f8a3b",
    danger: "#b3261e",
  },

  dark: {
    text: "#FFFFFF",
    background: "#121212", // 👈 gris oscuro (NO negro)
    tint: "#1e88e5",
    icon: "#FFFFFF",
    card: "#1A1A1A",
    border: "#2A2A2A",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

