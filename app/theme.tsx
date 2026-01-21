import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import {
    setThemePreference,
    type ThemePref,
} from "../src/lib/theme-preference";

const THEME_STORAGE_KEY = "theme_preference";

function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const border = useThemeColor({}, "border");
  const icon = useThemeColor({}, "icon");
  const bgSelected = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.08)" },
    "background"
  );

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          borderBottomColor: border,
          backgroundColor: selected ? bgSelected : "transparent",
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.rowTitle}>{title}</ThemedText>
        {subtitle ? <ThemedText style={styles.rowSub}>{subtitle}</ThemedText> : null}
      </View>

      {selected ? <Ionicons name="checkmark" size={20} color={icon} /> : null}
    </Pressable>
  );
}

export default function ThemeScreen() {
  const iconColor = useThemeColor({}, "icon");
  const backBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [selected, setSelected] = useState<ThemePref>("system");

  const load = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setSelected(saved);
      } else {
        setSelected("system");
      }
    } catch {
      setSelected("system");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function setPref(pref: ThemePref) {
    // 1) estado UI
    setSelected(pref);

    // 2) persistencia
    await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);

    // 3) ✅ CAMBIO AL MOMENTO (esto es lo que te falta)
    setThemePreference(pref);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: backBg }]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Tema
          </ThemedText>

          <View style={{ width: 40 }} />
        </View>

        <ThemedView style={styles.card}>
          <OptionRow
            title="Sistema"
            subtitle="Sigue el modo del móvil"
            selected={selected === "system"}
            onPress={() => setPref("system")}
          />
          <OptionRow
            title="Claro"
            subtitle="Fondo claro"
            selected={selected === "light"}
            onPress={() => setPref("light")}
          />
          <OptionRow
            title="Oscuro"
            subtitle="Fondo oscuro"
            selected={selected === "dark"}
            onPress={() => setPref("dark")}
          />
        </ThemedView>

        <ThemedText style={styles.footer}>Ride it · Tema</ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22 },

  card: { marginHorizontal: 18, marginTop: 14, borderRadius: 18, overflow: "hidden" },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontWeight: "900" },
  rowSub: { opacity: 0.7, marginTop: 2, fontSize: 12 },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 18 },
});
