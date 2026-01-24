import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
 * Solicitudes de amistad (UI stub)
 * - No conecta backend todavía
 * - Diseño pro + estructura lista
 */

type InnerTab = "incoming" | "outgoing";

export default function FriendRequestsScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const icon = useThemeColor({}, "icon");
  const text = useThemeColor({}, "text");

  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [tab, setTab] = useState<InnerTab>("incoming");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStub, setLoadingStub] = useState(false);

  async function onRefresh() {
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
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: subtleBg, borderColor: border }]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={18} color={icon} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={styles.title}>
              Solicitudes
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {tab === "incoming" ? "Entrantes" : "Enviadas"}
            </ThemedText>
          </View>

          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={[
              styles.iconBtn,
              { backgroundColor: subtleBg, borderColor: border, opacity: refreshing ? 0.7 : 1 },
            ]}
            hitSlop={10}
          >
            {refreshing ? <ActivityIndicator /> : <Ionicons name="refresh" size={18} color={icon} />}
          </Pressable>
        </View>

        {/* TABS */}
        <View style={styles.tabsRow}>
          <Chip
            label="Entrantes"
            icon="mail-unread-outline"
            active={tab === "incoming"}
            onPress={() => setTab("incoming")}
            subtleBg={subtleBg}
            border={border}
            text={text}
          />
          <Chip
            label="Enviadas"
            icon="send-outline"
            active={tab === "outgoing"}
            onPress={() => setTab("outgoing")}
            subtleBg={subtleBg}
            border={border}
            text={text}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.cardTop}>
              <View style={styles.badge}>
                <Ionicons name="people-outline" size={16} color="#1e88e5" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.cardTitle}>
                  {tab === "incoming" ? "Solicitudes entrantes" : "Solicitudes enviadas"}
                </ThemedText>
                <ThemedText style={styles.cardSub}>
                  {tab === "incoming"
                    ? "Aquí podrás aceptar o rechazar."
                    : "Aquí verás a quién se la has enviado."}
                </ThemedText>
              </View>
              <ThemedText style={styles.meta}>{loadingStub ? "…" : "0"}</ThemedText>
            </View>

            {loadingStub ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <ThemedText style={{ opacity: 0.75 }}>Cargando…</ThemedText>
              </View>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: subtleBg, borderColor: border }]}>
                <Ionicons name="sparkles-outline" size={22} color={icon} />
                <ThemedText style={{ fontWeight: "900" }}>Nada por aquí</ThemedText>
                <ThemedText style={{ opacity: 0.75, textAlign: "center", lineHeight: 18 }}>
                  Cuando lo conectemos al backend aparecerán las solicitudes.
                </ThemedText>
              </View>
            )}

            <View style={[styles.tip, { backgroundColor: subtleBg, borderColor: border }]}>
              <Ionicons name="information-circle-outline" size={18} color={icon} />
              <ThemedText style={{ opacity: 0.8, flex: 1 }}>
                Pantalla preparada. Luego conectamos: incoming/outgoing + aceptar/rechazar.
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.footer}>Ride it · Solicitudes</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

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

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

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

  card: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,136,229,0.12)",
  },
  cardTitle: { fontWeight: "900", fontSize: 16 },
  cardSub: { opacity: 0.75, marginTop: 2, lineHeight: 18 },
  meta: { opacity: 0.7, fontWeight: "900" },

  loadingBox: {
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    height: 140,
  },

  tip: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 10 },
});
