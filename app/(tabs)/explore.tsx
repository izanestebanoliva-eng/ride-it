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

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type PuntoGPS = {
  lat: number;
  lon: number;
  t: number;       // timestamp ms
  acc?: number;    // accuracy (m)
  spd?: number;    // speed (m/s) si viene del GPS
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

// Ajustes de “filtro” (puedes tocar estos si quieres)
const MAX_ACC_M = 30;            // si accuracy > 30m, ignoramos ese punto
const MIN_DT_MS = 800;           // ignora actualizaciones demasiado seguidas
const MIN_STEP_M = 2;            // si se mueve <2m, lo ignoramos (ruido)
const MAX_SPEED_KMH = 220;       // cap para picos (como pediste)
const MAX_SPEED_MPS = MAX_SPEED_KMH / 3.6;

export default function RecordScreen() {
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();

  const screenBg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const overlayBg = useThemeColor({ light: "#ffffff", dark: "rgba(0,0,0,0.75)" }, "background");

  const [grabando, setGrabando] = useState(false);
  const [puntos, setPuntos] = useState<PuntoGPS[]>([]);
  const [inicioMs, setInicioMs] = useState<number | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [watcher, setWatcher] = useState<Location.LocationSubscription | null>(null);

  const [region, setRegion] = useState<Region>({
    latitude: 41.3874,
    longitude: 2.1686,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const [posActual, setPosActual] = useState<{ lat: number; lon: number } | null>(null);
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
          if (puntos.length > 0) return prev;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (!grabando || !inicioMs) return;
    const interval = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicioMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [grabando, inicioMs]);

  const coordenadas = useMemo(
    () => puntos.map((p) => ({ latitude: p.lat, longitude: p.lon })),
    [puntos]
  );

  // Distancia total “filtrada” (no suma saltos imposibles)
  const distanciaTotal = useMemo(() => {
    if (puntos.length < 2) return 0;

    let total = 0;

    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1];
      const b = puntos[i];

      const dt = b.t - a.t;
      if (dt <= 0) continue;

      const d = distanciaMetros(a.lat, a.lon, b.lat, b.lon);
      const mps = d / (dt / 1000);

      // filtros: pasos ridículos / picos
      if (d < MIN_STEP_M) continue;
      if (mps > MAX_SPEED_MPS) continue;

      total += d;
    }

    return Math.round(total);
  }, [puntos]);

  const velocidadMediaKmh = useMemo(() => {
    if (segundos <= 0) return 0;
    return kmhFrom(distanciaTotal / segundos);
  }, [distanciaTotal, segundos]);

  // Velocidad máxima (usa speed del GPS si viene, si no calcula por distancia/tiempo)
  const velMaxKmh = useMemo(() => {
    if (puntos.length < 2) return 0;

    let maxMps = 0;

    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1];
      const b = puntos[i];

      const dtMs = b.t - a.t;
      if (dtMs <= 0) continue;

      let mps = 0;

      // si el GPS da speed, úsalo (suele ser más estable)
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

    setPuntos([]);
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

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (pos) => {
        const acc = pos.coords.accuracy ?? undefined;
        if (typeof acc === "number" && acc > MAX_ACC_M) return; // ✅ filtra mala precisión

        const p: PuntoGPS = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          t: pos.timestamp ?? Date.now(),
          acc: acc,
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
          if (mps > MAX_SPEED_MPS) return prev; // ✅ evita saltos locos

          return [...prev, p];
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

  function parar() {
    watcher?.remove();
    setWatcher(null);
    setGrabando(false);
  }

  function resetear() {
    watcher?.remove();
    setWatcher(null);

    setGrabando(false);
    setPuntos([]);
    setInicioMs(null);
    setSegundos(0);
    setSiguiendo(true);
  }

  async function guardarRuta() {
    if (puntos.length < 2) {
      Alert.alert("Ruta demasiado corta", "Muévete un poco antes de guardar.");
      return;
    }

    // Snapshot (imagen local)
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

    const ruta = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      duracion: segundos,
      distancia: distanciaTotal,
      puntos,
      previewUri,
      name: "",
    };

    const guardadas = await AsyncStorage.getItem("rutas");
    const lista = guardadas ? JSON.parse(guardadas) : [];
    lista.unshift(ruta);

    await AsyncStorage.setItem("rutas", JSON.stringify(lista));
    Alert.alert("Ruta guardada ✅");
    resetear();
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
    <SafeAreaView edges={["bottom"]} style={[styles.safe, { backgroundColor: screenBg }]}>
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
          {coordenadas.length > 0 && <Polyline coordinates={coordenadas} strokeWidth={5} />}

          {posActual && (
            <Marker coordinate={{ latitude: posActual.lat, longitude: posActual.lon }} anchor={{ x: 0.5, y: 0.5 }}>
              <Image source={MARKERS[markerId].source} style={{ width: 42, height: 42 }} resizeMode="contain" />
            </Marker>
          )}
        </MapView>

        <View style={[styles.fabMiniColumn, { top: insets.top + 12 }]}>
          <Pressable
            style={[
              styles.fabMini,
              { backgroundColor: overlayBg, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
            ]}
            onPress={() => {
              if (posActual) seguirUsuario();
              else centrarRuta();
            }}
          >
            <Ionicons name="locate" size={18} color={textColor} />
          </Pressable>

          <Pressable
            style={[styles.fabMini, styles.fabMiniBlue, puntos.length < 2 && styles.fabDisabled]}
            onPress={guardarRuta}
            disabled={puntos.length < 2}
          >
            <Ionicons name="save" size={18} color="white" />
          </Pressable>
        </View>

        <View style={styles.primaryBar}>
          {!grabando ? (
            <Pressable style={[styles.primaryBtn, styles.primaryStart]} onPress={empezar}>
              <Ionicons name="play" size={18} color="white" />
              <ThemedText style={styles.primaryText}>Iniciar</ThemedText>
            </Pressable>
          ) : (
            <Pressable style={[styles.primaryBtn, styles.primaryStop]} onPress={parar}>
              <Ionicons name="stop" size={18} color="white" />
              <ThemedText style={styles.primaryText}>Detener</ThemedText>
            </Pressable>
          )}

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: overlayBg }]}
            onPress={() =>
              Alert.alert("Reset", "¿Seguro que quieres borrar la grabación actual?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Resetear", style: "destructive", onPress: resetear },
              ])
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
              <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                <ThemedText type="title">Recorrido</ThemedText>
                <ThemedText>{grabando ? "Grabando recorrido" : "Recorrido detenido"}</ThemedText>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Tiempo</ThemedText>
                    <ThemedText style={styles.metricValue}>{segundos}s</ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Distancia</ThemedText>
                    <ThemedText style={styles.metricValue}>{distanciaTotal} m</ThemedText>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Vel. media</ThemedText>
                    <ThemedText style={styles.metricValue}>{velocidadMediaKmh.toFixed(1)} km/h</ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricLabel}>Vel. máx</ThemedText>
                    <ThemedText style={styles.metricValue}>{velMaxKmh.toFixed(1)} km/h</ThemedText>
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
