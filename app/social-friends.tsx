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

type FriendsInnerTab = "friends" | "requests";

export default function SocialFriendsScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const icon = useThemeColor({}, "icon");
  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [tab, setTab] = useState<FriendsInnerTab>("friends");
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
            style={[styles.backBtn, { backgroundColor: subtleBg, borderColor: border }]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={18} color={icon} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={styles.title}>
              Amigos
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {tab === "friends" ? "Tu lista" : "Solicitudes"}
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
            {refreshing ? <ActivityIndicator /> : <Ionicons name="refresh" size={18} color={icon} />}
          </Pressable>
        </View>

        {/* INNER TABS */}
        <View style={styles.tabsRow}>
          <Chip
            label="Amigos"
            icon="people-outline"
            active={tab === "friends"}
            onPress={() => setTab("friends")}
            subtleBg={subtleBg}
            border={border}
          />
          <Chip
            label="Solicitudes"
            icon="mail-unread-outline"
            active={tab === "requests"}
            onPress={() => setTab("requests")}
            subtleBg={subtleBg}
            border={border}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={styles.cardTitle}>
              {tab === "friends" ? "Tu lista de amigos" : "Solicitudes"}
            </ThemedText>
            <ThemedText style={styles.cardSub}>
              {tab === "friends"
                ? "Aquí conectaremos: GET /friends y buscar usuarios."
                : "Aquí conectaremos: incoming/outgoing requests + aceptar/rechazar."}
            </ThemedText>

            {loadingStub ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <ThemedText style={{ opacity: 0.75 }}>Cargando…</ThemedText>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="sparkles-outline" size={22} color={icon} />
                <ThemedText style={{ fontWeight: "900" }}>Vacío por ahora</ThemedText>
                <ThemedText style={{ opacity: 0.75, textAlign: "center" }}>
                  En el siguiente paso lo conectamos al backend.
                </ThemedText>
              </View>
            )}

            <View style={[styles.banner, { backgroundColor: subtleBg, borderColor: border }]}>
              <Ionicons name="link-outline" size={18} color={icon} />
              <ThemedText style={{ opacity: 0.8, flex: 1 }}>
                {tab === "friends"
                  ? "Endpoints: /friends, /users/search"
                  : "Endpoints: /friend-requests (incoming/outgoing) + accept/reject"}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.footer}>Ride it · Amigos</ThemedText>
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
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  subtleBg: string;
  border: string;
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
      <Ionicons name={icon} size={16} color={active ? "#1e88e5" : undefined} />
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

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
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
  cardTitle: { fontWeight: "900", fontSize: 16 },
  cardSub: { opacity: 0.75, lineHeight: 18 },

  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },

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

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 10 },
});
