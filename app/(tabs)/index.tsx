import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type PuntoGPS = { lat: number; lon: number; t: number };

type RutaGuardada = {
  id: number;
  fecha: string;
  duracion: number; // segundos
  distancia: number; // metros
  puntos: PuntoGPS[];
};

function formatoDuracion(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

function formatoDistancia(metros: number) {
  if (metros >= 1000) return `${(metros / 1000).toFixed(2)} km`;
  return `${metros} m`;
}

export default function HomeScreen() {
  const [rutas, setRutas] = useState<RutaGuardada[]>([]);
  const [cargando, setCargando] = useState(true);

  // ✅ colores del tema (arregla modo claro sin tocar el oscuro)
  const iconColor = useThemeColor({}, "icon");
  const settingsBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.12)" },
    "background"
  );

  const cargarRutas = useCallback(async () => {
    try {
      setCargando(true);
      const raw = await AsyncStorage.getItem("rutas");
      const lista: RutaGuardada[] = raw ? JSON.parse(raw) : [];
      setRutas(Array.isArray(lista) ? lista : []);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarRutas();
    }, [cargarRutas])
  );

  const ultima = rutas.length > 0 ? rutas[0] : null;

  const resumen = useMemo(() => {
    return {
      total: rutas.length,
      ultimaFecha: ultima ? new Date(ultima.fecha).toLocaleString() : "—",
      ultimaDist: ultima ? formatoDistancia(ultima.distancia) : "—",
      ultimaDur: ultima ? formatoDuracion(ultima.duracion) : "—",
    };
  }, [rutas, ultima]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <ThemedText
                type="title"
                style={{
                  fontFamily: "Pacifico",
                  fontSize: 36,
                  lineHeight: 44,
                  paddingTop: 8,
                }}
              >
                Ride it
              </ThemedText>

              <Pressable
                onPress={() => router.push("/settings")}
                style={[styles.settingsBtn, { backgroundColor: settingsBg }]}
                hitSlop={10}
              >
                <Ionicons name="settings-outline" size={24} color={iconColor} />
              </Pressable>
            </View>

            <ThemedText style={styles.sub}>
              {cargando ? "Cargando..." : `${resumen.total} rutas guardadas`}
            </ThemedText>
          </View>

          {/* ACCIONES RÁPIDAS */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.bigBtn, styles.bigBtnPrimary]}
              onPress={() => router.push("/explore")}
            >
              <ThemedText style={styles.bigBtnTitle}>Grabar ruta</ThemedText>
              <ThemedText style={styles.bigBtnSub}>GPS + métricas</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.bigBtn, styles.bigBtnSecondary]}
              onPress={() => router.push("/rides")}
            >
              <ThemedText style={styles.bigBtnTitle}>Mis rutas</ThemedText>
              <ThemedText style={styles.bigBtnSub}>Ver listado y detalle</ThemedText>
            </Pressable>
          </View>

          {/* ÚLTIMA RUTA */}
          <ThemedView style={styles.card}>
            <View style={styles.cardTop}>
              <ThemedText type="subtitle">Última ruta</ThemedText>

              <Pressable
                onPress={() => {
                  if (!ultima) return;
                  router.push({
                    pathname: "/ride/[id]",
                    params: { id: String(ultima.id) },
                  });
                }}
                disabled={!ultima}
                style={[styles.smallLink, !ultima && styles.disabled]}
              >
                <ThemedText style={styles.smallLinkText}>
                  {ultima ? "Abrir" : "—"}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.row}>
              <View style={styles.metric}>
                <ThemedText style={styles.label}>Distancia</ThemedText>
                <ThemedText style={styles.value}>{resumen.ultimaDist}</ThemedText>
              </View>

              <View style={styles.metric}>
                <ThemedText style={styles.label}>Duración</ThemedText>
                <ThemedText style={styles.value}>{resumen.ultimaDur}</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.date}>{resumen.ultimaFecha}</ThemedText>

            {!ultima && (
              <ThemedText style={styles.hint}>
                Graba una ruta para que aquí aparezca el resumen.
              </ThemedText>
            )}
          </ThemedView>

          {/* REFRESH */}
          <Pressable onPress={cargarRutas} style={styles.refresh}>
            <ThemedText style={styles.refreshText}>Actualizar</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },

  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },

  header: { gap: 6, paddingTop: 8 },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  sub: { opacity: 0.75 },

  actions: { gap: 12 },

  bigBtn: {
    borderRadius: 20,
    padding: 16,
    gap: 6,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  bigBtnPrimary: { backgroundColor: "#1e88e5" },
  // 🔥 se queda igual que antes (oscuro guapo)
  bigBtnSecondary: { backgroundColor: "rgba(0,0,0,0.78)" },

  bigBtnTitle: { color: "white", fontWeight: "900", fontSize: 18 },
  bigBtnSub: { color: "white", opacity: 0.9 },

  card: { borderRadius: 20, padding: 16, gap: 12 },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  smallLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  smallLinkText: { fontWeight: "800" },
  disabled: { opacity: 0.4 },

  row: { flexDirection: "row", gap: 12 },
  metric: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  label: { opacity: 0.75 },
  value: { fontSize: 18, fontWeight: "900" },

  date: { opacity: 0.75 },
  hint: { opacity: 0.75 },

  refresh: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 14 },
  refreshText: { opacity: 0.75, fontWeight: "700" },
});
