import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

/* ────────────────────────
   Tipos
──────────────────────── */
type PuntoGPS = {
  lat: number;
  lon: number;
  t: number; // timestamp (ms)
};

type RutaGuardada = {
  id: number;
  fecha: string;
  duracion: number; // segundos
  distancia: number; // metros
  puntos: PuntoGPS[];
};

/* ────────────────────────
   Formateadores
──────────────────────── */
function formatoDistancia(metros: number) {
  const m = Math.max(0, metros || 0);
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

// ✅ NUEVO: horas y minutos (sin segundos)
function formatoDuracion(segundos: number) {
  const total = Math.max(0, Math.floor(segundos || 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);

  if (horas > 0) return `${horas} h ${minutos} min`;
  return `${minutos} min`;
}

function formatoVelocidad(kmh: number | null) {
  if (!kmh || !Number.isFinite(kmh)) return "—";
  return `${kmh.toFixed(1)} km/h`;
}

/* ────────────────────────
   Cálculos de velocidad
──────────────────────── */
function velocidadMediaKmh(distanciaM: number, duracionS: number) {
  if (distanciaM <= 0 || duracionS <= 0) return null;
  return (distanciaM / duracionS) * 3.6;
}

// Distancia entre 2 puntos (Haversine)
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

    const dt = b.t - a.t; // ms
    if (dt <= 0) continue;

    const dist = distanciaEntreMetros(a, b);
    const v = (dist / (dt / 1000)) * 3.6;

    if (Number.isFinite(v) && v > max) max = v;
  }

  if (max <= 0) return null;
  return Math.min(max, 220); // filtro picos GPS
}

/* ────────────────────────
   Pantalla
──────────────────────── */
export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapView>(null);

  const [ruta, setRuta] = useState<RutaGuardada | null>(null);
  const [loading, setLoading] = useState(true);

  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem("rutas");
        const lista: RutaGuardada[] = raw ? JSON.parse(raw) : [];
        setRuta(lista.find((r) => r.id === Number(id)) ?? null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const coords = useMemo(
    () =>
      ruta?.puntos.map((p) => ({
        latitude: p.lat,
        longitude: p.lon,
      })) ?? [],
    [ruta]
  );

  const inicio = ruta?.puntos[0];
  const fin = ruta?.puntos[ruta.puntos.length - 1];

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

  const fecha = new Date(ruta.fecha).toLocaleString();
  const vMedia = velocidadMediaKmh(ruta.distancia, ruta.duracion);
  const vMax = velocidadMaximaKmh(ruta.puntos);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <ThemedText type="title">Detalle de ruta</ThemedText>
            <ThemedText style={styles.sub}>{fecha}</ThemedText>
          </View>

          {/* MAPA ARRIBA */}
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
              {coords.length >= 2 && <Polyline coordinates={coords} strokeWidth={5} />}
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
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.row}>
              <View style={[styles.box, { backgroundColor: subtleBg }]}>
                <ThemedText style={styles.label}>Distancia</ThemedText>
                <ThemedText style={styles.value}>
                  {formatoDistancia(ruta.distancia)}
                </ThemedText>
              </View>

              <View style={[styles.box, { backgroundColor: subtleBg }]}>
                <ThemedText style={styles.label}>Duración</ThemedText>
                <ThemedText style={styles.value}>
                  {formatoDuracion(ruta.duracion)}
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
    </ThemedView>
  );
}

/* ────────────────────────
   Estilos
──────────────────────── */
const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  header: { gap: 6 },
  sub: { opacity: 0.75 },

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
});
