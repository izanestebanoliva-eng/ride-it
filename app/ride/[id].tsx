import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import {
  getRouteById,
  updateRoute,
  type RouteDetailOut,
  type RouteVisibility,
} from "@/src/lib/api";

/* ───────── helpers ───────── */

function formatoDistancia(metros: number) {
  const m = Math.max(0, Number(metros ?? 0));
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function formatoDuracion(segundos: number) {
  const total = Math.max(0, Math.floor(Number(segundos ?? 0)));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  if (horas > 0) return `${horas} h ${minutos} min`;
  return `${minutos} min`;
}

function formatoVelocidad(kmh: number | null) {
  if (!kmh || !Number.isFinite(kmh)) return "—";
  return `${kmh.toFixed(1)} km/h`;
}

function velocidadMediaKmh(distanciaM: number, duracionS: number) {
  if (distanciaM <= 0 || duracionS <= 0) return null;
  return (distanciaM / duracionS) * 3.6;
}

// distancia (Haversine) para vmax
type PuntoGPS = { lat: number; lon: number; t?: number };
function distanciaEntreMetros(a: PuntoGPS, b: PuntoGPS) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function velocidadMaximaKmh(puntos: PuntoGPS[]) {
  if (!puntos || puntos.length < 2) return null;
  let max = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    if (!a.t || !b.t) continue;
    const dt = b.t - a.t;
    if (dt <= 0) continue;
    const dist = distanciaEntreMetros(a, b);
    const v = (dist / (dt / 1000)) * 3.6;
    if (Number.isFinite(v) && v > max) max = v;
  }
  if (max <= 0) return null;
  return Math.min(max, 220);
}

function normalizePath(path: any): PuntoGPS[] {
  if (!Array.isArray(path)) return [];
  return path
    .map((p: any) => {
      const lat = p?.lat ?? p?.latitude;
      const lon = p?.lon ?? p?.longitude;
      const t = p?.t ?? p?.timestamp;
      if (typeof lat !== "number" || typeof lon !== "number") return null;
      return {
        lat,
        lon,
        t: typeof t === "number" ? t : undefined,
      };
    })
    .filter(Boolean) as PuntoGPS[];
}

function visLabel(v: RouteVisibility) {
  if (v === "public") return "Pública";
  if (v === "friends") return "Amigos";
  return "Privada";
}

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapView>(null);

  const [ruta, setRuta] = useState<RouteDetailOut | null>(null);
  const [loading, setLoading] = useState(true);

  const [visOpen, setVisOpen] = useState(false);
  const [savingVis, setSavingVis] = useState(false);

  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );
  const icon = useThemeColor({}, "icon");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getRouteById(String(id));
        setRuta(data ?? null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const puntos = useMemo(() => normalizePath(ruta?.path), [ruta]);
  const coords = useMemo(
    () =>
      puntos.map((p) => ({
        latitude: p.lat,
        longitude: p.lon,
      })),
    [puntos]
  );

  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];

  useEffect(() => {
    if (coords.length < 2) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }, 200);
    return () => clearTimeout(t);
  }, [coords]);

  async function changeVisibility(next: RouteVisibility) {
  if (!ruta) return;

  if (ruta.visibility === next) {
    setVisOpen(false);
    return;
  }

  try {
    setSavingVis(true);

    await updateRoute(String(ruta.id), { visibility: next });

    // ✅ actualiza SOLO el campo en local (mantienes path y todo)
    setRuta((prev) => (prev ? { ...prev, visibility: next } : prev));

    setVisOpen(false);
  } finally {
    setSavingVis(false);
  }
}


  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
        <ThemedText>Cargando ruta…</ThemedText>
      </ThemedView>
    );
  }

  if (!ruta) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title">Ruta no encontrada</ThemedText>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Volver</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const fecha = ruta.created_at ? new Date(ruta.created_at).toLocaleString() : "—";
  const distM = Number(ruta.distance_m ?? 0);
  const durS = Number(ruta.duration_s ?? 0);
  const vMedia = velocidadMediaKmh(distM, durS);
  const vMax = velocidadMaximaKmh(puntos);
  const vis: RouteVisibility = (ruta.visibility ?? "private") as RouteVisibility;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">Detalle de ruta</ThemedText>
              <ThemedText style={styles.sub}>{fecha}</ThemedText>
            </View>

            {/* selector visibilidad */}
            <Pressable
              onPress={() => setVisOpen(true)}
              style={[
                styles.visChip,
                { backgroundColor: subtleBg, borderColor: border },
              ]}
              hitSlop={10}
            >
              <Ionicons name="earth-outline" size={16} color={icon} />
              <ThemedText style={{ fontWeight: "900" }}>
                {visLabel(vis)}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color={icon} />
            </Pressable>
          </View>

          {/* MAPA */}
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: inicio?.lat ?? 41.3874,
                longitude: inicio?.lon ?? 2.1686,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {coords.length >= 2 && (
                <Polyline coordinates={coords} strokeWidth={5} />
              )}

              {inicio && (
                <Marker
                  coordinate={{ latitude: inicio.lat, longitude: inicio.lon }}
                  title="Inicio"
                />
              )}
              {fin && (
                <Marker
                  coordinate={{ latitude: fin.lat, longitude: fin.lon }}
                  title="Fin"
                />
              )}
            </MapView>
          </View>

          {/* MÉTRICAS */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: border },
            ]}
          >
            <View style={styles.row}>
              <View style={[styles.box, { backgroundColor: subtleBg }]}>
                <ThemedText style={styles.label}>Distancia</ThemedText>
                <ThemedText style={styles.value}>
                  {formatoDistancia(distM)}
                </ThemedText>
              </View>

              <View style={[styles.box, { backgroundColor: subtleBg }]}>
                <ThemedText style={styles.label}>Duración</ThemedText>
                <ThemedText style={styles.value}>
                  {formatoDuracion(durS)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.box, { backgroundColor: subtleBg }]}>
                <ThemedText style={styles.label}>Velocidad media</ThemedText>
                <ThemedText style={styles.value}>
                  {formatoVelocidad(vMedia)}
                </ThemedText>
              </View>

              <View style={[styles.box, { backgroundColor: subtleBg }]}>
                <ThemedText style={styles.label}>Velocidad máxima</ThemedText>
                <ThemedText style={styles.value}>
                  {formatoVelocidad(vMax)}
                </ThemedText>
              </View>
            </View>
          </View>

          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>Volver</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL visibilidad */}
      <Modal
        visible={visOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVisOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: cardBg, borderColor: border },
            ]}
          >
            <ThemedText type="title" style={{ fontSize: 18 }}>
              Visibilidad
            </ThemedText>

            <ThemedText style={{ opacity: 0.75 }}>
              Elige quién puede ver esta ruta.
            </ThemedText>

            <View style={{ height: 8 }} />

            {(["private", "friends", "public"] as RouteVisibility[]).map((v) => {
              const selected = vis === v;
              return (
                <Pressable
                  key={v}
                  disabled={savingVis}
                  onPress={() => changeVisibility(v)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: subtleBg,
                      borderColor: border,
                      opacity: savingVis ? 0.65 : 1,
                    },
                    selected && styles.optionSelected,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: "900" }}>
                      {visLabel(v)}
                    </ThemedText>
                    <ThemedText
                      style={{
                        opacity: 0.75,
                        marginTop: 2,
                        fontSize: 12,
                      }}
                    >
                      {v === "private"
                        ? "Solo tú"
                        : v === "friends"
                        ? "Tú y tus amigos"
                        : "Todo el mundo"}
                    </ThemedText>
                  </View>

                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#1e88e5"
                    />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={icon} />
                  )}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setVisOpen(false)}
              disabled={savingVis}
              style={[
                styles.modalBtn,
                { backgroundColor: subtleBg, borderColor: border },
              ]}
            >
              <ThemedText style={{ fontWeight: "900" }}>Cerrar</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  header: { gap: 6, flexDirection: "row", alignItems: "center" },
  sub: { opacity: 0.75 },

  visChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  mapWrap: {
    height: 380,
    borderRadius: 18,
    overflow: "hidden",
  },
  map: { flex: 1 },

  card: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },

  row: { flexDirection: "row", gap: 12 },
  box: { flex: 1, borderRadius: 16, padding: 12, gap: 6 },
  label: { opacity: 0.75, fontWeight: "800" },
  value: { fontSize: 18, fontWeight: "900" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  backBtn: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#1e88e5",
  },
  backText: { color: "white", fontWeight: "900" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  option: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSelected: {
    borderColor: "#1e88e5",
  },
  modalBtn: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

