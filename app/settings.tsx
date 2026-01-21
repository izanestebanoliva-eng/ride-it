import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

function Row({
  icon,
  title,
  subtitle,
  danger,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const iconColor = useThemeColor({}, "icon");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");

  const iconBoxBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.08)" },
    "background"
  );

  const chevronColor = useThemeColor(
    { light: "rgba(0,0,0,0.35)", dark: "rgba(255,255,255,0.55)" },
    "text"
  );

  const dangerBg = useThemeColor(
    { light: "rgba(255,80,80,0.12)", dark: "rgba(255,80,80,0.22)" },
    "background"
  );

  const dangerText = "#ff6b6b";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { borderBottomColor: borderColor },
        danger && { borderBottomColor: "rgba(255,80,80,0.25)" },
      ]}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: iconBoxBg },
            danger && { backgroundColor: dangerBg },
          ]}
        >
          <Ionicons name={icon} size={20} color={danger ? dangerText : iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.rowTitle, danger && { color: dangerText }]}>
            {title}
          </ThemedText>

          {subtitle ? (
            <ThemedText style={styles.rowSub}>{subtitle}</ThemedText>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={chevronColor} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const iconColor = useThemeColor({}, "icon");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "border");

  const backBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const borrarTodasLasRutas = useCallback(() => {
    Alert.alert(
      "Borrar rutas",
      "Esto eliminará todas las rutas guardadas en este móvil.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmación final",
              "¿Seguro? Esta acción no se puede deshacer.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Borrar",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await AsyncStorage.removeItem("rutas");
                      Alert.alert("Listo ✅", "Se han borrado todas las rutas.");
                    } catch {
                      Alert.alert("Error", "No se pudieron borrar las rutas.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, []);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: backBg }]} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Ajustes
          </ThemedText>

          <View style={{ width: 40 }} />
        </View>

        {/* PERSONALIZACIÓN */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Personalización</ThemedText>

          <ThemedView style={styles.card}>
            <Row
              icon="navigate-outline"
              title="Marcador"
              subtitle="Elegir estilo"
              onPress={() => router.push("/marker")}
            />

            <Row
              icon="color-palette-outline"
              title="Tema"
              subtitle="Cambiar"
              onPress={() => router.push("/theme")}
            />
          </ThemedView>
        </View>

        {/* DATOS */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Datos</ThemedText>

          <ThemedView style={styles.card}>
            <Row
              icon="trash-outline"
              title="Borrar todas las rutas"
              subtitle="Elimina rutas guardadas"
              danger
              onPress={borrarTodasLasRutas}
            />

            <Row icon="download-outline" title="Exportar rutas" subtitle="Próximamente" />
          </ThemedView>
        </View>

        <ThemedText style={styles.footer}>Ride it · Ajustes</ThemedText>
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

  card: { borderRadius: 18, overflow: "hidden" },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  rowTitle: { fontWeight: "900" },
  rowSub: { opacity: 0.7, marginTop: 2, fontSize: 12 },

  footer: {
    textAlign: "center",
    opacity: 0.6,
    paddingVertical: 18,
  },
});
