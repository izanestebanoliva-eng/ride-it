// ...existing code...
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * SOCIAL (base)
 * - No toca tus rutas.
 * - No usa aún /feed, /friends
 * - Solo UI pro + estructura para luego conectar.
 */

type SocialTab = "feed" | "friends";

export default function SocialScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");

  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [tab, setTab] = useState<SocialTab>("feed");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStub, setLoadingStub] = useState(false);

  const title = useMemo(() => {
    if (tab === "feed") return "Social";
    return "Amigos";
  }, [tab]);

  async function onRefresh() {
    // Por ahora es un refresh “stub” para tener la UX ya montada.
    setRefreshing(true);
    try {
      setLoadingStub(true);
      await new Promise((r) => setTimeout(r, 550));
    } finally {
      setLoadingStub(false);
      setRefreshing(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* HEADER PRO */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {tab === "feed" ? "Rutas públicas y de amigos" : "Tu lista de amigos"}
            </ThemedText>
          </View>

          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={[
              styles.refreshBtn,
              { backgroundColor: subtleBg, borderColor: border, opacity: refreshing ? 0.7 : 1 },
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

        {/* TOP TABS */}
        <View style={styles.tabsRow}>
          <Chip
            label="Feed"
            icon="globe-outline"
            active={tab === "feed"}
            onPress={() => setTab("feed")}
            subtleBg={subtleBg}
            border={border}
            text={text}
          />
          <Chip
            label="Amigos"
            icon="people-outline"
            active={tab === "friends"}
            onPress={() => setTab("friends")}
            subtleBg={subtleBg}
            border={border}
            text={text}
          />
        </View>

        {/* BODY */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Card principal */}
          <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <Ionicons
                  name={tab === "feed" ? "planet-outline" : "people-outline"}
                  size={20}
                  color={icon}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.heroTitle}>
                  {tab === "feed" ? "Tu feed está listo" : "Gestión de amigos"}
                </ThemedText>
                <ThemedText style={styles.heroSub}>
                  {tab === "feed"
                    ? "Aquí mostraremos rutas públicas y de amigos, tipo Instagram/Strava."
                    : "Lista de amigos, buscar usuarios y gestionar conexiones."}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.banner, { backgroundColor: subtleBg, borderColor: border }]}>
              <Ionicons name="information-circle-outline" size={18} color={icon} />
              <ThemedText style={{ opacity: 0.8, flex: 1 }}>
                Esta pantalla todavía no está conectada al backend. La UI ya está preparada.
              </ThemedText>
            </View>

            {/* Botones stub */}
            <View style={styles.actionsRow}>
              <Pressable
                onPress={onRefresh}
                style={[styles.primaryBtn, { backgroundColor: "#1e88e5" }]}
              >
                <Ionicons name="flash-outline" size={18} color="white" />
                <ThemedText style={styles.primaryText}>Probar refresh</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setTab("feed")}
                style={[styles.secondaryBtn, { backgroundColor: subtleBg, borderColor: border }]}
              >
                <Ionicons name="globe-outline" size={18} color={icon} />
              </Pressable>
            </View>
          </View>

          {/* Placeholder lista */}
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.sectionTop}>
              <ThemedText style={styles.sectionTitle}>
                {tab === "feed" ? "Rutas" : "Personas"}
              </ThemedText>
              <ThemedText style={styles.sectionMeta}>
                {loadingStub ? "Cargando…" : "0 items"}
              </ThemedText>
            </View>

            {loadingStub ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <ThemedText style={{ opacity: 0.75 }}>Cargando datos…</ThemedText>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="sparkles-outline" size={22} color={icon} />
                <ThemedText style={styles.emptyTitle}>Vacío por ahora</ThemedText>
                <ThemedText style={styles.emptySub}>
                  En el siguiente paso lo conectamos a <ThemedText style={{ fontWeight: "900" }}>/feed</ThemedText> y amigos.
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.footer}>Ride it · Social</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/* ───────── small components ───────── */

function Chip({
  label,
  icon,
  active,
  onPress,
  subtleBg,
  border,
  text,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  subtleBg: string;
  border: string;
  text: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? "rgba(30,136,229,0.16)" : subtleBg,
          borderColor: active ? "#1e88e5" : border,
        },
      ]}
      hitSlop={8}
    >
      <Ionicons name={icon} size={16} color={active ? "#1e88e5" : text} />
      <ThemedText style={[styles.chipText, active && { color: "#1e88e5" }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 24 },
  subtitle: { opacity: 0.75, marginTop: 2 },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  refreshText: { fontWeight: "900", opacity: 0.85 },

  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chipText: { fontWeight: "900" },

  content: { padding: 16, gap: 12, paddingBottom: 28 },

  heroCard: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  heroTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,136,229,0.12)",
  },
  heroTitle: { fontWeight: "900", fontSize: 16 },
  heroSub: { opacity: 0.75, marginTop: 2, lineHeight: 18 },

  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },

  actionsRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: "white", fontWeight: "900" },
  secondaryBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  sectionCard: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  sectionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontWeight: "900", fontSize: 16 },
  sectionMeta: { opacity: 0.65, fontWeight: "800" },

  loadingBox: {
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  emptyBox: {
    height: 140,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyTitle: { fontWeight: "900", marginTop: 2 },
  emptySub: { opacity: 0.75, textAlign: "center", lineHeight: 18 },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 10 },
});
// ...existing code...
