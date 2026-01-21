import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
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
  name?: string;
  previewUri?: string | null; // ✅ imagen guardada (snapshot)
};

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

export default function RidesScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [rutas, setRutas] = useState<RutaGuardada[]>([]);

  // ✅ estado refresco (botón + pull-to-refresh)
  const [refreshing, setRefreshing] = useState(false);

  // modal renombrar
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");

  // ✅ CARGA SIN ANIMACIÓN (solo para entrar a la pestaña)
  const cargarSilencioso = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("rutas");
      const lista: RutaGuardada[] = raw ? JSON.parse(raw) : [];
      setRutas(lista);
    } catch {
      setRutas([]);
    }
  }, []);

  // ✅ CARGA CON ANIMACIÓN (solo si el usuario refresca)
  const cargar = useCallback(async () => {
    const start = Date.now();
    setRefreshing(true);

    try {
      const raw = await AsyncStorage.getItem("rutas");
      const lista: RutaGuardada[] = raw ? JSON.parse(raw) : [];
      setRutas(lista);
    } catch {
      setRutas([]);
    } finally {
      const elapsed = Date.now() - start;
      const MIN_MS = 600; // 🔥 para que se vea la animación

      if (elapsed < MIN_MS) {
        setTimeout(() => setRefreshing(false), MIN_MS - elapsed);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  // ✅ Al entrar a la pestaña, NO animamos
  useFocusEffect(
    useCallback(() => {
      cargarSilencioso();
    }, [cargarSilencioso])
  );

  const rutasOrdenadas = useMemo(() => {
    return [...rutas].sort((a, b) => {
      const ta = new Date(a.fecha).getTime();
      const tb = new Date(b.fecha).getTime();
      return tb - ta;
    });
  }, [rutas]);

  async function guardarLista(nueva: RutaGuardada[]) {
    setRutas(nueva);
    await AsyncStorage.setItem("rutas", JSON.stringify(nueva));
  }

  function pedirBorrar(id: number) {
    Alert.alert("Borrar ruta", "¿Seguro que quieres borrar esta ruta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          const nueva = rutas.filter((r) => r.id !== id);
          await guardarLista(nueva);
        },
      },
    ]);
  }

  function abrirRenombrar(r: RutaGuardada) {
    setRenameId(r.id);
    setRenameText((r.name ?? "").trim() || `Ruta #${r.id}`);
    setRenameOpen(true);
  }

  async function confirmarRenombrar() {
    if (renameId === null) return;

    const nuevoNombre = renameText.trim();
    if (!nuevoNombre) {
      Alert.alert("Nombre vacío", "Pon un nombre para la ruta.");
      return;
    }

    const nueva = rutas.map((r) =>
      r.id === renameId ? { ...r, name: nuevoNombre } : r
    );
    await guardarLista(nueva);

    setRenameOpen(false);
    setRenameId(null);
    setRenameText("");
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Mis rutas
          </ThemedText>

          <Pressable
            onPress={cargar}
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
            <ThemedText style={styles.refreshText}>
              {refreshing ? "Actualizando…" : "Actualizar"}
            </ThemedText>
          </Pressable>
        </View>

        {rutasOrdenadas.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: cardBg, borderColor: border },
            ]}
          >
            <ThemedText style={styles.emptyTitle}>
              No tienes rutas todavía
            </ThemedText>
            <ThemedText style={styles.emptySub}>
              Ve a “Explorar” y pulsa Iniciar para grabar tu primera ruta.
            </ThemedText>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: "#1e88e5" }]}
              onPress={() => router.push("/explore")}
            >
              <ThemedText style={styles.primaryText}>Ir a grabar</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={cargar} />
          }
        >
          {rutasOrdenadas.map((r) => {
            const titulo = (r.name ?? "").trim() || `Ruta #${r.id}`;
            const fecha = fechaHastaMinutos(r.fecha);

            const imgUrl = r.previewUri ?? "";

            return (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/ride/${r.id}`)}
                style={[
                  styles.card,
                  { backgroundColor: cardBg, borderColor: border },
                ]}
              >
                {imgUrl ? (
                  <Image
                    source={{ uri: imgUrl }}
                    style={styles.preview}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.previewFallback,
                      { backgroundColor: subtleBg },
                    ]}
                  >
                    <Ionicons name="map-outline" size={22} color={icon} />
                    <ThemedText style={{ opacity: 0.75 }}>
                      Preview no disponible
                    </ThemedText>
                  </View>
                )}

                <View style={styles.info}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.cardTitle}>{titulo}</ThemedText>
                    <ThemedText style={styles.cardSub}>{fecha}</ThemedText>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => abrirRenombrar(r)}
                      style={[styles.iconBtn, { backgroundColor: subtleBg }]}
                      hitSlop={10}
                    >
                      <Ionicons name="pencil" size={18} color={icon} />
                    </Pressable>

                    <Pressable
                      onPress={() => pedirBorrar(r.id)}
                      style={[styles.iconBtn, { backgroundColor: subtleBg }]}
                      hitSlop={10}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={
                          String(text) === "#FFFFFF" ? "#ff6b6b" : "#d32f2f"
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })}

          <ThemedText style={styles.footer}>Ride it · Mis rutas</ThemedText>
        </ScrollView>

        <Modal
          visible={renameOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: cardBg, borderColor: border },
              ]}
            >
              <ThemedText type="title" style={{ fontSize: 18 }}>
                Renombrar ruta
              </ThemedText>

              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: subtleBg, borderColor: border },
                ]}
              >
                <TextInput
                  value={renameText}
                  onChangeText={setRenameText}
                  placeholder="Nombre de la ruta"
                  placeholderTextColor="rgba(120,120,120,0.9)"
                  style={[styles.input, { color: String(text) }]}
                  autoFocus
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setRenameOpen(false)}
                  style={[styles.modalBtn, { backgroundColor: subtleBg }]}
                >
                  <ThemedText style={{ fontWeight: "900" }}>
                    Cancelar
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={confirmarRenombrar}
                  style={[styles.modalBtn, { backgroundColor: "#1e88e5" }]}
                >
                  <ThemedText style={{ fontWeight: "900", color: "white" }}>
                    Guardar
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

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { fontSize: 24 },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshText: { fontWeight: "900", opacity: 0.85 },

  content: { padding: 16, gap: 12, paddingBottom: 24 },

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  emptyTitle: { fontWeight: "900", fontSize: 16 },
  emptySub: { opacity: 0.75, lineHeight: 18 },

  primaryBtn: {
    marginTop: 6,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontWeight: "900" },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },

  preview: { height: 120, width: "100%" },
  previewFallback: {
    height: 120,
    width: "100%",
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
  cardSub: { opacity: 0.7, marginTop: 2, fontSize: 12 },

  actions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 10 },

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
    gap: 12,
    borderWidth: 1,
  },
  inputWrap: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  input: { fontSize: 16, fontWeight: "700" },

  modalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
