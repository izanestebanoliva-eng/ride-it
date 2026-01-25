import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import { getMyRoutes, getRouteById, type RouteOut, updateRoute } from "@/src/lib/api";

/* ───────── helpers ───────── */

function fechaHastaMinutos(fechaISO: string) {
  const d = new Date(fechaISO);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDist(m: number) {
  const v = Number(m ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "0 m";
  if (v >= 1000) return `${(v / 1000).toFixed(2)} km`;
  return `${Math.round(v)} m`;
}

function formatDur(s: number) {
  const total = Math.max(0, Math.floor(Number(s ?? 0)));
  const h = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h} h ${min} min`;
  return `${min} min`;
}

type Punto = { lat: number; lon: number };
function normalizePath(path: any): Punto[] {
  if (!Array.isArray(path)) return [];
  return path
    .map((p: any) => {
      const lat = p?.lat ?? p?.latitude;
      const lon = p?.lon ?? p?.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") return null;
      return { lat, lon };
    })
    .filter(Boolean) as Punto[];
}

function toCoords(path: Punto[]) {
  return path.map((p) => ({ latitude: p.lat, longitude: p.lon }));
}

function isNotAuthenticatedError(e: unknown) {
  const msg = String((e as any)?.message ?? e ?? "");
  return msg.includes("Not authenticated");
}

/* ───────── preview card ───────── */

function RoutePreview({
  routeId,
  coords,
  loading,
  subtleBg,
}: {
  routeId: string;
  coords: { latitude: number; longitude: number }[] | null;
  loading: boolean;
  subtleBg: string;
}) {
  const mapRef = useRef<MapView>(null);

  React.useEffect(() => {
    if (!coords || coords.length < 2) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 14, right: 14, bottom: 14, left: 14 },
        animated: false,
      });
    }, 120);
    return () => clearTimeout(t);
  }, [coords, routeId]);

  if (loading || !coords || coords.length < 2) {
    return (
      <View style={[styles.previewFallback, { backgroundColor: subtleBg }]}>
        {loading ? <ActivityIndicator /> : <Ionicons name="map-outline" size={20} />}
        <ThemedText style={{ opacity: 0.75, marginTop: 6 }}>
          {loading ? "Cargando preview…" : "Preview no disponible"}
        </ThemedText>
      </View>
    );
  }

  const start = coords[0];
  const end = coords[coords.length - 1];

  return (
    <View style={styles.previewWrap}>
      <MapView
        ref={mapRef}
        style={styles.previewMap}
        pointerEvents="none"
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
        initialRegion={{
          latitude: start.latitude,
          longitude: start.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Polyline coordinates={coords} strokeWidth={4} />
        <Marker coordinate={start} />
        <Marker coordinate={end} />
      </MapView>
    </View>
  );
}

/* ───────── screen ───────── */

export default function RidesScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const icon = useThemeColor({}, "icon");
  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [routes, setRoutes] = useState<RouteOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ si no estás logueado, evitamos peticiones y previews
  const [isAuthed, setIsAuthed] = useState(true);

  const [previewCache, setPreviewCache] = useState<
    Record<string, { latitude: number; longitude: number }[]>
  >({});
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>(
    {}
  );

  // Edit route name state
  const [editingRoute, setEditingRoute] = useState<RouteOut | null>(null);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const cargar = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    if (!showSpinner) setRefreshing(true);

    try {
      const data = await getMyRoutes();
      setRoutes(Array.isArray(data) ? data : []);
      setIsAuthed(true);
    } catch (e) {
      if (isNotAuthenticatedError(e)) {
        // ✅ sin login -> pantalla estable
        setIsAuthed(false);
        setRoutes([]);
        setPreviewCache({});
        setPreviewLoading({});
        return;
      }

      // otro error -> no crashear
      setRoutes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(true);
    }, [cargar])
  );

  const ordenadas = useMemo(() => {
    return [...routes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [routes]);

  const ensurePreview = useCallback(
    async (id: string) => {
      // ✅ si no estás logueado, no pedimos detail
      if (!isAuthed) return;

      if (previewCache[id] || previewLoading[id]) return;
      setPreviewLoading((p) => ({ ...p, [id]: true }));

      try {
        const detail: any = await getRouteById(id);
        const path = normalizePath(detail?.path);
        const coords = toCoords(path);
        if (coords.length >= 2) {
          setPreviewCache((p) => ({ ...p, [id]: coords }));
        }
      } catch (e) {
        // si se expira el token / 401 en detail, desauthed y paramos
        if (isNotAuthenticatedError(e)) {
          setIsAuthed(false);
          setRoutes([]);
          setPreviewCache({});
          setPreviewLoading({});
        }
      } finally {
        setPreviewLoading((p) => ({ ...p, [id]: false }));
      }
    },
    [isAuthed, previewCache, previewLoading]
  );

  const saveRouteName = useCallback(async () => {
    if (!editingRoute || !newName.trim()) return;

    setSavingName(true);
    try {
      await updateRoute(editingRoute.id, { name: newName.trim() });
      // Update the route in the local state
      setRoutes(prev => prev.map(r => 
        r.id === editingRoute.id ? { ...r, name: newName.trim() } : r
      ));
      setEditingRoute(null);
      setNewName("");
    } catch (e) {
      console.log("Error updating route name:", e);
      // Could add error handling here
    } finally {
      setSavingName(false);
    }
  }, [editingRoute, newName]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
        <ThemedText>Cargando rutas…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Mis rutas</ThemedText>
            <ThemedText style={{ opacity: 0.7 }}>
              {isAuthed ? `${ordenadas.length} rutas guardadas` : "Inicia sesión para ver tus rutas"}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => cargar(false)}
            disabled={refreshing}
            style={[
              styles.refreshBtn,
              { backgroundColor: subtleBg, opacity: refreshing ? 0.65 : 1 },
            ]}
            hitSlop={10}
          >
            {refreshing ? (
              <ActivityIndicator />
            ) : (
              <Ionicons name="refresh" size={18} color={icon} />
            )}
            <ThemedText style={{ fontWeight: "900" }}>
              {refreshing ? "Actualizando…" : "Actualizar"}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => cargar(false)} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ NO LOGUEADO */}
          {!isAuthed && (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: cardBg, borderColor: border },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={28} />
              <ThemedText style={{ fontWeight: "900", marginTop: 6 }}>
                No has iniciado sesión
              </ThemedText>
              <ThemedText style={{ opacity: 0.75, textAlign: "center" }}>
                Inicia sesión para ver tus rutas guardadas en la nube.
              </ThemedText>

              <Pressable
                onPress={() => router.push("/login")}
                style={[styles.primaryBtn, { backgroundColor: "#1e88e5" }]}
              >
                <ThemedText style={styles.primaryText}>Ir a iniciar sesión</ThemedText>
              </Pressable>
            </View>
          )}

          {/* ✅ LOGUEADO PERO VACÍO */}
          {isAuthed && ordenadas.length === 0 && (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: cardBg, borderColor: border },
              ]}
            >
              <Ionicons name="map-outline" size={28} />
              <ThemedText style={{ fontWeight: "900", marginTop: 6 }}>
                No tienes rutas todavía
              </ThemedText>
              <ThemedText style={{ opacity: 0.75, textAlign: "center" }}>
                Pulsa en “Grabar” para crear tu primera ruta.
              </ThemedText>

              <Pressable
                onPress={() => router.push("/explore")}
                style={[styles.primaryBtn, { backgroundColor: "#1e88e5" }]}
              >
                <ThemedText style={styles.primaryText}>Ir a grabar</ThemedText>
              </Pressable>
            </View>
          )}

          {/* LISTA */}
          {isAuthed &&
            ordenadas.map((r) => {
              const id = String(r.id);
              if (!previewCache[id] && !previewLoading[id]) ensurePreview(id);

              return (
                <Pressable
                  key={id}
                  onPress={() =>
                    router.push({ pathname: "/ride/[id]", params: { id } })
                  }
                  style={[
                    styles.card,
                    { backgroundColor: cardBg, borderColor: border },
                  ]}
                >
                  <RoutePreview
                    routeId={id}
                    coords={previewCache[id] ?? null}
                    loading={!!previewLoading[id]}
                    subtleBg={subtleBg}
                  />

                  <View style={styles.info}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <ThemedText style={styles.cardTitle}>
                          {r.name || "Ruta"}
                        </ThemedText>
                        <Pressable
                          onPress={() => {
                            setEditingRoute(r);
                            setNewName(r.name || "");
                          }}
                          style={[styles.editBtn, { backgroundColor: subtleBg, borderColor: border }]}
                          hitSlop={10}
                        >
                          <Ionicons name="pencil" size={14} color={icon} />
                        </Pressable>
                      </View>
                      <ThemedText style={styles.cardSub}>
                        {fechaHastaMinutos(r.created_at)} · {formatDist(r.distance_m)} ·{" "}
                        {formatDur(r.duration_s)}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={icon} />
                  </View>
                </Pressable>
              );
            })}
        </ScrollView>

        {/* Edit Route Name Modal */}
        <Modal
          visible={!!editingRoute}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditingRoute(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg, borderColor: border }]}>
              <ThemedText style={styles.modalTitle}>Editar nombre de ruta</ThemedText>
              
              <TextInput
                style={[styles.modalInput, { backgroundColor: subtleBg, color: icon, borderColor: border }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Nombre de la ruta"
                placeholderTextColor={icon + "80"}
                maxLength={50}
                autoFocus={true}
              />
              
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setEditingRoute(null)}
                  style={[styles.modalBtn, { backgroundColor: subtleBg }]}
                >
                  <ThemedText style={styles.modalBtnText}>Cancelar</ThemedText>
                </Pressable>
                
                <Pressable
                  onPress={saveRouteName}
                  disabled={savingName}
                  style={[styles.modalBtn, { backgroundColor: "#1e88e5", opacity: savingName ? 0.6 : 1 }]}
                >
                  <ThemedText style={[styles.modalBtnText, { color: "white" }]}>
                    {savingName ? "Guardando..." : "Guardar"}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  refreshBtn: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },

  content: { padding: 16, gap: 12, paddingBottom: 24 },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },

  previewWrap: { height: 120 },
  previewMap: { flex: 1 },

  previewFallback: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  info: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: { fontWeight: "900", fontSize: 16 },
  cardSub: { opacity: 0.7, marginTop: 3, fontSize: 12 },

  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },

  primaryBtn: {
    marginTop: 10,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  primaryText: { color: "white", fontWeight: "900" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  editBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },

  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },

  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  modalBtnText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
