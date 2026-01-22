import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DEFAULT_MARKER_ID,
  MARKERS,
  MARKER_STORAGE_KEY,
  type MarkerId,
} from "../../src/lib/marker-catalog";

// ✅ TU LOCATION TASK (ajusta solo si el path es distinto)
import {
  clearCurrentRoutePoints,
  getCurrentRoutePoints,
  startBackgroundTracking,
  stopBackgroundTracking,
  type RoutePoint,
} from "../../src/lib/location-task";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type PuntoGPS = {
  lat: number;
  lon: number;
  t: number; // timestamp ms
  acc?: number; // accuracy (m)
  spd?: number; // speed (m/s)
};

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kmhFrom(mps: number) {
  return mps * 3.6;
}

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(v, max));
}

// Ajustes de “filtro”
const MAX_ACC_M = 30;
const MIN_DT_MS = 800;
const MIN_STEP_M = 2;
const MAX_SPEED_KMH = 220;
const MAX_SPEED_MPS = MAX_SPEED_KMH / 3.6;

// ✅ Para quitar duplicados al fusionar FG+BG
const DEDUPE_DT_MS = 700; // si llegan casi a la vez…
const DEDUPE_DIST_M = 1.5; // …y casi mismo sitio => duplicado

function mergeWithoutDupes(points: PuntoGPS[]) {
  if (points.length <= 1) return points;

  // Orden por tiempo
  const sorted = [...points].sort((a, b) => a.t - b.t);

  const out: PuntoGPS[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (!last) {
      out.push(p);
      continue;
    }

    const dt = Math.abs(p.t - last.t);
    const d = distanciaMetros(last.lat, last.lon, p.lat, p.lon);

    // Duplicado: mismo punto repetido (o casi)
    if (dt < DEDUPE_DT_MS && d < DEDUPE_DIST_M) continue;

    out.push(p);
  }

  return out;
}

function distanciaTotalFiltrada(puntos: PuntoGPS[]) {
  if (puntos.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];

    const dt = b.t - a.t;
    if (dt <= 0) continue;

    const d = distanciaMetros(a.lat, a.lon, b.lat, b.lon);
    const mps = d / (dt / 1000);

    if (d < MIN_STEP_M) continue;
    if (mps > MAX_SPEED_MPS) continue;

    total += d;
  }

  return Math.round(total);
}

export default function RecordScreen() {
  // ✅ tipado limpio
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  const screenBg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const overlayBg = useThemeColor(
    { light: "#ffffff", dark: "rgba(0,0,0,0.75)" },
    "background"
  );

  const [grabando, setGrabando] = useState(false);
  const [puntos, setPuntos] = useState<PuntoGPS[]>([]);
  const puntosRef = useRef<PuntoGPS[]>([]);
  useEffect(() => {
    puntosRef.current = puntos;
  }, [puntos]);

  const [inicioMs, setInicioMs] = useState<number | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [watcher, setWatcher] =
    useState<Location.LocationSubscription | null>(null);

  const [region, setRegion] = useState<Region>({
    latitude: 41.3874,
    longitude: 2.1686,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const [posActual, setPosActual] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [siguiendo, setSiguiendo] = useState(true);

  const regionRef = useRef(region);
  const siguiendoRef = useRef(siguiendo);

  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  useEffect(() => {
    siguiendoRef.current = siguiendo;
  }, [siguiendo]);

  const [markerId, setMarkerId] = useState<MarkerId>(DEFAULT_MARKER_ID);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      (async () => {
        try {
          const saved = await AsyncStorage.getItem(MARKER_STORAGE_KEY);
          if (active && saved && saved in MARKERS) {
            setMarkerId(saved as MarkerId);
          }
        } catch {}
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  // ✅ Sincroniza puntos del background y los mezcla con los de memoria (sin duplicados)
  async function syncFromBackground(): Promise<PuntoGPS[]> {
    try {
      const bgPoints: RoutePoint[] = await getCurrentRoutePoints();
      if (!bgPoints || bgPoints.length === 0) return puntosRef.current;

      const mapped: PuntoGPS[] = bgPoints.map((p: any) => ({
        lat: p.lat ?? p.latitude,
        lon: p.lon ?? p.longitude,
        t: p.t ?? p.timestamp ?? Date.now(),
        acc: (p.accuracy ?? p.acc) ?? undefined,
        spd: (p.speed ?? p.spd) ?? undefined,
      }));

      const combined = [...puntosRef.current, ...mapped];
      const merged = mergeWithoutDupes(combined);

      // ✅ Importante: actualizar state y ref
      setPuntos(merged);
      puntosRef.current = merged;

      return merged;
    } catch {
      return puntosRef.current;
    }
  }

  // Ubicación inicial
  useEffect(() => {
    const cargarUbicacionInicial = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setPosActual({ lat, lon });

        setRegion((prev) => {
          const usandoDefault =
            Math.abs(prev.latitude - 41.3874) < 0.0001 &&
            Math.abs(prev.longitude - 2.1686) < 0.0001;

          if (!usandoDefault) return prev;
          if (puntosRef.current.length > 0) return prev;

          return {
            ...prev,
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
        });
      } catch {}
    };

    cargarUbicacionInicial();
  }, []);

  // Timer
  useEffect(() => {
    if (!grabando || !inicioMs) return;
    const interval = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicioMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [grabando, inicioMs]);

  // ✅ Mientras grabas, cada X segundos sincronizamos por si has estado en background
  useEffect(() => {
    if (!grabando) return;
    const t = setInterval(() => {
      syncFromBackground();
    }, 2500);
    return () => clearInterval(t);
  }, [grabando]);

  const coordenadas = useMemo(
    () => puntos.map((p) => ({ latitude: p.lat, longitude: p.lon })),
    [puntos]
  );

  const distanciaTotal = useMemo(() => {
    return distanciaTotalFiltrada(puntos);
  }, [puntos]);

  const velocidadMediaKmh = useMemo(() => {
    if (segundos <= 0) return 0;
    return kmhFrom(distanciaTotal / segundos);
  }, [distanciaTotal, segundos]);

  const velMaxKmh = useMemo(() => {
    if (puntos.length < 2) return 0;

    let maxMps = 0;

    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1];
      const b = puntos[i];

      const dtMs = b.t - a.t;
      if (dtMs <= 0) continue;

      let mps = 0;

      if (typeof b.spd === "number" && Number.isFinite(b.spd) && b.spd >= 0) {
        mps = b.spd;
      } else {
        const d = distanciaMetros(a.lat, a.lon, b.lat, b.lon);
        mps = d / (dtMs / 1000);
      }

      if (mps > MAX_SPEED_MPS) continue;
      if (mps > maxMps) maxMps = mps;
    }

    return kmhFrom(maxMps);
  }, [puntos]);

  async function empezar() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos el GPS para grabar.");
      return;
    }

    // ✅ arrancamos background tracking
    try {
      await clearCurrentRoutePoints();
      await startBackgroundTracking();
    } catch {
      Alert.alert(
        "Background no activado",
        "No se ha podido activar el tracking en segundo plano. Revisa permisos de ubicación (Siempre)."
      );
    }

    setPuntos([]);
    puntosRef.current = [];
    setInicioMs(Date.now());
    setSegundos(0);
    setGrabando(true);
    setSiguiendo(true);

    const first = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const firstRegion: Region = {
      latitude: first.coords.latitude,
      longitude: first.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion((prev) => ({ ...prev, ...firstRegion }));
    mapRef.current?.animateToRegion(firstRegion, 350);

    // ✅ watcher foreground para UI suave
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (pos) => {
        const acc = pos.coords.accuracy ?? undefined;
        if (typeof acc === "number" && acc > MAX_ACC_M) return;

        const p: PuntoGPS = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          t: pos.timestamp ?? Date.now(),
          acc,
          spd: typeof pos.coords.speed === "number" ? pos.coords.speed : undefined,
        };

        setPosActual({ lat: p.lat, lon: p.lon });

        setPuntos((prev) => {
          const last = prev[prev.length - 1];
          if (!last) return [p];

          const dt = p.t - last.t;
          if (dt < MIN_DT_MS) return prev;

          const d = distanciaMetros(last.lat, last.lon, p.lat, p.lon);
          if (d < MIN_STEP_M) return prev;

          const mps = d / (dt / 1000);
          if (mps > MAX_SPEED_MPS) return prev;

          const next = [...prev, p];
          // ✅ por si el BG mete alguno “entre medias”, mantenemos orden y sin dupes
          return mergeWithoutDupes(next);
        });

        if (siguiendoRef.current) {
          const zoom = regionRef.current;
          const nextRegion: Region = {
            latitude: p.lat,
            longitude: p.lon,
            latitudeDelta: zoom.latitudeDelta,
            longitudeDelta: zoom.longitudeDelta,
          };
          setRegion(nextRegion);
          mapRef.current?.animateToRegion(nextRegion, 350);
        }
      }
    );

    setWatcher(sub);
  }

  async function parar() {
    watcher?.remove();
    setWatcher(null);
    setGrabando(false);

    // ✅ paramos background y sincronizamos puntos finales
    try {
      await stopBackgroundTracking();
    } catch {}
    await syncFromBackground();
  }

  async function resetear() {
    watcher?.remove();
    setWatcher(null);

    setGrabando(false);
    setPuntos([]);
    puntosRef.current = [];
    setInicioMs(null);
    setSegundos(0);
    setSiguiendo(true);

    // ✅ parar y limpiar background
    try {
      await stopBackgroundTracking();
    } catch {}
    try {
      await clearCurrentRoutePoints();
    } catch {}
  }

  async function guardarRuta() {
    // ✅ 1) “cierra” BG y fusiona definitivo
    try {
      await stopBackgroundTracking();
    } catch {}

    const merged = await syncFromBackground();

    if (merged.length < 2) {
      Alert.alert("Ruta demasiado corta", "Muévete un poco antes de guardar.");
      return;
    }

    // ✅ snapshot (imagen local)
    let previewUri: string | null = null;
    try {
      const snap = await (mapRef.current as any)?.takeSnapshot?.({
        width: 900,
        height: 420,
        format: "png",
        quality: 0.9,
        result: "file",
      });
      if (typeof snap === "string") previewUri = snap;
    } catch {
      previewUri = null;
    }

    // ✅ usa la lista mergeada REAL para calcular distancia/guardar
    const distanciaFinal = distanciaTotalFiltrada(merged);

    const ruta = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      duracion: segundos,
      distancia: distanciaFinal,
      puntos: merged,
      previewUri,
      name: "",
    };

    const guardadas = await AsyncStorage.getItem("rutas");
    const lista = guardadas ? JSON.parse(guardadas) : [];
    lista.unshift(ruta);

    await AsyncStorage.setItem("rutas", JSON.stringify(lista));
    Alert.alert("Ruta guardada ✅");

    try {
      await clearCurrentRoutePoints();
    } catch {}

    await resetear();
  }

  function centrarRuta() {
    if (coordenadas.length === 0) return;
    mapRef.current?.fitToCoordinates(coordenadas, {
      edgePadding: { top: 80, right: 50, bottom: 320, left: 50 },
      animated: true,
    });
  }

  function seguirUsuario() {
    if (!posActual) return;
    if (grabando) setSiguiendo(true);

    const zoom = regionRef.current;
    const nextRegion: Region = {
      latitude: posActual.lat,
      longitude: posActual.lon,
      latitudeDelta: zoom.latitudeDelta,
      longitudeDelta: zoom.longitudeDelta,
    };

    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 350);
  }

  // Bottom sheet
  const { height: SCREEN_H } = Dimensions.get("window");
  const COLLAPSED = 8;
  const EXPANDED = Math.min(620, Math.floor(SCREEN_H * 0.78));
  const maxTranslateY = EXPANDED - COLLAPSED;

  const translateY = useSharedValue(maxTranslateY);
  const startY = useSharedValue(0);

  const snapTo = (target: number) => {
    "worklet";
    translateY.value = withSpring(target, { damping: 22, stiffness: 220 });
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = clamp(startY.value + e.translationY, 0, maxTranslateY);
      translateY.value = next;
    })
    .onEnd(() => {
      const y = translateY.value;
      const snapPoints = [0, maxTranslateY / 2, maxTranslateY];

      let closest = snapPoints[0];
      let bestDist = Math.abs(y - snapPoints[0]);

      for (const p of snapPoints) {
        const d = Math.abs(y - p);
        if (d < bestDist) {
          bestDist = d;
          closest = p;
        }
      }
      snapTo(closest);
    });

  const sheetStyle = useAnimatedStyle(() => {
    return {
      height: EXPANDED,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.safe, { backgroundColor: screenBg }]}
    >
      <View style={[styles.screen, { backgroundColor: screenBg }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPanDrag={() => {
            if (grabando) setSiguiendo(false);
          }}
        >
          {coordenadas.length > 0 && (
            <Polyline coordinates={coordenadas} strokeWidth={5} />
          )}

          {posActual && (
            <Marker
              coordinate={{ latitude: posActual.lat, longitude: posActual.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Image
                source={MARKERS[markerId].source}
                style={{ width: 42, height: 42 }}
                resizeMode="contain"
              />
            </Marker>
          )}
        </MapView>

        <View style={[styles.fabMiniColumn, { top: insets.top + 12 }]}>
          <Pressable
            style={[
              styles.fabMini,
              {
                backgroundColor: overlayBg,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.08)",
              },
            ]}
            onPress={() => {
              if (posActual) seguirUsuario();
              else centrarRuta();
            }}
          >
            <Ionicons name="locate" size={18} color={textColor} />
          </Pressable>

          <Pressable
            style={[
              styles.fabMini,
              styles.fabMiniBlue,
              puntos.length < 2 && styles.fabDisabled,
            ]}
            onPress={guardarRuta}
            disabled={puntos.length < 2}
          >
            <Ionicons name="save" size={18} color="white" />
          </Pressable>
        </View>

        <View style={styles.primaryBar}>
          {!grabando ? (
            <Pressable
              style={[styles.primaryBtn, styles.primaryStart]}
              onPress={empezar}
            >
              <Ionicons name="play" size={18} color="white" />
              <ThemedText style={styles.primaryText}>Iniciar</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryBtn, styles.primaryStop]}
              onPress={parar}
            >
              <Ionicons name="stop" size={18} color="white" />
              <ThemedText style={styles.primaryText}>Detener</ThemedText>
            </Pressable>
          )}

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: overlayBg }]}
            onPress={() =>
              Alert.alert(
                "Reset",
                "¿Seguro que quieres borrar la grabación actual?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Resetear",
                    style: "destructive",
                    onPress: resetear,
                  },
                ]
              )
            }
          >
            <Ionicons name="refresh" size={18} color={textColor} />
          </Pressable>
        </View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.bottomSheet, sheetStyle]}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <ThemedView style={styles.sheetBody}>
              <ScrollView
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
              >
                <ThemedText type="title">Recorrido</ThemedText>
                <ThemedText>
                  {grabando ? "Grabando recorrido" : "Recorrido detenido"}
                </ThemedText>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Tiempo</ThemedText>
                    <ThemedText style={styles.metricValue}>{segundos}s</ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Distancia</ThemedText>
                    <ThemedText style={styles.metricValue}>
                      {distanciaTotal} m
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Vel. media</ThemedText>
                    <ThemedText style={styles.metricValue}>
                      {velocidadMediaKmh.toFixed(1)} km/h
                    </ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Vel. máx</ThemedText>
                    <ThemedText style={styles.metricValue}>
                      {velMaxKmh.toFixed(1)} km/h
                    </ThemedText>
                  </View>
                </View>
              </ScrollView>
            </ThemedView>
          </Animated.View>
        </GestureDetector>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  fabMiniColumn: { position: "absolute", right: 16, top: 16, gap: 10 },
  fabMini: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  fabMiniBlue: { backgroundColor: "#1e88e5" },
  fabDisabled: { opacity: 0.5 },

  primaryBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  primaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryStart: { backgroundColor: "#1f8a3b" },
  primaryStop: { backgroundColor: "#b3261e" },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },

  secondaryBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },

  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },

  handleWrap: {
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheetBody: { flex: 1 },
  sheetContent: { padding: 16, gap: 10, paddingBottom: 24 },

  metricsRow: { flexDirection: "row", gap: 12 },
  metric: { flex: 1, padding: 12, borderRadius: 16 },
  metricLabel: { opacity: 0.8 },
  metricValue: { fontSize: 18, fontWeight: "800" },
});
