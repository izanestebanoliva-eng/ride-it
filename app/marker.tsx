import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import {
  DEFAULT_MARKER_ID,
  MARKERS,
  MARKER_STORAGE_KEY,
  type MarkerId,
} from "../src/lib/marker-catalog";

export default function MarkerPickerScreen() {
  const [selected, setSelected] = useState<MarkerId>(DEFAULT_MARKER_ID);

  // ✅ colores que se ven bien en claro/oscuro
  const iconColor = useThemeColor({}, "icon");
  const backBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const itemBg = useThemeColor(
    { light: "rgba(0,0,0,0.04)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const previewBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(0,0,0,0.22)" },
    "background"
  );

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(MARKER_STORAGE_KEY);
        if (saved && saved in MARKERS) setSelected(saved as MarkerId);
      } catch {
        // nada
      }
    })();
  }, []);

  const motos = useMemo(
    () =>
      (Object.keys(MARKERS) as MarkerId[]).filter(
        (id) => MARKERS[id].category === "moto"
      ),
    []
  );
  const coches = useMemo(
    () =>
      (Object.keys(MARKERS) as MarkerId[]).filter(
        (id) => MARKERS[id].category === "coche"
      ),
    []
  );

  async function pick(id: MarkerId) {
    setSelected(id);
    await AsyncStorage.setItem(MARKER_STORAGE_KEY, id);
  }

  const renderGrid = (ids: MarkerId[]) => (
    <View style={styles.grid}>
      {ids.map((id) => {
        const active = id === selected;
        return (
          <Pressable
            key={id}
            onPress={() => pick(id)}
            style={[
              styles.item,
              { backgroundColor: itemBg },
              active && styles.itemActive,
            ]}
          >
            <View style={[styles.previewBox, { backgroundColor: previewBg }]}>
              <Image
                source={MARKERS[id].source}
                style={styles.previewImg}
                resizeMode="contain"
              />
            </View>

            <ThemedText style={styles.itemLabel}>{MARKERS[id].label}</ThemedText>

            {active && (
              <View style={styles.check}>
                <Ionicons name="checkmark" size={14} color="white" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          {/* ✅ flecha visible en claro/oscuro */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: backBg }]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Marcador
          </ThemedText>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Motos</ThemedText>
          {renderGrid(motos)}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Coches</ThemedText>
          {renderGrid(coches)}
        </View>

        <ThemedText style={styles.footer}>Se guarda automáticamente</ThemedText>
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

  section: { paddingHorizontal: 18, paddingTop: 14, gap: 10 },
  sectionTitle: { opacity: 0.75, fontWeight: "800" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  item: {
    width: "47%",
    borderRadius: 18,
    padding: 12,
    position: "relative",
  },
  itemActive: {
    backgroundColor: "rgba(30,136,229,0.25)",
    borderWidth: 1,
    borderColor: "rgba(30,136,229,0.55)",
  },

  previewBox: {
    height: 74,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImg: { width: 46, height: 46 },

  itemLabel: { marginTop: 10, fontWeight: "800", opacity: 0.9 },

  check: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(30,136,229,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 18 },
});
