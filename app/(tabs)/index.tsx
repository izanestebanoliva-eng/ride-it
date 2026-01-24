import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import { getMyRoutes } from "@/src/lib/api";

/* ───────── helpers ───────── */

function formatoDuracion(segundos: number) {
  const s = Math.max(0, Math.floor(Number(segundos ?? 0)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

function formatoDistancia(metros: number) {
  const v = Math.max(0, Number(metros ?? 0));
  if (v >= 1000) return `${(v / 1000).toFixed(2)} km`;
  return `${Math.round(v)} m`;
}

type RouteListItem = {
  id: string | number;
  created_at?: string;
  distance_m?: number;
  duration_s?: number;
  name?: string | null;
  visibility?: "private" | "friends" | "public";
};

function isNotAuthenticatedError(e: unknown) {
  const msg = String((e as any)?.message ?? e ?? "");
  // backend suele devolver: {"detail":"Not authenticated"}
  return msg.includes("Not authenticated") || msg.includes('"detail"') && msg.includes("Not authenticated");
}

export default function HomeScreen() {
  const [rutas, setRutas] = useState<RouteListItem[]>([]);
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

      const data: any = await getMyRoutes();
      const list: RouteListItem[] = Array.isArray(data) ? data : [];
      setRutas(list);
    } catch (e) {
      // ✅ si no hay login, NO explotamos
      if (isNotAuthenticatedError(e)) {
        setRutas([]);
        return;
      }

      // otros errores: dejamos vacío pero sin crashear
      setRutas([]);
      // si quieres, aquí luego metemos un toast/alert con extractApiDetail()
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarRutas();
    }, [cargarRutas])
  );

  const ultima = useMemo(() => {
    if (!rutas || rutas.length === 0) return null;

    const sorted = [...rutas].sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return tb - ta;
    });

    return sorted[0] ?? null;
  }, [rutas]);

  const resumen = useMemo(() => {
    return {
      total: rutas.length,
      ultimaFecha: ultima?.created_at
        ? new Date(ultima.created_at).toLocaleString()
        : "—",
      ultimaDist: ultima ? formatoDistancia(ultima.distance_m ?? 0) : "—",
      ultimaDur: ultima ? formatoDuracion(ultima.duration_s ?? 0) : "—",
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
              <ThemedText style={styles.bigBtnSub}>
                Ver listado y detalle
              </ThemedText>
            </Pressable>
          </View>

          {/* ÚLTIMA RUTA (clic en todo el recuadro) */}
          <Pressable
            disabled={!ultima}
            onPress={() => {
              if (!ultima) return;
              router.push({
                pathname: "/ride/[id]",
                params: { id: String(ultima.id) },
              });
            }}
            style={[styles.card, !ultima && styles.disabled]}
          >
            <View style={styles.cardTop}>
              <ThemedText type="subtitle">Última ruta</ThemedText>
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

            {!ultima && !cargando && (
              <ThemedText style={styles.hint}>
                Graba una ruta para que aquí aparezca el resumen.
              </ThemedText>
            )}
          </Pressable>

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
  bigBtnSecondary: { backgroundColor: "rgba(0,0,0,0.78)" },

  bigBtnTitle: { color: "white", fontWeight: "900", fontSize: 18 },
  bigBtnSub: { color: "white", opacity: 0.9 },

  card: { borderRadius: 20, padding: 16, gap: 12 },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

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
